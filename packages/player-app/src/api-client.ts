/**
 * Typed API client for player app
 */

import type {
  JoinSessionRequest,
  JoinSessionResponse,
  GameState,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  LeaderboardResponse,
} from '@quizzquizz/common';

/**
 * API client error
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
 * API client configuration
 */
interface ApiClientConfig {
  baseUrl: string;
}

class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Parse response body
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          data.error || `Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network error or other fetch failure
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0
      );
    }
  }

  /**
   * Join a quiz session with PIN
   */
  async joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
    return this.fetch<JoinSessionResponse>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get current game state (polling endpoint)
   */
  async getGameState(sessionId: string, playerId: string): Promise<GameState> {
    return this.fetch<GameState>(
      `/api/sessions/${sessionId}/state?playerId=${playerId}`
    );
  }

  /**
   * Submit answer to current question
   */
  async submitAnswer(
    sessionId: string,
    playerId: string,
    request: SubmitAnswerRequest
  ): Promise<SubmitAnswerResponse> {
    return this.fetch<SubmitAnswerResponse>(
      `/api/sessions/${sessionId}/answer`,
      {
        method: 'POST',
        headers: {
          'X-Player-Id': playerId,
        },
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Get leaderboard for session
   */
  async getLeaderboard(sessionId: string): Promise<LeaderboardResponse> {
    return this.fetch<LeaderboardResponse>(
      `/api/sessions/${sessionId}/leaderboard`
    );
  }
}

/**
 * Get API base URL based on environment
 */
function getApiBaseUrl(): string {
  // In development, API runs on port 3000
  if (import.meta.env?.DEV) {
    return 'http://localhost:3000';
  }
  
  // In production, API is served from same origin
  return window.location.origin;
}

// Export singleton instance
export const api = new ApiClient({
  baseUrl: getApiBaseUrl(),
});
