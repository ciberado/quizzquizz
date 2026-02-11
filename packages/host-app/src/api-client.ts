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
}

interface PlayerWithAnswerStatus extends Player {
  hasAnswered: boolean;
}

// Simplified question bank for listing (from API /question-banks endpoint)
interface QuestionBankSummary {
  id: string;
  name: string;
  description?: string;
  topics?: string[];
  questionCount: number;
}

// API base URL (configurable via environment)
const API_BASE_URL = 'http://localhost:3000';

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
   * Get list of available question banks
   */
  async getQuestionBanks(): Promise<QuestionBankSummary[]> {
    const response = await apiRequest<{ questionBanks: QuestionBankSummary[] }>('/api/question-banks');
    return response.questionBanks;
  },

  /**
   * Create a new session
   */
  async createSession(questionBankId: string): Promise<{
    id: string;
    pin: string;
    hostToken: string;
  }> {
    return apiRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ questionBankId }),
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
};
