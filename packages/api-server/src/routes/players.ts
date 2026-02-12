import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { generateId } from '@quizzquizz/common';

const playerRoutes = new Hono();

// Join session request schema
const JoinSessionSchema = z.object({
  pin: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

// Join a session with PIN
playerRoutes.post('/join', zValidator('json', JoinSessionSchema), async (c) => {
  const { pin, nickname } = c.req.valid('json');

  try {
    // Find session by PIN
    const session = await getPrisma().session.findUnique({
      where: { pin },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'lobby') {
      return c.json({ error: 'Session has already started' }, 400);
    }

    // Check for duplicate nickname in this session
    const existingPlayer = await getPrisma().player.findFirst({
      where: {
        sessionId: session.id,
        nickname,
      },
    });

    if (existingPlayer) {
      return c.json({ error: 'Nickname already taken' }, 400);
    }

    // Create player
    const playerId = generateId();
    await getPrisma().player.create({
      data: {
        id: playerId,
        sessionId: session.id,
        nickname,
        score: 0,
        joinedAt: BigInt(Date.now()),
      },
    });

    return c.json(
      {
        playerId,
        sessionId: session.id,
        nickname,
      },
      201
    );
  } catch (error) {
    console.error('Error joining session:', error);
    return c.json({ error: 'Failed to join session' }, 500);
  }
});

// List players in a session
playerRoutes.get('/:sessionId/players', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    // Verify session exists
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Get all players
    const sessionPlayers = await getPrisma().player.findMany({
      where: { sessionId },
      orderBy: [
        { score: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    // Get current question ID if quiz is playing
    let currentQuestionId: string | null = null;
    if (session.status === 'playing' && session.currentQuestionIndex >= 0) {
      // We need to get the question ID from the question bank
      // For now, we'll query PlayerAnswer to get unique question IDs
      // This is a workaround since question IDs are in-memory
      const { questionBanks } = await import('../state');
      const questionBank = questionBanks.get(session.questionBankId);
      const currentQuestion = questionBank?.questions[session.currentQuestionIndex];
      if (currentQuestion) {
        currentQuestionId = currentQuestion.id;
      }
    }

    // Get answered status for current question
    let answeredPlayerIds = new Set<string>();
    if (currentQuestionId) {
      const answers = await getPrisma().playerAnswer.findMany({
        where: {
          questionId: currentQuestionId,
          playerId: { in: sessionPlayers.map(p => p.id) },
        },
        select: { playerId: true },
      });
      answeredPlayerIds = new Set(answers.map(a => a.playerId));
    }

    return c.json({
      players: sessionPlayers.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        joinedAt: Number(p.joinedAt),
        hasAnswered: answeredPlayerIds.has(p.id),
      })),
    });
  } catch (error) {
    console.error('Error listing players:', error);
    return c.json({ error: 'Failed to list players' }, 500);
  }
});

export default playerRoutes;
