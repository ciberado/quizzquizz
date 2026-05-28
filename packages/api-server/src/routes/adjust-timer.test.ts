/**
 * Tests for POST /api/sessions/:id/adjust-timer
 *
 * Verifies that timer adjustments from the host are persisted on the server
 * and reflected in the game state endpoint that players poll.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from './sessions';
import gameRoutes from './game';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';

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
