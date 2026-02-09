// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from '../routes/sessions';
import { initDatabase, db } from '../db';
import { sessions } from '../db/schema';

const app = new Hono();
app.route('/api/sessions', sessionRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
}

describe('Session Routes', () => {
  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    initDatabase();
  });

  beforeEach(async () => {
    await db.delete(sessions);
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('pin');
      expect(data).toHaveProperty('hostToken');
      expect(data.questionBankId).toBe('test-bank');
      expect(data.status).toBe('lobby');
      expect(data.pin).toHaveLength(6);
    });

    it('should return 400 for missing questionBankId', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('should generate unique PINs', async () => {
      const res1 = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const res2 = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const data1 = await res1.json();
      const data2 = await res2.json();
      expect(data1.pin).not.toBe(data2.pin);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with valid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken } = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(id);
      expect(data).not.toHaveProperty('hostToken');
    });

    it('should return 401 without host token', async () => {
      const res = await request('/api/sessions/test-id');
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request('/api/sessions/non-existent', {
        headers: { 'X-Host-Token': 'some-token' },
      });
      expect(res.status).toBe(404);
    });

    it('should return 403 for invalid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id } = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': 'wrong-token' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete session with valid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken } = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'X-Host-Token': hostToken },
      });
      expect(res.status).toBe(200);
      const checkRes = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      expect(checkRes.status).toBe(404);
    });

    it('should return 401 without host token', async () => {
      const res = await request('/api/sessions/test-id', { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for invalid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id } = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'X-Host-Token': 'wrong-token' },
      });
      expect(res.status).toBe(403);
    });
  });
});
