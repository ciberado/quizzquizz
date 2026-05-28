/**
 * Session Doc Manager
 *
 * Maintains one Yjs Y.Doc per quiz session in memory.
 * REST mutation routes call updateDoc() after every DB write so that
 * all connected WebSocket clients (host and players) receive push
 * updates immediately — no polling required.
 *
 * The docs are ephemeral: on server restart the doc is rebuilt from
 * DB state the first time a WebSocket client connects or when a REST
 * mutation calls updateDoc().
 */

import * as Y from 'yjs';
import type { WebSocket } from 'ws';

export interface SessionDocState {
  // Session config (set once, never changes during a session)
  automaticPace: boolean;
  pace: string; // 'normal' | 'calm' | 'manual'
  totalQuestions: number;
  mode: string; // 'quiz' | 'flashcard'

  // Dynamic state
  status: string; // 'lobby' | 'playing' | 'finished'
  currentQuestionIndex: number;
  currentQuestionNumber: number; // 1-based
  /** Current question WITHOUT correctAnswerIds (kept server-side only) */
  currentQuestion: {
    id: string;
    text: string;
    answers: Array<{ id: string; text: string }>;
    difficulty: string;
    timeLimit: number | null;
  } | null;
  questionStartedAt: number | null;
  timeLimit: number | null;
  timerPaused: boolean;
  timerPausedAt: number | null;
  allPlayersAnswered: boolean;
  answeredCount: number;
  serverTime: number;

  // Players & leaderboard (updated on every join / answer)
  players: Array<{ id: string; nickname: string; score: number; joinedAt: number }>;
  leaderboard: Array<{ playerId: string; nickname: string; score: number; rank: number }>;

  // Flashcard progress — per-player aggregate stats (updated on every card answer)
  flashcardProgress: Record<string, FlashcardPlayerProgress>;
}

export interface FlashcardPlayerProgress {
  playerId: string;
  nickname: string;
  totalCards: number;
  graduated: number;
  box1: number;
  box2: number;
  box3: number;
  totalAnswers: number;
  lastUpdated: number;
}

interface SessionEntry {
  doc: Y.Doc;
  clients: Set<WebSocket>;
}

const sessions = new Map<string, SessionEntry>();

/** Get the shared entry for a session, creating it if needed. */
export function getOrCreateSession(sessionId: string): SessionEntry {
  if (!sessions.has(sessionId)) {
    const doc = new Y.Doc();
    sessions.set(sessionId, { doc, clients: new Set() });
  }
  return sessions.get(sessionId)!;
}

/** Return active session IDs (used by heartbeat). */
export function getActiveSessionIds(): IterableIterator<string> {
  return sessions.keys();
}

/**
 * Update the session's shared Yjs document with a partial state patch.
 * The doc.on('update') listener in ws-handler.ts will broadcast the
 * encoded update to every connected WebSocket client automatically.
 */
export function updateDoc(
  sessionId: string,
  patch: Partial<SessionDocState>
): void {
  const { doc } = getOrCreateSession(sessionId);
  const stateMap = doc.getMap<unknown>('state');
  // Wrap in a transaction so a single update event is fired for all keys.
  doc.transact(() => {
    for (const [key, value] of Object.entries(patch)) {
      stateMap.set(key, value);
    }
  });
}

/** Remove a session and destroy its doc (call on session delete). */
export function destroySession(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (entry) {
    // Close all connected clients gracefully
    for (const ws of entry.clients) {
      ws.close(1001, 'Session deleted');
    }
    entry.doc.destroy();
    sessions.delete(sessionId);
  }
}
