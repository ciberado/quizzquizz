/**
 * API client for host app
 * Communicates with the QuizzQuizz API server
 */

import type {
  Session,
  Player,
} from '@quizzquizz/common';

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
 * Make an API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle non-2xx responses
    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      throw new ApiError(
        `API Error: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Parse JSON response
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing error
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
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
  async getSession(sessionId: string, hostToken: string): Promise<Session> {
    return apiRequest<Session>(`/api/sessions/${sessionId}`, {
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Get players in session
   */
  async getPlayers(sessionId: string): Promise<Player[]> {
    const response = await apiRequest<{ players: Player[] }>(`/api/sessions/${sessionId}/players`);
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
  async getGameState(sessionId: string, hostToken: string): Promise<any> {
    return apiRequest<any>(`/api/sessions/${sessionId}/state`, {
      headers: {
        'X-Host-Token': hostToken,
      },
    });
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(sessionId: string): Promise<{ leaderboard: any[] }> {
    return apiRequest<{ leaderboard: any[] }>(`/api/sessions/${sessionId}/leaderboard`);
  },
};
