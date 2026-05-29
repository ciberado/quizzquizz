/**
 * Tests for POST /api/sessions/:id/adjust-timer
 *
 * Verifies that timer adjustments from the host are persisted on the server
 * and reflected in the game state endpoint that players poll.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from './sessions';
import gameRoutes from './game';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';
import { getOrCreateSession, destroySession, stopCountdown } from '../session-doc-manager';

const app = new Hono();
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', gameRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return app.fetch(req);
}

const SESSION_ID = 'timer-test-session';
const HOST_TOKEN = 'timer-host-token';
const PLAYER_ID = 'timer-player-1';

describe('POST /api/sessions/:id/adjust-timer', () => {
  beforeAll(async () => {
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=adjusttimer';
    await initDatabase();

    const bank: QuestionBank = {
      id: 'timer-bank',
      metadata: { name: 'Timer Test Bank', defaultTimeLimit: 30, topics: [] },
      questions: [
        {
          id: 'q1',
          text: 'Timer question?',
          answers: [
            { id: 'a1', text: 'Yes' },
            { id: 'a2', text: 'No' },
          ],
          correctAnswerIds: ['a1'],
          difficulty: 'easy',
          topics: [],
          tags: [],
          timeLimit: 30,
        },
      ],
    };
    questionBanks.set('timer-bank', bank);
  });

  beforeEach(async () => {
    await getPrisma().playerAnswer.deleteMany({});
    await getPrisma().player.deleteMany({});
    await getPrisma().quizSession.deleteMany({});

    // Create a playing session with an active question
    const now = new Date();
    await getPrisma().quizSession.create({
      data: {
        id: SESSION_ID,
        pin: '999111',
        hostToken: HOST_TOKEN,
        questionBankId: 'timer-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: new Date(now.getTime() - 5000), // started 5s ago
        createdAt: now,
      },
    });

    await getPrisma().player.create({
      data: {
        id: PLAYER_ID,
        sessionId: SESSION_ID,
        nickname: 'TestPlayer',
        score: 0,
        joinedAt: now,
      },
    });
  });

  it('add action increases the effective time limit seen by players', async () => {
    // Adjust: add 10 seconds
    const adjustRes = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 10 }),
    });
    expect(adjustRes.status).toBe(200);
    const adjustBody = await adjustRes.json();
    expect(adjustBody.timeLimitOverride).toBe(40); // 30 + 10

    // Player polls game state — should see timeLimit=40
    const stateRes = await request(`/api/sessions/${SESSION_ID}/state`, {
      headers: { 'X-Player-Id': PLAYER_ID },
    });
    expect(stateRes.status).toBe(200);
    const state = await stateRes.json();
    expect(state.timeLimit).toBe(40);
    expect(state.timerPaused).toBe(false);
  });

  it('remove action decreases the effective time limit', async () => {
    const adjustRes = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 10 }),
    });
    expect(adjustRes.status).toBe(200);
    const adjustBody = await adjustRes.json();
    // 30 - 10 = 20, but must be at least elapsed (5s) — so 20
    expect(adjustBody.timeLimitOverride).toBe(20);

    const stateRes = await request(`/api/sessions/${SESSION_ID}/state`, {
      headers: { 'X-Player-Id': PLAYER_ID },
    });
    const state = await stateRes.json();
    expect(state.timeLimit).toBe(20);
  });

  it('end action makes remaining time 0 for players', async () => {
    const adjustRes = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'end' }),
    });
    expect(adjustRes.status).toBe(200);

    const stateRes = await request(`/api/sessions/${SESSION_ID}/state`, {
      headers: { 'X-Player-Id': PLAYER_ID },
    });
    const state = await stateRes.json();
    // timeLimit should equal elapsed time (~5s), meaning remaining ≈ 0
    expect(state.timeLimit).toBeGreaterThanOrEqual(5);
    expect(state.timeLimit).toBeLessThanOrEqual(7); // small tolerance for test execution time
  });

  it('pause action is reflected in player game state', async () => {
    const adjustRes = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    expect(adjustRes.status).toBe(200);

    const stateRes = await request(`/api/sessions/${SESSION_ID}/state`, {
      headers: { 'X-Player-Id': PLAYER_ID },
    });
    const state = await stateRes.json();
    expect(state.timerPaused).toBe(true);
  });

  it('resume after pause shifts questionStartedAt so elapsed stays correct', async () => {
    // Pause
    await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });

    // Wait a tiny bit (simulate paused time)
    await new Promise(r => setTimeout(r, 50));

    // Resume
    const resumeRes = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'resume' }),
    });
    expect(resumeRes.status).toBe(200);

    const stateRes = await request(`/api/sessions/${SESSION_ID}/state`, {
      headers: { 'X-Player-Id': PLAYER_ID },
    });
    const state = await stateRes.json();
    expect(state.timerPaused).toBe(false);
    // After resume, remaining should still be ~25s (30 - 5s elapsed before pause)
    const remaining = state.timeLimit - Math.floor((state.serverTime - state.questionStartedAt) / 1000);
    expect(remaining).toBeGreaterThanOrEqual(23);
    expect(remaining).toBeLessThanOrEqual(26);
  });

  it('host GET also reflects timer override and pause state', async () => {
    // Add time
    await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 5 }),
    });

    // Host GET
    const hostRes = await request(`/api/sessions/${SESSION_ID}`, {
      headers: { 'X-Host-Token': HOST_TOKEN },
    });
    expect(hostRes.status).toBe(200);
    const hostState = await hostRes.json();
    expect(hostState.currentQuestionTimeLimit).toBe(35); // 30 + 5
    expect(hostState.timerPausedAt).toBeNull();
  });

  it('rejects requests without host token', async () => {
    const res = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      body: JSON.stringify({ action: 'add', seconds: 5 }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects add/remove without seconds parameter', async () => {
    const res = await request(`/api/sessions/${SESSION_ID}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': HOST_TOKEN },
      body: JSON.stringify({ action: 'add' }),
    });
    expect(res.status).toBe(400);
  });
});

/**
 * Yjs doc synchronization tests for timer-related routes.
 *
 * After each REST mutation the route calls updateDoc() so that connected
 * WebSocket clients receive push updates. These tests inspect the Yjs doc
 * directly to verify the correct fields are written.
 */
describe('Yjs doc updates — timer sync', () => {
  const DOC_SESSION = 'yjs-timer-doc-session';
  const DOC_HOST_TOKEN = 'yjs-timer-host';
  const DOC_PLAYER = 'yjs-timer-player';

  afterEach(() => {
    destroySession(DOC_SESSION);
  });

  async function setupPlayingSession() {
    const now = new Date();
    await getPrisma().quizSession.deleteMany({ where: { id: DOC_SESSION } });
    await getPrisma().player.deleteMany({ where: { sessionId: DOC_SESSION } });
    await getPrisma().quizSession.create({
      data: {
        id: DOC_SESSION,
        pin: '000222',
        hostToken: DOC_HOST_TOKEN,
        questionBankId: 'timer-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: new Date(now.getTime() - 5000),
        createdAt: now,
      },
    });
    await getPrisma().player.create({
      data: { id: DOC_PLAYER, sessionId: DOC_SESSION, nickname: 'DocPlayer', score: 0, joinedAt: now },
    });
  }

  it('pause — sets timerPaused=true and timerPausedAt in Yjs doc', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timerPaused')).toBe(true);
    expect(typeof stateMap.get('timerPausedAt')).toBe('number');
    expect(stateMap.get('timerPausedAt')).toBeGreaterThan(0);
  });

  it('resume — sets timerPaused=false and timerPausedAt=null in Yjs doc', async () => {
    await setupPlayingSession();
    // Pause first
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    // Resume
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'resume' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timerPaused')).toBe(false);
    expect(stateMap.get('timerPausedAt')).toBeNull();
    expect(typeof stateMap.get('questionStartedAt')).toBe('number');
  });

  it('add — sets updated timeLimit in Yjs doc', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 10 }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeLimit')).toBe(40); // 30 + 10
    expect(stateMap.get('timerPaused')).toBe(false);
  });

  it('add while paused — increases timeLimit but preserves pause state', async () => {
    await setupPlayingSession();
    // Pause first
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const pausedAt = stateMap.get('timerPausedAt') as number;
    expect(pausedAt).toBeGreaterThan(0);

    // Add time while paused
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 10 }),
    });
    expect(stateMap.get('timeLimit')).toBe(40); // 30 + 10
    expect(stateMap.get('timerPaused')).toBe(true);
    expect(stateMap.get('timerPausedAt')).toBe(pausedAt); // unchanged
  });

  it('remove while paused — decreases timeLimit but preserves pause state', async () => {
    await setupPlayingSession();
    // Pause first
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const pausedAt = stateMap.get('timerPausedAt') as number;

    // Remove time while paused — elapsed is measured from questionStartedAt to timerPausedAt
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 10 }),
    });
    expect(stateMap.get('timeLimit')).toBe(20); // 30 - 10
    expect(stateMap.get('timerPaused')).toBe(true);
    expect(stateMap.get('timerPausedAt')).toBe(pausedAt); // unchanged
  });

  it('remove — sets reduced timeLimit in Yjs doc', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 10 }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeLimit')).toBe(20); // 30 - 10
  });

  it('end — sets timeLimit ≈ elapsed in Yjs doc', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'end' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const tl = stateMap.get('timeLimit') as number;
    expect(tl).toBeGreaterThanOrEqual(5);
    expect(tl).toBeLessThanOrEqual(7);
  });

  it('serverTime field is a recent timestamp in all adjust-timer responses', async () => {
    await setupPlayingSession();
    const before = Date.now();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 5 }),
    });
    const after = Date.now();
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const serverTime = stateMap.get('serverTime') as number;
    expect(serverTime).toBeGreaterThanOrEqual(before);
    expect(serverTime).toBeLessThanOrEqual(after);
  });

  // ── Server-side countdown: timeRemaining field ────────────────────────────

  it('add — sets timeRemaining = (remaining before add) + seconds in Yjs doc', async () => {
    await setupPlayingSession();
    // Session started 5s ago, timeLimit=30 → remaining ≈ 25. Add 10 → remaining ≈ 35.
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 10 }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const tr = stateMap.get('timeRemaining') as number;
    expect(tr).toBeGreaterThanOrEqual(33); // 25 + 10 − small execution slack
    expect(tr).toBeLessThanOrEqual(37);
  });

  it('remove — sets timeRemaining = (remaining before remove) - seconds in Yjs doc', async () => {
    await setupPlayingSession();
    // remaining ≈ 25. Remove 10 → remaining ≈ 15.
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 10 }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const tr = stateMap.get('timeRemaining') as number;
    expect(tr).toBeGreaterThanOrEqual(13);
    expect(tr).toBeLessThanOrEqual(17);
  });

  it('remove more than remaining — clamps timeRemaining to 0', async () => {
    await setupPlayingSession();
    // remaining ≈ 25. Remove 30 → timeRemaining = 0.
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 30 }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeRemaining')).toBe(0);
  });

  it('end — sets timeRemaining=0 in Yjs doc', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'end' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeRemaining')).toBe(0);
  });

  it('pause — timeRemaining in doc is frozen at current value', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const trAtPause = stateMap.get('timeRemaining') as number;
    // Should be around 25 (30 - 5s elapsed), not 0
    expect(trAtPause).toBeGreaterThanOrEqual(23);
    expect(trAtPause).toBeLessThanOrEqual(27);
    // Wait a tick — value must not change (countdown stopped)
    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(trAtPause);
  });

  it('resume — timeRemaining restarts decrementing after resume', async () => {
    await setupPlayingSession();
    // Pause
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const trAtPause = stateMap.get('timeRemaining') as number;

    // Resume
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'resume' }),
    });
    expect(stateMap.get('timeRemaining')).toBe(trAtPause); // immediate value unchanged

    // After 1 tick the countdown decrements
    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(trAtPause - 1);
  });

  it('add while paused — increases timeRemaining but does not restart countdown', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const trAtPause = stateMap.get('timeRemaining') as number;

    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'add', seconds: 10 }),
    });
    const trAfterAdd = stateMap.get('timeRemaining') as number;
    expect(trAfterAdd).toBe(trAtPause + 10);

    // Wait a tick — should NOT decrement (still paused)
    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(trAfterAdd);
    expect(stateMap.get('timerPaused')).toBe(true);
  });

  it('remove while paused — decreases timeRemaining but does not restart countdown', async () => {
    await setupPlayingSession();
    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'pause' }),
    });
    const stateMap = getOrCreateSession(DOC_SESSION).doc.getMap<unknown>('state');
    const trAtPause = stateMap.get('timeRemaining') as number;

    await request(`/api/sessions/${DOC_SESSION}/adjust-timer`, {
      method: 'POST',
      headers: { 'X-Host-Token': DOC_HOST_TOKEN },
      body: JSON.stringify({ action: 'remove', seconds: 5 }),
    });
    const trAfterRemove = stateMap.get('timeRemaining') as number;
    expect(trAfterRemove).toBe(trAtPause - 5);

    // Wait a tick — should NOT decrement (still paused)
    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(trAfterRemove);
    expect(stateMap.get('timerPaused')).toBe(true);
  });
});

/**
 * Tests for start/next/end routes — countdown lifecycle
 */
describe('Countdown lifecycle — start, next, end', () => {
  const LIFE_SESSION = 'life-session';
  const LIFE_HOST = 'life-host-token';

  afterEach(() => {
    stopCountdown(LIFE_SESSION);
    destroySession(LIFE_SESSION);
  });

  async function createLobbySession() {
    await getPrisma().quizSession.deleteMany({ where: { id: LIFE_SESSION } });
    await getPrisma().quizSession.create({
      data: {
        id: LIFE_SESSION,
        pin: '888999',
        hostToken: LIFE_HOST,
        questionBankId: 'timer-bank',
        status: 'lobby',
        currentQuestionIndex: -1,
        createdAt: new Date(),
      },
    });
  }

  it('start — Yjs doc gets timeRemaining = timeLimit immediately', async () => {
    await createLobbySession();
    await request(`/api/sessions/${LIFE_SESSION}/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': LIFE_HOST },
    });
    const stateMap = getOrCreateSession(LIFE_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeRemaining')).toBe(30);
    expect(stateMap.get('timeLimit')).toBe(30);
  });

  it('start — countdown decrements timeRemaining after 1 second', async () => {
    await createLobbySession();
    await request(`/api/sessions/${LIFE_SESSION}/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': LIFE_HOST },
    });
    const stateMap = getOrCreateSession(LIFE_SESSION).doc.getMap<unknown>('state');
    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(29);
  });

  it('next — resets timeRemaining to new question timeLimit and restarts countdown', async () => {
    await createLobbySession();
    const bank2: QuestionBank = {
      id: 'life-bank-2q',
      metadata: { name: 'Two Q Bank', defaultTimeLimit: 20, topics: [] },
      questions: [
        { id: 'q1', text: 'Q1?', answers: [{ id: 'a1', text: 'A' }], correctAnswerIds: ['a1'], difficulty: 'easy', topics: [], tags: [], timeLimit: 20 },
        { id: 'q2', text: 'Q2?', answers: [{ id: 'a1', text: 'A' }], correctAnswerIds: ['a1'], difficulty: 'easy', topics: [], tags: [], timeLimit: 15 },
      ],
    };
    questionBanks.set('life-bank-2q', bank2);
    await getPrisma().quizSession.update({ where: { id: LIFE_SESSION }, data: { questionBankId: 'life-bank-2q' } });

    await request(`/api/sessions/${LIFE_SESSION}/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': LIFE_HOST },
    });
    const stateMap = getOrCreateSession(LIFE_SESSION).doc.getMap<unknown>('state');
    expect(stateMap.get('timeRemaining')).toBe(20);

    await request(`/api/sessions/${LIFE_SESSION}/next`, {
      method: 'POST',
      headers: { 'X-Host-Token': LIFE_HOST },
    });
    expect(stateMap.get('timeRemaining')).toBe(15);

    await new Promise(r => setTimeout(r, 1100));
    expect(stateMap.get('timeRemaining')).toBe(14);

    questionBanks.delete('life-bank-2q');
  });
});
