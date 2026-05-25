/**
 * Simple session state for flashcard app (persisted to sessionStorage).
 */

const STORAGE_KEY = 'qz-flashcard-state';

interface FlashcardAppState {
  sessionId: string | null;
  playerId: string | null;
  nickname: string | null;
  pin: string | null;
}

function load(): FlashcardAppState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FlashcardAppState;
  } catch {
    // ignore
  }
  return { sessionId: null, playerId: null, nickname: null, pin: null };
}

function save(s: FlashcardAppState): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const _state = load();

export const state = {
  get sessionId() { return _state.sessionId; },
  get playerId() { return _state.playerId; },
  get nickname() { return _state.nickname; },
  get pin() { return _state.pin; },

  set(updates: Partial<FlashcardAppState>): void {
    Object.assign(_state, updates);
    save(_state);
  },

  clear(): void {
    Object.assign(_state, { sessionId: null, playerId: null, nickname: null, pin: null });
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
