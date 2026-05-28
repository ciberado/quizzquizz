import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { generateId } from '@quizzquizz/common';
import { updateDoc } from '../session-doc-manager.js';
import type { FlashcardPlayerProgress } from '../session-doc-manager.js';

const flashcardProgressRoutes = new Hono();

const RecordAnswerSchema = z.object({
  playerId: z.string(),
  cardId: z.string(),
  known: z.boolean(),
  box: z.number().int().min(1).max(3),
  yesCount: z.number().int().min(0),
  noCount: z.number().int().min(0),
  graduated: z.boolean(),
  firstTrySuccess: z.boolean().nullable(),
});

/** POST /api/sessions/:id/flashcard-answer — record one card answer and push aggregate progress via Yjs */
flashcardProgressRoutes.post('/:id/flashcard-answer', zValidator('json', RecordAnswerSchema), async (c) => {
  const sessionId = c.req.param('id');
  const { playerId, cardId, known, box, yesCount, noCount, graduated, firstTrySuccess } = c.req.valid('json');

  try {
    const prisma = getPrisma();

    // Validate player belongs to this session
    const player = await prisma.player.findFirst({
      where: { id: playerId, sessionId },
    });
    if (!player) {
      return c.json({ error: 'Player not found in this session' }, 404);
    }

    // Upsert the per-card progress record
    await prisma.flashcardProgress.upsert({
      where: { sessionId_playerId_cardId: { sessionId, playerId, cardId } },
      create: {
        id: generateId(),
        sessionId,
        playerId,
        cardId,
        box,
        yesCount,
        noCount,
        graduated,
        firstTrySuccess,
      },
      update: {
        box,
        yesCount,
        noCount,
        graduated,
        firstTrySuccess,
      },
    });

    // Compute aggregate stats for this player across all their cards in this session
    const allCards = await prisma.flashcardProgress.findMany({
      where: { sessionId, playerId },
    });

    const aggregate: FlashcardPlayerProgress = {
      playerId,
      nickname: player.nickname,
      totalCards: allCards.length,
      graduated: allCards.filter((c) => c.graduated).length,
      box1: allCards.filter((c) => !c.graduated && c.box === 1).length,
      box2: allCards.filter((c) => !c.graduated && c.box === 2).length,
      box3: allCards.filter((c) => !c.graduated && c.box === 3).length,
      totalAnswers: allCards.reduce((sum, c) => sum + c.yesCount + c.noCount, 0),
      lastUpdated: Date.now(),
    };

    // Fetch the current flashcardProgress map from the doc, merge in this player's entry, and push update
    const currentProgress = await buildProgressMap(sessionId, prisma);
    currentProgress[playerId] = aggregate;
    updateDoc(sessionId, { flashcardProgress: currentProgress });

    // Push known=true/false as well so the doc reflects the latest answer event
    if (known) {
      // no extra doc field needed beyond aggregate
    }

    return c.json({ ok: true, progress: aggregate });
  } catch (error) {
    console.error('Error recording flashcard answer:', error);
    return c.json({ error: 'Failed to record answer' }, 500);
  }
});

/** GET /api/sessions/:id/flashcard-progress?playerId=... — return all saved card states for a player */
flashcardProgressRoutes.get('/:id/flashcard-progress', async (c) => {
  const sessionId = c.req.param('id');
  const playerId = c.req.query('playerId');

  if (!playerId) {
    return c.json({ error: 'playerId query param required' }, 400);
  }

  try {
    const prisma = getPrisma();

    // Validate player belongs to this session
    const player = await prisma.player.findFirst({
      where: { id: playerId, sessionId },
    });
    if (!player) {
      return c.json({ error: 'Player not found in this session' }, 404);
    }

    const cards = await prisma.flashcardProgress.findMany({
      where: { sessionId, playerId },
    });

    return c.json({
      playerId,
      sessionId,
      cards: cards.map((row) => ({
        cardId: row.cardId,
        box: row.box,
        yesCount: row.yesCount,
        noCount: row.noCount,
        graduated: row.graduated,
        firstTrySuccess: row.firstTrySuccess,
      })),
    });
  } catch (error) {
    console.error('Error fetching flashcard progress:', error);
    return c.json({ error: 'Failed to fetch progress' }, 500);
  }
});

/** Build the full flashcardProgress map for a session from the DB (used when updating the doc). */
async function buildProgressMap(
  sessionId: string,
  prisma: ReturnType<typeof getPrisma>,
): Promise<Record<string, FlashcardPlayerProgress>> {
  const rows = await prisma.flashcardProgress.findMany({
    where: { sessionId },
    include: { player: { select: { nickname: true } } },
  });

  const map: Record<string, FlashcardPlayerProgress> = {};
  const byPlayer = new Map<string, typeof rows>();
  for (const row of rows) {
    const arr = byPlayer.get(row.playerId) ?? [];
    arr.push(row);
    byPlayer.set(row.playerId, arr);
  }

  for (const [pid, cards] of byPlayer) {
    const nickname = cards[0]?.player.nickname ?? '';
    map[pid] = {
      playerId: pid,
      nickname,
      totalCards: cards.length,
      graduated: cards.filter((c) => c.graduated).length,
      box1: cards.filter((c) => !c.graduated && c.box === 1).length,
      box2: cards.filter((c) => !c.graduated && c.box === 2).length,
      box3: cards.filter((c) => !c.graduated && c.box === 3).length,
      totalAnswers: cards.reduce((sum, c) => sum + c.yesCount + c.noCount, 0),
      lastUpdated: Date.now(),
    };
  }

  return map;
}

export default flashcardProgressRoutes;
