/**
 * API client for flashcard app.
 * Minimal client: join via PIN and fetch flashcard session state.
 */

function getApiBaseUrl(): string {
  if (import.meta.env?.DEV) return '';
  return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl();

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

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: unknown;
    try { errorData = await response.json(); } catch { errorData = await response.text(); }
    throw new ApiError(`API Error: ${response.statusText}`, response.status, errorData);
  }

  return response.json();
}

export interface FlashcardSessionState {
  sessionId: string;
  pin: string;
  status: string;
  mode: string;
  questionBankId: string;
  questionBankName: string;
  questions: Array<{
    id: string;
    text: string;
    answers: Array<{ id: string; text: string }>;
    correctAnswerIds: string[];
    difficulty: string;
    topics: string[];
    tags: string[];
    timeLimit?: number;
  }>;
  totalQuestions: number;
  createdAt: number;
}

export interface JoinResponse {
  playerId: string;
  sessionId: string;
  nickname: string;
  mode: string;
}

export interface CardProgressState {
  cardId: string;
  box: 1 | 2 | 3;
  yesCount: number;
  noCount: number;
  graduated: boolean;
  firstTrySuccess: boolean | null;
}

export interface FlashcardProgressResponse {
  playerId: string;
  sessionId: string;
  cards: CardProgressState[];
}

export interface RecordAnswerPayload {
  playerId: string;
  cardId: string;
  known: boolean;
  box: 1 | 2 | 3;
  yesCount: number;
  noCount: number;
  graduated: boolean;
  firstTrySuccess: boolean | null;
}

export const api = {
  /** Join a flashcard session via PIN */
  async joinSession(pin: string, nickname: string): Promise<JoinResponse> {
    return apiRequest<JoinResponse>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ pin, nickname }),
    });
  },

  /** Get all questions for a flashcard session */
  async getFlashcardState(sessionId: string): Promise<FlashcardSessionState> {
    return apiRequest<FlashcardSessionState>(`/api/sessions/${sessionId}/flashcard-state`);
  },

  /** Record a single card answer on the server and receive updated aggregate progress */
  async recordAnswer(sessionId: string, payload: RecordAnswerPayload): Promise<void> {
    await apiRequest<{ ok: boolean }>(`/api/sessions/${sessionId}/flashcard-answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Fetch all previously saved card states for a player (used to resume a session) */
  async getProgress(sessionId: string, playerId: string): Promise<FlashcardProgressResponse> {
    return apiRequest<FlashcardProgressResponse>(
      `/api/sessions/${sessionId}/flashcard-progress?playerId=${encodeURIComponent(playerId)}`,
    );
  },
};
