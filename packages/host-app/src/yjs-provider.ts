/**
 * Yjs session provider for host-app.
 *
 * Same pattern as player-app's yjs-provider, but uses hostToken for auth.
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

function getEntry(sessionId: string, hostToken: string): ProviderEntry {
  if (!registry.has(sessionId)) {
    const doc = new Y.Doc();
    // y-websocket builds URL as: baseUrl + '/' + roomname + '?' + params
    const provider = new WebsocketProvider(
      buildBaseUrl(),
      sessionId,
      doc,
      { params: { hostToken }, connect: false }
    );
    registry.set(sessionId, { provider, doc, refCount: 0 });
  }
  return registry.get(sessionId)!;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connect to a session's real-time doc as the host and subscribe to state changes.
 *
 * Returns a disconnect function — call it in disconnectedCallback to unsubscribe.
 */
export function connectToSession(
  sessionId: string,
  hostToken: string,
  onStateChange: (state: SessionDocState) => void
): () => void {
  const entry = getEntry(sessionId, hostToken);
  entry.refCount++;

  const stateMap = entry.doc.getMap<unknown>('state');

  const observer = () => {
    const docState: SessionDocState = {};
    stateMap.forEach((value, key) => {
      (docState as Record<string, unknown>)[key] = value;
    });
    onStateChange(docState);
  };

  stateMap.observe(observer);

  if (entry.provider.wsconnected === false) {
    entry.provider.connect();
  }

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
