/**
 * Yjs session provider for player-app.
 *
 * Creates and caches a WebsocketProvider + Y.Doc per session.
 * Components call connectToSession() on mount and the returned
 * disconnect function on unmount.
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionQuestion {
  id: string;
  text: string;
  answers: Array<{ id: string; text: string }>;
  difficulty: string;
  timeLimit: number | null;
  /** Only present for the host; never sent to players via doc */
  correctAnswerIds?: string[];
}

export interface SessionDocState {
  status?: string;
  currentQuestionIndex?: number;
  currentQuestionNumber?: number;
  currentQuestion?: SessionQuestion | null;
  questionStartedAt?: number | null;
  timeLimit?: number | null;
  timerPaused?: boolean;
  timerPausedAt?: number | null;
  allPlayersAnswered?: boolean;
  answeredCount?: number;
  serverTime?: number;
  automaticPace?: boolean;
  pace?: string;
  totalQuestions?: number;
  mode?: string;
  players?: Array<{ id: string; nickname: string; score: number; joinedAt: number }>;
  leaderboard?: Array<{ playerId: string; nickname: string; score: number; rank: number }>;
}

// ─── Provider registry ────────────────────────────────────────────────────────

interface ProviderEntry {
  provider: WebsocketProvider;
  doc: Y.Doc;
  refCount: number;
}

const registry = new Map<string, ProviderEntry>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBaseUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/sessions`;
}

function getEntry(sessionId: string, playerId: string): ProviderEntry {
  if (!registry.has(sessionId)) {
    const doc = new Y.Doc();
    // y-websocket builds URL as: baseUrl + '/' + roomname + '?' + params
    // This yields: /ws/sessions/{sessionId}?playerId=xxx
    const provider = new WebsocketProvider(
      buildBaseUrl(),
      sessionId,
      doc,
      { params: { playerId }, connect: false }
    );
    registry.set(sessionId, { provider, doc, refCount: 0 });
  }
  return registry.get(sessionId)!;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connect to a session's real-time doc and subscribe to state changes.
 *
 * Returns a disconnect function — call it in onUnmount to unsubscribe.
 * The underlying WebSocket is kept open as long as at least one subscriber
 * is active. It is fully torn down once all subscribers disconnect.
 */
export function connectToSession(
  sessionId: string,
  playerId: string,
  onStateChange: (state: SessionDocState) => void
): () => void {
  const entry = getEntry(sessionId, playerId);
  entry.refCount++;

  const stateMap = entry.doc.getMap<unknown>('state');

  const observer = () => {
    const state: SessionDocState = {};
    stateMap.forEach((value, key) => {
      (state as Record<string, unknown>)[key] = value;
    });
    onStateChange(state);
  };

  stateMap.observe(observer);

  // Connect if not already connected
  if (entry.provider.wsconnected === false) {
    entry.provider.connect();
  }

  // Fire once immediately if doc already has state (reconnect scenario)
  if (stateMap.size > 0) {
    observer();
  }

  return () => {
    stateMap.unobserve(observer);
    entry.refCount--;

    if (entry.refCount <= 0) {
      entry.provider.disconnect();
      entry.doc.destroy();
      registry.delete(sessionId);
    }
  };
}
