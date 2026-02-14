import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from '../routes/sessions';
import playerRoutes from '../routes/players';
import gameRoutes from '../routes/game';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';

const app = new Hono();
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', playerRoutes);
app.route('/api/game', gameRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
}

async function createSession() {
  const res = await request('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionBankId: 'test-bank' }),
  });
  return res.json() as Promise<any>;
}

describe('Player Routes', () => {
  beforeAll(async () => {
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=players';
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
          text: 'Question 1',
          answers: [
            { id: 'a1', text: 'Answer 1' },
            { id: 'a2', text: 'Answer 2' },
          ],
          correctAnswerIds: ['a1'],
          difficulty: 'easy',
          topics: [],
          tags: [],
        },
      ],
    };

    questionBanks.set('test-bank', sampleBank);
  });

  beforeEach(async () => {
    await getPrisma().player.deleteMany({});
    await getPrisma().session.deleteMany({});
  });

  describe('POST /api/sessions/join', () => {
    it('should allow player to join with valid PIN', async () => {
      const session = await createSession();
      const res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data).toHaveProperty('playerId');
      expect(data.sessionId).toBe(session.id);
      expect(data.nickname).toBe('Player1');
    });

    it('should return 404 for invalid PIN', async () => {
      const res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '999999', nickname: 'Player1' }),
      });
      expect(res.status).toBe(404);
    });

    it('should prevent duplicate nicknames in same session', async () => {
      const session = await createSession();
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      const res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      expect(res.status).toBe(400);
    });

    it('should allow same nickname in different sessions', async () => {
      const session1 = await createSession();
      const session2 = await createSession();
      const res1 = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session1.pin, nickname: 'Player1' }),
      });
      const res2 = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session2.pin, nickname: 'Player1' }),
      });
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
    });

    it('should validate nickname length', async () => {
      const session = await createSession();
      const res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: '' }),
      });
      expect(res.status).toBe(400);
    });

    it('should validate PIN length', async () => {
      const res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '123', nickname: 'Player1' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sessions/:sessionId/players', () => {
    it('should list all players in session', async () => {
      const session = await createSession();
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player2' }),
      });
      const res = await request(`/api/sessions/${session.id}/players`);
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.players).toHaveLength(2);
    });

    it('should return empty array for session with no players', async () => {
      const session = await createSession();
      const res = await request(`/api/sessions/${session.id}/players`);
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.players).toHaveLength(0);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request('/api/sessions/non-existent/players');
      expect(res.status).toBe(404);
    });

    it('should order players by score descending', async () => {
      const session = await createSession();
      const res1 = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      const player1: any = await res1.json();
      
      // Check if join succeeded
      if (!player1.playerId) {
        console.error('Player1 join failed:', player1);
        throw new Error('Failed to join player 1');
      }
      
      const res2 = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player2' }),
      });
      const player2: any = await res2.json();
      
      // Check if join succeeded
      if (!player2.playerId) {
        console.error('Player2 join failed:', player2);
        throw new Error('Failed to join player 2');
      }
      
      await getPrisma().player.update({ where: { id: player1.playerId }, data: { score: 100 } });
      await getPrisma().player.update({ where: { id: player2.playerId }, data: { score: 200 } });
      const res = await request(`/api/sessions/${session.id}/players`);
      const data: any = await res.json();
      expect(data.players[0]).toBeDefined();
      expect(data.players[1]).toBeDefined();
      expect(data.players[0].nickname).toBe('Player2');
      expect(data.players[1].nickname).toBe('Player1');
    });

    it('should correctly show hasAnswered status for current question', async () => {
      // Create session with specific questions
      const sessionRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionBankId: 'test-bank',
          questionIds: ['q2', 'q1'], // Specific order
        }),
      });
      const session: any = await sessionRes.json();

      // Join with two players
      const p1Res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      });
      const player1: any = await p1Res.json();

      const p2Res = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player2' }),
      });
      const player2: any = await p2Res.json();

      // Start quiz
      await request(`/api/sessions/${session.id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': session.hostToken },
      });

      // Check initial state - no answers yet
      let playersRes = await request(`/api/sessions/${session.id}/players`);
      let playersData: any = await playersRes.json();
      expect(playersData.players).toHaveLength(2);
      expect(playersData.players.every((p: any) => p.hasAnswered === false)).toBe(true);

      // Get current game state to find the current question ID
      const gameStateRes = await request(`/api/game/${session.id}/state`, {
        headers: { 'X-Player-Id': player1.playerId },
      });
      const gameState: any = await gameStateRes.json();
      const currentQuestionId = gameState.currentQuestion.id;

      // Player1 submits answer to first question
      await request(`/api/game/${session.id}/answer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Player-Id': player1.playerId,
        },
        body: JSON.stringify({
          questionId: currentQuestionId,
          selectedAnswerIds: ['a3'],
        }),
      });

      // Check updated state - Player1 has answered, Player2 hasn't
      playersRes = await request(`/api/sessions/${session.id}/players`);
      playersData = await playersRes.json();
      const p1 = playersData.players.find((p: any) => p.id === player1.playerId);
      const p2 = playersData.players.find((p: any) => p.id === player2.playerId);
      expect(p1.hasAnswered).toBe(true);
      expect(p2.hasAnswered).toBe(false);

      // Player2 submits answer
      await request(`/api/game/${session.id}/answer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Player-Id': player2.playerId,
        },
        body: JSON.stringify({
          questionId: currentQuestionId,
          selectedAnswerIds: ['a4'],
        }),
      });

      // Check both have answered
      playersRes = await request(`/api/sessions/${session.id}/players`);
      playersData = await playersRes.json();
      expect(playersData.players.every((p: any) => p.hasAnswered === true)).toBe(true);

      // Move to next question
      await request(`/api/sessions/${session.id}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': session.hostToken },
      });

      // Check hasAnswered resets for new question
      playersRes = await request(`/api/sessions/${session.id}/players`);
      playersData = await playersRes.json();
      expect(playersData.players.every((p: any) => p.hasAnswered === false)).toBe(true);
    });
  });
});
