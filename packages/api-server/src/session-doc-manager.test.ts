/**
 * Unit tests for session-doc-manager.ts
 *
 * Verifies that:
 * - getOrCreateSession creates a new entry on first call and returns the same entry thereafter
 * - updateDoc writes values into the Y.Map that can be read back
 * - destroySession closes connected WebSocket clients and removes the entry
 * - getActiveSessionIds reflects the current set of sessions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  getOrCreateSession,
  updateDoc,
  destroySession,
  getActiveSessionIds,
} from './session-doc-manager.js';

// Minimal mock WebSocket that tracks close() calls
function mockWs() {
  return {
    closed: false,
    closeCode: 0,
    closeReason: '',
    close(code: number, reason: string) {
      this.closed = true;
      this.closeCode = code;
      this.closeReason = reason;
    },
    readyState: 1, // OPEN
  } as unknown as import('ws').WebSocket;
}

// Unique session IDs per test to avoid cross-test state
let idCounter = 0;
function sid() {
  return `test-session-${++idCounter}-${Math.random().toString(36).slice(2)}`;
}

describe('session-doc-manager', () => {
  describe('getOrCreateSession', () => {
    it('creates a new entry with an empty doc on first call', () => {
      const id = sid();
      const entry = getOrCreateSession(id);
      expect(entry).toBeDefined();
      expect(entry.doc).toBeInstanceOf(Y.Doc);
      expect(entry.clients.size).toBe(0);
    });

    it('returns the same entry on subsequent calls', () => {
      const id = sid();
      const e1 = getOrCreateSession(id);
      const e2 = getOrCreateSession(id);
      expect(e1).toBe(e2);
      expect(e1.doc).toBe(e2.doc);
    });

    it('creates independent entries for different session IDs', () => {
      const id1 = sid();
      const id2 = sid();
      const e1 = getOrCreateSession(id1);
      const e2 = getOrCreateSession(id2);
      expect(e1).not.toBe(e2);
      expect(e1.doc).not.toBe(e2.doc);
    });
  });

  describe('updateDoc', () => {
    it('sets scalar values on the shared Y.Map "state"', () => {
      const id = sid();
      updateDoc(id, { status: 'lobby', totalQuestions: 5, answeredCount: 0 });
      const stateMap = getOrCreateSession(id).doc.getMap<unknown>('state');
      expect(stateMap.get('status')).toBe('lobby');
      expect(stateMap.get('totalQuestions')).toBe(5);
      expect(stateMap.get('answeredCount')).toBe(0);
    });

    it('overwrites existing values', () => {
      const id = sid();
      updateDoc(id, { status: 'lobby' });
      updateDoc(id, { status: 'playing' });
      const stateMap = getOrCreateSession(id).doc.getMap<unknown>('state');
      expect(stateMap.get('status')).toBe('playing');
    });

    it('stores null values (e.g. timerPausedAt)', () => {
      const id = sid();
      updateDoc(id, { timerPaused: true, timerPausedAt: 1234567890 });
      updateDoc(id, { timerPaused: false, timerPausedAt: null });
      const stateMap = getOrCreateSession(id).doc.getMap<unknown>('state');
      expect(stateMap.get('timerPaused')).toBe(false);
      expect(stateMap.get('timerPausedAt')).toBeNull();
    });

    it('fires a single Yjs update event when updating multiple keys', () => {
      const id = sid();
      const { doc } = getOrCreateSession(id);
      let updateCount = 0;
      doc.on('update', () => { updateCount++; });
      updateDoc(id, { status: 'playing', answeredCount: 2, allPlayersAnswered: false });
      // All keys are wrapped in doc.transact() — exactly one update event expected
      expect(updateCount).toBe(1);
    });

    it('stores and retrieves array values for players and leaderboard', () => {
      const id = sid();
      const players = [{ id: 'p1', nickname: 'Alice', score: 100, joinedAt: 1000 }];
      const leaderboard = [{ playerId: 'p1', nickname: 'Alice', score: 100, rank: 1 }];
      updateDoc(id, { players, leaderboard });
      const stateMap = getOrCreateSession(id).doc.getMap<unknown>('state');
      expect(stateMap.get('players')).toEqual(players);
      expect(stateMap.get('leaderboard')).toEqual(leaderboard);
    });
  });

  describe('destroySession', () => {
    it('calls close() on all connected WebSocket clients', () => {
      const id = sid();
      const ws1 = mockWs();
      const ws2 = mockWs();
      const entry = getOrCreateSession(id);
      entry.clients.add(ws1);
      entry.clients.add(ws2);

      destroySession(id);

      expect(ws1.closed).toBe(true);
      expect(ws1.closeCode).toBe(1001);
      expect(ws2.closed).toBe(true);
      expect(ws2.closeCode).toBe(1001);
    });

    it('removes the session from the registry so the next call creates a fresh entry', () => {
      const id = sid();
      const e1 = getOrCreateSession(id);
      updateDoc(id, { status: 'playing' });
      destroySession(id);
      // After destroy, a new entry should be created
      const e2 = getOrCreateSession(id);
      expect(e2).not.toBe(e1);
      // Fresh doc has no state
      expect(e2.doc.getMap<unknown>('state').get('status')).toBeUndefined();
    });

    it('is safe to call on a non-existent session (no throw)', () => {
      expect(() => destroySession('does-not-exist-xyz')).not.toThrow();
    });
  });

  describe('getActiveSessionIds', () => {
    it('includes newly created session IDs', () => {
      const id = sid();
      getOrCreateSession(id);
      const ids = [...getActiveSessionIds()];
      expect(ids).toContain(id);
    });

    it('excludes destroyed session IDs', () => {
      const id = sid();
      getOrCreateSession(id);
      destroySession(id);
      // Create a fresh one so there's at least one entry to iterate
      const id2 = sid();
      getOrCreateSession(id2);
      const ids = [...getActiveSessionIds()];
      expect(ids).not.toContain(id);
      expect(ids).toContain(id2);
      destroySession(id2);
    });
  });
});
