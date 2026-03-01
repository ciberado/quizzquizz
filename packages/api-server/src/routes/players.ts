import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { generateId } from '@quizzquizz/common';
import { getSessionQuestions } from '../session-utils.js';
import { authMiddleware } from '../auth/middleware.js';

// Extend Hono with user context from authMiddleware
type Variables = {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  } | null;
};

const playerRoutes = new Hono<{ Variables: Variables }>();

// Apply optional auth middleware to capture authenticated user on join
playerRoutes.use('*', authMiddleware);

// Join session request schema
const JoinSessionSchema = z.object({
  pin: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

// Join a session with PIN
playerRoutes.post('/join', zValidator('json', JoinSessionSchema), async (c) => {
  const { pin, nickname } = c.req.valid('json');
  const user = c.get('user'); // Populated by authMiddleware if authenticated

  try {
    // Find session by PIN
    const session = await getPrisma().quizSession.findUnique({
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
        userId: user?.id ?? null, // Link to authenticated user if signed in
        nickname,
        score: 0,
        // joinedAt uses @default(now()) in schema
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
    const session = await getPrisma().quizSession.findUnique({
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
      // Get the session's questions (respects questionIds and randomOrder)
      const questions = getSessionQuestions(session);
      const currentQuestion = questions[session.currentQuestionIndex];
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
