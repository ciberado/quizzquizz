import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import gameRoutes from '../routes/game';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';

const app = new Hono();
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

describe('Game Routes', () => {
  beforeAll(async () => {
    // Reset Prisma instance to force using the test DATABASE_URL
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=game';
    await initDatabase();

    // Create a sample question bank for testing
    const sampleBank: QuestionBank = {
      id: 'test-bank',
      metadata: {
        name: 'Test Bank',
        defaultTimeLimit: 10,
        topics: [],
      },
      questions: [
        {
          id: 'q1',
          text: 'What is 2+2?',
          answers: [
            { id: 'a1', text: '3' },
            { id: 'a2', text: '4' },
            { id: 'a3', text: '5' },
          ],
          correctAnswerIds: ['a2'],
          difficulty: 'easy',
          topics: [],
          tags: [],
          timeLimit: 10,
        },
        {
          id: 'q2',
          text: 'What is 3+3?',
          answers: [
            { id: 'a4', text: '5' },
            { id: 'a5', text: '6' },
            { id: 'a6', text: '7' },
          ],
          correctAnswerIds: ['a5'],
          difficulty: 'easy',
          topics: [],
          tags: [],
          timeLimit: 10,
        },
      ],
    };

    questionBanks.set('test-bank', sampleBank);
  });

  beforeEach(async () => {
    await getPrisma().playerAnswer.deleteMany({});
    await getPrisma().player.deleteMany({});
    await getPrisma().session.deleteMany({});
  });

  describe('GET /api/sessions/:sessionId/state', () => {
    it('should return game state for a lobbying session', async () => {
      // Create session
      const sessionId = 'test-session-1';
      const hostToken = 'host-token-1';
      const playerId = 'player-1';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '123456',
        hostToken,
        questionBankId: 'test-bank',
        status: 'lobby',
        currentQuestionIndex: -1,
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId,
        sessionId,
        nickname: 'Alice',
        score: 0,
        joinedAt: BigInt(now),
      } });

      const res = await request(`/api/sessions/${sessionId}/state`, {
        headers: { 'X-Player-Id': playerId },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe('lobby');
      expect(data.currentQuestion).toBeNull();
      expect(data.currentQuestionNumber).toBe(0);
      expect(data.totalQuestions).toBe(2);
      expect(data.questionStartedAt).toBeNull();
      expect(data.timeLimit).toBeNull();
    });

    it('should return current question during playing state', async () => {
      const sessionId = 'test-session-2';
      const hostToken = 'host-token-2';
      const playerId = 'player-2';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '234567',
        hostToken,
        questionBankId: 'test-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: BigInt(now),
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId,
        sessionId,
        nickname: 'Bob',
        score: 100,
        joinedAt: BigInt(now),
      } });

      const res = await request(`/api/sessions/${sessionId}/state`, {
        headers: { 'X-Player-Id': playerId },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe('playing');
      expect(data.currentQuestion).toBeDefined();
      expect(data.currentQuestion.id).toBe('q1');
      expect(data.currentQuestion.text).toBe('What is 2+2?');
      expect(data.currentQuestionNumber).toBe(1);
      expect(data.totalQuestions).toBe(2);
      expect(data.questionStartedAt).toBeGreaterThan(0);
      expect(data.timeLimit).toBe(10);
    });

    it('should return 401 if player ID is missing', async () => {
      const res = await request('/api/sessions/test-session/state');
      expect(res.status).toBe(401);
      const data: any = await res.json();
      expect(data.error).toBe('Player ID required');
    });

    it('should return 404 if session not found', async () => {
      const res = await request('/api/sessions/nonexistent/state', {
        headers: { 'X-Player-Id': 'player-1' },
      });
      expect(res.status).toBe(404);
      const data: any = await res.json();
      expect(data.error).toBe('Session not found');
    });

    it('should return 403 if player not in session', async () => {
      const sessionId = 'test-session-3';
      const hostToken = 'host-token-3';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '345678',
        hostToken,
        questionBankId: 'test-bank',
        status: 'lobby',
        currentQuestionIndex: -1,
        createdAt: BigInt(now),
      } });

      const res = await request(`/api/sessions/${sessionId}/state`, {
        headers: { 'X-Player-Id': 'unknown-player' },
      });
      expect(res.status).toBe(403);
      const data: any = await res.json();
      expect(data.error).toBe('Player not found in session');
    });
  });

  describe('POST /api/sessions/:sessionId/answer', () => {
    it('should accept a correct answer and award points', async () => {
      const sessionId = 'test-session-4';
      const hostToken = 'host-token-4';
      const playerId = 'player-4';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '456789',
        hostToken,
        questionBankId: 'test-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: now - 3000, // 3 seconds ago
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId,
        sessionId,
        nickname: 'Charlie',
        score: 0,
        joinedAt: BigInt(now),
      } });

      const res = await request(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'X-Player-Id': playerId },
        body: JSON.stringify({
          questionId: 'q1',
          selectedAnswerIds: ['a2'], // Correct answer for q1
        }),
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.correct).toBe(true);
      expect(data.score).toBeGreaterThan(0);
      expect(data.correctAnswerIds).toEqual(['a2']);

      // Verify player score was updated
      const updatedPlayer = await getPrisma().player.findFirst({
        where: { id: playerId },
      });
      expect(updatedPlayer).toBeDefined();
      expect(updatedPlayer!.score).toBe(data.score);
    });

    it('should accept an incorrect answer and award 0 points', async () => {
      const sessionId = 'test-session-5';
      const hostToken = 'host-token-5';
      const playerId = 'player-5';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '567890',
        hostToken,
        questionBankId: 'test-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: BigInt(now),
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId,
        sessionId,
        nickname: 'Diana',
        score: 0,
        joinedAt: BigInt(now),
      } });

      const res = await request(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'X-Player-Id': playerId },
        body: JSON.stringify({
          questionId: 'q1',
          selectedAnswerIds: ['a1'], // Wrong answer (3 instead of 4)
        }),
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.correct).toBe(false);
      expect(data.score).toBe(0);

      // Verify player score was not updated
      const updatedPlayer = await getPrisma().player.findFirst({
        where: { id: playerId },
      });
      expect(updatedPlayer).toBeDefined();
      expect(updatedPlayer!.score).toBe(0);
    });

    it('should prevent answering the same question twice', async () => {
      const sessionId = 'test-session-6';
      const hostToken = 'host-token-6';
      const playerId = 'player-6';
      const now = Date.now();

      await getPrisma().session.create({ data: {
        id: sessionId,
        pin: '678901',
        hostToken,
        questionBankId: 'test-bank',
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: BigInt(now),
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId,
        sessionId,
        nickname: 'Eve',
        score: 0,
        joinedAt: BigInt(now),
      } });

      // First answer
      const res1 = await request(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'X-Player-Id': playerId },
        body: JSON.stringify({
          questionId: 'q1',
          selectedAnswerIds: ['a2'],
        }),
      });
      expect(res1.status).toBe(200);

      // Second answer to same question should fail
      const res2 = await request(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'X-Player-Id': playerId },
        body: JSON.stringify({
          questionId: 'q1',
          selectedAnswerIds: ['a1'],
        }),
      });
      expect(res2.status).toBe(400);
      const data: any = await res2.json();
      expect(data.error).toBe('Answer already submitted for this question');
    });

    it('should return 401 if player ID is missing', async () => {
      const res = await request('/api/sessions/test-session/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId: 'q1', selectedAnswerIds: ['a1'] }),
      });
      expect(res.status).toBe(401);
    });

    it('should return 400 if session is not playing', async () => {
      // First verify by creating a session in playing state and checking the base case works
      const sessionId1 = 'ans-test-lobby-1';
      const hostToken1 = 'token1';
      const playerId1 = 'player-ans-1';
      const now = Date.now();

      // Create a session in lobby (not playing)
      await getPrisma().session.create({ data: {
        id: sessionId1,
        pin: '111111',
        hostToken: hostToken1,
        questionBankId: 'test-bank',
        status: 'lobby',
        currentQuestionIndex: -1,
        createdAt: BigInt(now),
      } });

      await getPrisma().player.create({ data: {
        id: playerId1,
        sessionId: sessionId1,
        nickname: 'TestPlayer',
        score: 0,
        joinedAt: BigInt(now),
      } });

      // Verify session was created
      const checkSession = await getPrisma().session.findFirst({
        where: { id: sessionId1 },
      });
      expect(checkSession).toBeDefined();
      expect(checkSession?.status).toBe('lobby');

      const res = await request(`/api/sessions/${sessionId1}/answer`, {
        method: 'POST',
        headers: { 
          'X-Player-Id': playerId1,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: 'q1',
          selectedAnswerIds: ['a2'],
        }),
      });
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toBe('Session is not currently playing');
    });
  });
});
