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
  PlayerReviewResponse,
} from '@quizzquizz/common';
import { retryWithBackoff, isNetworkError } from './network-utils';

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
  private pendingRequests: Map<string, AbortController> = new Map();
  private etagCache: Map<string, string> = new Map();
  private responseCache: Map<string, unknown> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * Cancel a pending request by key
   */
  private cancelPendingRequest(key: string): void {
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Generic fetch wrapper with error handling and retry logic
   */
  private async fetch<T>(
    path: string,
    options: RequestInit = {},
    retry: boolean = true,
    useCache: boolean = false
  ): Promise<T> {
    // Cancel any pending request with the same path (request deduplication)
    const requestKey = `${options.method || 'GET'}:${path}`;
    this.cancelPendingRequest(requestKey);

    const doFetch = async (): Promise<T> => {
      const url = `${this.config.baseUrl}${path}`;

      // Create AbortController for this request
      const controller = new AbortController();
      this.pendingRequests.set(requestKey, controller);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        };

        // Add ETag if we have one for this path and caching is enabled
        if (useCache && this.etagCache.has(path)) {
          const etag = this.etagCache.get(path);
          if (etag) {
            headers['If-None-Match'] = etag;
          }
        }

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        // Handle 304 Not Modified - return cached response
        if (response.status === 304 && this.responseCache.has(path)) {
          this.pendingRequests.delete(requestKey);
          return this.responseCache.get(path) as T;
        }

        // Parse response body
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          this.pendingRequests.delete(requestKey);
          throw new ApiError(
            data.error || `Request failed with status ${response.status}`,
            response.status,
            data
          );
        }

        // Store ETag if present
        const etag = response.headers.get('ETag');
        if (useCache && etag) {
          this.etagCache.set(path, etag);
          this.responseCache.set(path, data);
        }

        this.pendingRequests.delete(requestKey);
        return data as T;
      } catch (error) {
        this.pendingRequests.delete(requestKey);
        
        // Don't throw on abort - it's intentional
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError('Request cancelled', 0);
        }
        
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Network error or other fetch failure
        throw new ApiError(
          error instanceof Error ? error.message : 'Network request failed',
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
   * Uses ETag caching to minimize bandwidth
   */
  async getGameState(sessionId: string, playerId: string): Promise<GameState> {
    return this.fetch<GameState>(
      `/api/sessions/${sessionId}/state`,
      {
        headers: {
          'X-Player-Id': playerId,
        },
      },
      true, // retry on network errors
      true  // use ETag caching
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
      },
      false // don't retry POSTs
    );
  }

  /**
   * Get leaderboard for session
   * Uses ETag caching to minimize bandwidth
   */
  async getLeaderboard(sessionId: string): Promise<LeaderboardResponse> {
    return this.fetch<LeaderboardResponse>(
      `/api/sessions/${sessionId}/leaderboard`,
      {},
      true, // retry on network errors
      true  // use ETag caching
    );
  }

  /**
   * Get player's complete game review (post-game)
   */
  async getPlayerReview(sessionId: string, playerId: string): Promise<PlayerReviewResponse> {
    return this.fetch<PlayerReviewResponse>(
      `/api/sessions/${sessionId}/players/${playerId}/review`,
      {
        method: 'GET',
        headers: {
          'X-Player-Id': playerId,
        },
      },
      true, // retry on network errors
      false // no caching for review (one-time fetch)
    );
  }

  /**
   * Clear ETag cache (call when leaving session)
   */
  clearCache(): void {
    this.etagCache.clear();
    this.responseCache.clear();
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [key, controller] of this.pendingRequests.entries()) {
      controller.abort();
      this.pendingRequests.delete(key);
    }
  }

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
    return this.fetch('/api/auth/sign-up/email', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password, username, name }),
    }, false); // Don't retry auth requests
  }

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
    return this.fetch('/api/auth/sign-in/email', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password }),
    }, false); // Don't retry auth requests
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    return this.fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      body: JSON.stringify({}), // Better Auth requires a body
    }, false); // Don't retry auth requests
  }

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
      return await this.fetch('/api/auth/get-session', {
        credentials: 'include', // Important for cookies
      }, false); // Don't retry auth requests
    } catch (error) {
      // Return null if not authenticated (404 or 401)
      if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get auth capabilities (e.g. whether IMAP login is enabled server-side)
   */
  async getAuthCapabilities(): Promise<{ imapEnabled: boolean }> {
    try {
      return await this.fetch('/api/auth/capabilities', {}, false);
    } catch {
      return { imapEnabled: false };
    }
  }

  /**
   * Sign in using IMAP credentials
   */
  async imapSignIn(email: string, password: string): Promise<{
    user: {
      id: string;
      email: string;
      username: string;
      name: string | null;
      isAdmin: boolean;
      mustChangePassword: boolean;
    };
  }> {
    return this.fetch('/api/auth/imap-sign-in', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    }, false);
  }
}

/**
 * Get API base URL based on environment
 */
function getApiBaseUrl(): string {
  // Use relative URLs so requests go through the dev proxy (port 3000 → 3010)
  // or through Caddy in production. Never hardcode localhost:3000, which breaks
  // when the app is accessed via a remote hostname (Tailscale, tunnels, etc.).
  if (import.meta.env?.DEV) {
    return '';
  }
  return window.location.origin;
}

// Export singleton instance
export const api = new ApiClient({
  baseUrl: getApiBaseUrl(),
});
