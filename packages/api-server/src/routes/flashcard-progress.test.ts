import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import flashcardProgressRoutes from '../routes/flashcard-progress';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { generateId } from '@quizzquizz/common';

// session-doc-manager calls yjs/ws — mock it to keep tests hermetic
vi.mock('../session-doc-manager', () => ({
  updateDoc: vi.fn(),
  getOrCreateSession: vi.fn(),
  getActiveSessionIds: vi.fn(() => [][Symbol.iterator]()),
}));

const app = new Hono();
app.route('/api/sessions', flashcardProgressRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
}

describe('Flashcard Progress Routes', () => {
  let sessionId: string;
  let playerId: string;

  beforeAll(async () => {
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=flashcard-progress-tests';
    await initDatabase();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.flashcardProgress.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.quizSession.deleteMany({});

    // Create a minimal session + player
    sessionId = generateId();
    playerId = generateId();

    await prisma.quizSession.create({
      data: {
        id: sessionId,
        pin: '123456',
        hostToken: generateId(),
        mode: 'flashcard',
        questionBankId: 'test-bank',
        status: 'playing',
      },
    });

    await prisma.player.create({
      data: {
        id: playerId,
        sessionId,
        nickname: 'Tester',
        score: 0,
      },
    });
  });

  describe('POST /api/sessions/:id/flashcard-answer', () => {
    it('records a card answer and returns progress aggregate', async () => {
      const res = await request(`/api/sessions/${sessionId}/flashcard-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          cardId: 'card-1',
          known: true,
          box: 2,
          yesCount: 1,
          noCount: 0,
          graduated: false,
          firstTrySuccess: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as { ok: boolean; progress: { graduated: number; box2: number; totalAnswers: number } };
      expect(data.ok).toBe(true);
      expect(data.progress.graduated).toBe(0);
      expect(data.progress.box2).toBe(1);
      expect(data.progress.totalAnswers).toBe(1);
    });

    it('updates an existing card record on subsequent calls (upsert)', async () => {
      const base = {
        playerId,
        cardId: 'card-1',
        known: true,
        box: 2 as const,
        yesCount: 1,
        noCount: 0,
        graduated: false,
        firstTrySuccess: true,
      };

      await request(`/api/sessions/${sessionId}/flashcard-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(base),
      });

      // Second answer: graduated
      const res = await request(`/api/sessions/${sessionId}/flashcard-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, box: 3, yesCount: 2, graduated: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as { progress: { graduated: number } };
      expect(data.progress.graduated).toBe(1);

      // Confirm only one DB row exists (upserted, not duplicated)
      const rows = await getPrisma().flashcardProgress.findMany({ where: { sessionId, playerId } });
      expect(rows).toHaveLength(1);
    });

    it('returns 404 when player does not belong to session', async () => {
      const res = await request(`/api/sessions/${sessionId}/flashcard-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: generateId(),
          cardId: 'card-1',
          known: false,
          box: 1,
          yesCount: 0,
          noCount: 1,
          graduated: false,
          firstTrySuccess: false,
        }),
      });

      expect(res.status).toBe(404);
    });

    it('calls updateDoc after recording an answer', async () => {
      const { updateDoc } = await import('../session-doc-manager');
      const spy = vi.mocked(updateDoc);
      spy.mockClear();

      await request(`/api/sessions/${sessionId}/flashcard-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          cardId: 'card-1',
          known: true,
          box: 2,
          yesCount: 1,
          noCount: 0,
          graduated: false,
          firstTrySuccess: true,
        }),
      });

      expect(spy).toHaveBeenCalledWith(sessionId, expect.objectContaining({ flashcardProgress: expect.any(Object) }));
    });
  });

  describe('GET /api/sessions/:id/flashcard-progress', () => {
    it('returns empty cards array when no progress recorded yet', async () => {
      const res = await request(`/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId}`);

      expect(res.status).toBe(200);
      const data = await res.json() as { cards: unknown[] };
      expect(data.cards).toEqual([]);
    });

    it('returns saved card states', async () => {
      // Record two cards
      for (const cardId of ['card-1', 'card-2']) {
        await request(`/api/sessions/${sessionId}/flashcard-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            cardId,
            known: true,
            box: 2,
            yesCount: 1,
            noCount: 0,
            graduated: false,
            firstTrySuccess: true,
          }),
        });
      }

      const res = await request(`/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId}`);
      expect(res.status).toBe(200);
      const data = await res.json() as { cards: Array<{ cardId: string }> };
      expect(data.cards).toHaveLength(2);
      expect(data.cards.map((c) => c.cardId).sort()).toEqual(['card-1', 'card-2']);
    });

    it('returns 400 when playerId is missing', async () => {
      const res = await request(`/api/sessions/${sessionId}/flashcard-progress`);
      expect(res.status).toBe(400);
    });

    it('returns 404 when player does not belong to session', async () => {
      const res = await request(
        `/api/sessions/${sessionId}/flashcard-progress?playerId=${generateId()}`
      );
      expect(res.status).toBe(404);
    });
  });
});
