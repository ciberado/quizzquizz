import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db';
import { generateId, generatePin } from '@quizzquizz/common';
import { questionBanks } from '../state';

const sessionRoutes = new Hono();

// Create session request schema
const CreateSessionSchema = z.object({
  questionBankId: z.string(),
});

// Create a new session
sessionRoutes.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const { questionBankId } = c.req.valid('json');

  // Generate unique PIN (in production, check for collisions)
  const pin = generatePin();
  const sessionId = generateId();
  const hostToken = generateId();

  try {
    await getPrisma().session.create({
      data: {
        id: sessionId,
        pin,
        hostToken,
        questionBankId,
        status: 'lobby',
        currentQuestionIndex: -1,
        createdAt: BigInt(Date.now()),
      },
    });

    return c.json(
      {
        id: sessionId,
        pin,
        hostToken,
        questionBankId,
        status: 'lobby',
      },
      201
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Get session (requires host token)
sessionRoutes.get('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    // Load questions from question bank
    const questionBank = questionBanks.get(session.questionBankId);
    const questions = questionBank ? questionBank.questions : [];

    // Don't send hostToken in response, convert BigInt to number
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hostToken: _, createdAt, questionStartedAt, ...sessionData } = session;
    return c.json({
      ...sessionData,
      createdAt: Number(createdAt),
      questionStartedAt: questionStartedAt ? Number(questionStartedAt) : null,
      questions, // Include questions from question bank
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// Delete session (requires host token)
sessionRoutes.delete('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    await getPrisma().session.delete({ where: { id: sessionId } });

    return c.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

// Start quiz (requires host token)
sessionRoutes.post('/:id/start', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    if (session.status !== 'lobby') {
      return c.json({ error: 'Session is not in lobby state' }, 400);
    }

    // Verify question bank exists
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank || questionBank.questions.length === 0) {
      return c.json({ error: 'Question bank has no questions' }, 400);
    }

    // Start quiz: move to first question
    await getPrisma().session.update({
      where: { id: sessionId },
      data: {
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: BigInt(Date.now()),
      },
    });

    return c.json({ message: 'Quiz started', currentQuestionIndex: 0 });
  } catch (error) {
    console.error('Error starting quiz:', error);
    return c.json({ error: 'Failed to start quiz' }, 500);
  }
});

// Move to next question (requires host token)
sessionRoutes.post('/:id/next', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    if (session.status !== 'playing') {
      return c.json({ error: 'Session is not currently playing' }, 400);
    }

    // Get question bank
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank) {
      return c.json({ error: 'Question bank not found' }, 404);
    }

    const nextIndex = session.currentQuestionIndex + 1;

    // Check if we've reached the end
    if (nextIndex >= questionBank.questions.length) {
      // End the quiz
      await getPrisma().session.update({
        where: { id: sessionId },
        data: {
          status: 'finished',
          currentQuestionIndex: -1,
          questionStartedAt: null,
        },
      });

      return c.json({
        message: 'Quiz finished',
        status: 'finished',
      });
    }

    // Move to next question
    await getPrisma().session.update({
      where: { id: sessionId },
      data: {
        currentQuestionIndex: nextIndex,
        questionStartedAt: BigInt(Date.now()),
      },
    });

    return c.json({
      message: 'Moved to next question',
      currentQuestionIndex: nextIndex,
    });
  } catch (error) {
    console.error('Error moving to next question:', error);
    return c.json({ error: 'Failed to move to next question' }, 500);
  }
});

// End quiz (requires host token)
sessionRoutes.post('/:id/end', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    if (session.status === 'finished') {
      return c.json({ error: 'Session is already finished' }, 400);
    }

    // End the quiz
    await getPrisma().session.update({
      where: { id: sessionId },
      data: {
        status: 'finished',
        currentQuestionIndex: -1,
        questionStartedAt: null,
      },
    });

    return c.json({ message: 'Quiz ended' });
  } catch (error) {
    console.error('Error ending quiz:', error);
    return c.json({ error: 'Failed to end quiz' }, 500);
  }
});

// Get leaderboard (accessible by anyone with session ID)
sessionRoutes.get('/:id/leaderboard', async (c) => {
  const sessionId = c.req.param('id');

  try {
    // Verify session exists
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Get all players ranked by score
    const ranking = await getPrisma().player.findMany({
      where: { sessionId },
      orderBy: [
        { score: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    const leaderboard = ranking.map((p, index) => ({
      rank: index + 1,
      nickname: p.nickname,
      score: p.score,
      playerId: p.id,
    }));

    return c.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

export default sessionRoutes;
