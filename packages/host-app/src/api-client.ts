/**
 * API client for host app
 * Communicates with the QuizzQuizz API server
 */

import type {
  Session,
  Player,
} from '@quizzquizz/common';
import { retryWithBackoff, isNetworkError } from './network-utils';

// Extended types for API responses (include runtime-only properties)
interface SessionWithTimeLimit extends Session {
  currentQuestionTimeLimit: number | null;
  serverTime: number; // Server's current time for clock synchronization
}

interface PlayerWithAnswerStatus extends Player {
  hasAnswered: boolean;
}

// Question bank types matching the API tree response
export interface QuestionBankSummary {
  id: string;
  name: string;
  description?: string;
  topics: string[];
  questionCount: number;
}

export interface QuestionBankFolder {
  name: string;       // raw directory basename, '' for root
  path: string;       // relative path from root, '' for root
  folders: QuestionBankFolder[];
  banks: QuestionBankSummary[];
}

// API base URL (configurable via environment)
function getApiBaseUrl(): string {
  // In development with Vite proxy, use relative URL so /api is proxied to localhost:3000
  if (import.meta.env?.DEV) {
    return '';
  }
  
  // In production, API is served from same origin
  return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Request deduplication - track pending requests
 */
const pendingRequests = new Map<string, AbortController>();

/**
 * Cancel a pending request
 */
function cancelPendingRequest(key: string): void {
  const controller = pendingRequests.get(key);
  if (controller) {
    controller.abort();
    pendingRequests.delete(key);
  }
}

/**
 * Make an API request with error handling and retry logic
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry: boolean = true
): Promise<T> {
  // Cancel any pending request with the same endpoint and method
  const requestKey = `${options.method || 'GET'}:${endpoint}`;
  cancelPendingRequest(requestKey);

  const doFetch = async (): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;

    // Create AbortController for this request
    const controller = new AbortController();
    pendingRequests.set(requestKey, controller);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Always include cookies for authentication
        signal: controller.signal,
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        pendingRequests.delete(requestKey);
        throw new ApiError(
          `API Error: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Parse JSON response
      const data = await response.json();
      pendingRequests.delete(requestKey);
      return data;
    } catch (error) {
      pendingRequests.delete(requestKey);
      
      // Don't throw on abort - it's intentional
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request cancelled', 0);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or parsing error
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  };

  // Retry network errors automatically
  if (retry) {
    return retryWithBackoff(doFetch, {
      maxRetries: 2,
      initialDelay: 1000,
      shouldRetry: (error) => {
        // Only retry network errors, not 4xx/5xx responses
        return isNetworkError(error);
      },
    });
  }

  return doFetch();
}

/**
 * Cancel all pending requests (call on unmount/cleanup)
 */
export function cancelAllRequests(): void {
  for (const controller of pendingRequests.values()) {
    controller.abort();
  }
  pendingRequests.clear();
}

/**
 * API client for host operations
 */
export const api = {
  /**
   * Get the full folder tree of available question banks.
   */
  async getQuestionBankTree(): Promise<QuestionBankFolder> {
    const response = await apiRequest<{ tree: QuestionBankFolder }>('/api/question-banks');
    return response.tree;
  },

  /**
   * Get full details of a single question bank by ID.
   */
  async getQuestionBankDetails(id: string): Promise<{
    id: string; metadata: { name: string; description?: string; topics: string[]; defaultTimeLimit: number }; questions: unknown[];
  }> {
    const encoded = encodeURIComponent(id);
    return apiRequest(`/api/question-banks/bank?id=${encoded}`);
  },

  /**
   * Get questions from a bank with filtering and pagination.
   */
  async getQuestionBankQuestions(
    bankId: string,
    params: { page?: number; limit?: number; difficulty?: string; topic?: string; tag?: string } = {}
  ): Promise<unknown> {
    const qs = new URLSearchParams();
    qs.set('bankId', bankId);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.difficulty) qs.set('difficulty', params.difficulty);
    if (params.topic) qs.set('topic', params.topic);
    if (params.tag) qs.set('tag', params.tag);
    return apiRequest(`/api/question-banks/questions?${qs.toString()}`);
  },

  /**
   * Reload question banks from disk
   */
  async reloadQuestionBanks(): Promise<{ success: boolean; message: string; banks: Array<{ id: string; name: string; questionCount: number }> }> {
    return apiRequest('/api/question-banks/reload', {
      method: 'POST',
    });
  },

  /**
   * Create a new session
   */
  async createSession(
    questionBankId: string,
    options?: {
      mode?: 'quiz' | 'flashcard';
      questionIds?: string[];
      randomOrder?: boolean;
      shuffleAnswers?: boolean;
      automaticPace?: boolean;
      autoQuestionTime?: boolean;
      pace?: 'normal' | 'calm' | 'manual';
    }
  ): Promise<{
    id: string;
    pin: string;
    hostToken: string;
    mode?: string;
  }> {
    return apiRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        questionBankId,
        ...(options?.mode && { mode: options.mode }),
        ...(options?.questionIds && { questionIds: options.questionIds }),
        ...(options?.randomOrder !== undefined && { randomOrder: options.randomOrder }),
        ...(options?.shuffleAnswers !== undefined && { shuffleAnswers: options.shuffleAnswers }),
        ...(options?.automaticPace !== undefined && { automaticPace: options.automaticPace }),
        ...(options?.autoQuestionTime !== undefined && { autoQuestionTime: options.autoQuestionTime }),
        ...(options?.pace !== undefined && { pace: options.pace }),
      }),
    });
  },

  /**
   * Get session details (requires host token)
   */
  async getSession(sessionId: string, hostToken: string): Promise<SessionWithTimeLimit> {
    return apiRequest<SessionWithTimeLimit>(`/api/sessions/${sessionId}`, {
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Get players in session
   */
  async getPlayers(sessionId: string): Promise<PlayerWithAnswerStatus[]> {
    const response = await apiRequest<{ players: PlayerWithAnswerStatus[] }>(`/api/sessions/${sessionId}/players`);
    return response.players;
  },

  /**
   * Start the quiz
   */
  async startQuiz(sessionId: string, hostToken: string): Promise<void> {
    await apiRequest(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Advance to next question
   */
  async nextQuestion(sessionId: string, hostToken: string): Promise<void> {
    await apiRequest(`/api/sessions/${sessionId}/next`, {
      method: 'POST',
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * End the quiz
   */
  async endQuiz(sessionId: string, hostToken: string): Promise<void> {
    await apiRequest(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, hostToken: string): Promise<void> {
    await apiRequest(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Get current game state (for host monitoring)
   */
  async getGameState(sessionId: string, hostToken: string): Promise<unknown> {
    return apiRequest<unknown>(`/api/sessions/${sessionId}/state`, {
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(sessionId: string): Promise<{ leaderboard: Array<{ rank: number; nickname: string; score: number; playerId: string }> }> {
    return apiRequest<{ leaderboard: Array<{ rank: number; nickname: string; score: number; playerId: string }> }>(`/api/sessions/${sessionId}/leaderboard`);
  },

  /**
   * Get question statistics (host only)
   */
  async getQuestionStats(sessionId: string, hostToken: string): Promise<{
    questions: Array<{
      questionIndex: number;
      questionId: string;
      questionText: string;
      totalAnswers: number;
      correctAnswers: number;
      incorrectAnswers: number;
      accuracyPercentage: number;
      difficulty: string;
      topics: string[];
      answerOptions: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        selectionCount: number;
        selectionPercentage: number;
      }>;
    }>;
  }> {
    return apiRequest(`/api/sessions/${sessionId}/question-stats`, {
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Upload a new quiz bank (Markdown content or file).
   * Requires the user to be authenticated.
   */
  async uploadQuizBank(payload: {
    folder: string;
    filename: string;
    content: string;
  }): Promise<{
    success: boolean;
    bank: { id: string; name: string; questionCount: number; path: string };
  }> {
    return apiRequest('/api/user-banks/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Get the bank folder subtree owned by the currently authenticated user.
   */
  async getMyBanks(): Promise<{
    userId: string;
    folder: QuestionBankFolder;
  }> {
    return apiRequest('/api/user-banks/mine');
  },

  // ===== Authentication Methods =====

  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, username: string, name: string): Promise<{
    user: {
      id: string;
      email: string;
      username: string;
      name: string;
    };
    token: string;
  }> {
    return apiRequest('/api/auth/sign-up/email', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password, username, name }),
    }, false); // Don't retry auth requests
  },

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string): Promise<{
    user: {
      id: string;
      email: string;
      username: string;
      name: string;
    };
    token: string;
  }> {
    return apiRequest('/api/auth/sign-in/email', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password }),
    }, false); // Don't retry auth requests
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    return apiRequest('/api/auth/sign-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Better Auth requires a body
      credentials: 'include', // Important for cookies
    }, false); // Don't retry auth requests
  },

  /**
   * Get current session (check if user is logged in)
   */
  async getAuthSession(): Promise<{
    user: {
      id: string;
      email: string;
      username: string;
      name: string;
    } | null;
    session: unknown | null;
  } | null> {
    try {
      return await apiRequest('/api/auth/get-session', {
        credentials: 'include', // Important for cookies
      }, false); // Don't retry auth requests
    } catch (error) {
      // Return null if not authenticated (404 or 401)
      if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
        return null;
      }
      throw error;
    }
  },
};
