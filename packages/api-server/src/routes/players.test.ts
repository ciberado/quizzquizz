// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from '../routes/sessions';
import playerRoutes from '../routes/players';
import { initDatabase, db } from '../db';
import { sessions, players } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', playerRoutes);

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
  return res.json();
}

describe('Player Routes', () => {
  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    initDatabase();
  });

  beforeEach(async () => {
    await db.delete(players);
    await db.delete(sessions);
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
      const data = await res.json();
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
      const data = await res.json();
      expect(data.players).toHaveLength(2);
    });

    it('should return empty array for session with no players', async () => {
      const session = await createSession();
      const res = await request(`/api/sessions/${session.id}/players`);
      expect(res.status).toBe(200);
      const data = await res.json();
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
      const player1 = await res1.json();
      const res2 = await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player2' }),
      });
      const player2 = await res2.json();
      await db.update(players).set({ score: 100 }).where(eq(players.id, player1.playerId));
      await db.update(players).set({ score: 200 }).where(eq(players.id, player2.playerId));
      const res = await request(`/api/sessions/${session.id}/players`);
      const data = await res.json();
      expect(data.players[0].nickname).toBe('Player2');
      expect(data.players[1].nickname).toBe('Player1');
    });
  });
});
