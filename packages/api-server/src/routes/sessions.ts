import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { generateId, generatePin, calculateAutoQuestionTime } from '@quizzquizz/common';
import { questionBanks } from '../state.js';
import { getSessionQuestions } from '../session-utils.js';
import { authMiddleware } from '../auth/middleware.js';

// Extend Hono with user context
type Variables = {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  } | null;
};

const sessionRoutes = new Hono<{ Variables: Variables }>();

// Apply optional auth middleware to all routes
sessionRoutes.use('*', authMiddleware);

// Create session request schema
const CreateSessionSchema = z.object({
  questionBankId: z.string(),
  questionIds: z.array(z.string()).optional(),
  randomOrder: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional().default(true),
  automaticPace: z.boolean().optional(),
  autoQuestionTime: z.boolean().optional(),
});

// Create a new session
sessionRoutes.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const { questionBankId, questionIds, randomOrder, shuffleAnswers, automaticPace, autoQuestionTime } = c.req.valid('json');
  
  // Get authenticated user if present (optional auth)
  const user = c.get('user');

  // Generate unique PIN (in production, check for collisions)
  const pin = generatePin();
  const sessionId = generateId();
  const hostToken = generateId();

  // Session expiration: default 24 hours, configurable via env
  const expirationHours = parseInt(process.env.SESSION_EXPIRATION_HOURS || '24', 10);
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

  try {
    await getPrisma().quizSession.create({
      data: {
        id: sessionId,
        pin,
        hostToken,
        userId: user?.id || null, // Link to authenticated user if logged in
        questionBankId,
        questionIds: questionIds ? JSON.stringify(questionIds) : null,
        randomOrder: randomOrder || false,
        shuffleAnswers: shuffleAnswers ?? true, // Default to true if not specified
        automaticPace: automaticPace || false,
        autoQuestionTime: autoQuestionTime || false,
        status: 'lobby',
        currentQuestionIndex: -1,
        // createdAt uses @default(now()) in schema
        expiresAt,
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
    const session = await getPrisma().quizSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    // Load questions based on session configuration (handles questionIds, randomOrder)
    const questions = getSessionQuestions(session);

    // Calculate current question's time limit (same logic as game state endpoint)
    let currentQuestionTimeLimit = null;
    let allPlayersAnswered = false;
    
    if (session.status === 'playing' && session.currentQuestionIndex >= 0 && questions.length > 0) {
      const currentQ = questions[session.currentQuestionIndex];
      if (currentQ) {
        const questionBank = questionBanks.get(session.questionBankId);
        
        // Calculate time limit based on session configuration
        if (session.autoQuestionTime) {
          currentQuestionTimeLimit = calculateAutoQuestionTime(
            currentQ.text,
            currentQ.answers,
            currentQ.difficulty
          );
        } else {
          currentQuestionTimeLimit = currentQ.timeLimit || questionBank?.metadata.defaultTimeLimit || 20;
        }
        
        // Check if all players have answered the current question
        const players = await getPrisma().player.findMany({
          where: { sessionId },
        });
        
        if (players.length > 0) {
          const answersForCurrentQuestion = await getPrisma().playerAnswer.findMany({
            where: {
              playerId: { in: players.map(p => p.id) },
              questionId: currentQ.id,
            },
          });
          
          allPlayersAnswered = answersForCurrentQuestion.length === players.length;
        }
      }
    }

    // Don't send hostToken in response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hostToken: _, ...sessionData } = session;
    return c.json({
      ...sessionData,
      createdAt: session.createdAt.getTime(),
      questionStartedAt: session.questionStartedAt ? session.questionStartedAt.getTime() : null,
      expiresAt: session.expiresAt ? session.expiresAt.getTime() : null,
      currentQuestionTimeLimit, // Add computed time limit for timer sync
      allPlayersAnswered, // Flag to indicate if all players have answered (for auto-advance)
      questions, // Include questions from question bank
      serverTime: Date.now(), // Add server's current time for clock synchronization
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
    const session = await getPrisma().quizSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    await getPrisma().quizSession.delete({ where: { id: sessionId } });

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
    const session = await getPrisma().quizSession.findUnique({
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
    await getPrisma().quizSession.update({
      where: { id: sessionId },
      data: {
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: new Date(),
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
    const session = await getPrisma().quizSession.findUnique({
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

    // Get session questions (respects questionIds and randomOrder)
    const questions = getSessionQuestions(session);
    
    if (questions.length === 0) {
      return c.json({ error: 'No questions available for this session' }, 404);
    }

    const nextIndex = session.currentQuestionIndex + 1;

    // Check if we've reached the end
    if (nextIndex >= questions.length) {
      // End the quiz
      await getPrisma().quizSession.update({
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
    await getPrisma().quizSession.update({
      where: { id: sessionId },
      data: {
        currentQuestionIndex: nextIndex,
        questionStartedAt: new Date(),
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
    const session = await getPrisma().quizSession.findUnique({
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
    await getPrisma().quizSession.update({
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
    const session = await getPrisma().quizSession.findUnique({
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

// Get question statistics (host only)
sessionRoutes.get('/:id/question-stats', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    // Verify session and host token
    const session = await getPrisma().quizSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    // Get question bank for metadata
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank) {
      return c.json({ error: 'Question bank not found' }, 404);
    }

    // Get all player answers for this session
    const allAnswers = await getPrisma().playerAnswer.findMany({
      where: {
        player: {
          sessionId,
        },
      },
    });

    // Aggregate statistics per question (uses session-specific questions)
    const questions = getSessionQuestions(session);
    const questionStats = questions.map((question, index) => {
      const answersForQuestion = allAnswers.filter(
        (answer) => answer.questionId === question.id
      );

      const totalAnswers = answersForQuestion.length;
      const correctAnswers = answersForQuestion.filter((a) => a.isCorrect).length;
      const incorrectAnswers = totalAnswers - correctAnswers;
      const accuracyPercentage =
        totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      // Calculate answer option statistics
      const answerOptions = question.answers.map((option) => {
        // Count how many players selected this answer
        const selectionCount = answersForQuestion.filter((playerAnswer) => {
          const selectedIds = JSON.parse(playerAnswer.selectedAnswerIds);
          return selectedIds.includes(option.id);
        }).length;

        const selectionPercentage = totalAnswers > 0 
          ? Math.round((selectionCount / totalAnswers) * 100) 
          : 0;

        return {
          id: option.id,
          text: option.text,
          isCorrect: question.correctAnswerIds.includes(option.id),
          selectionCount,
          selectionPercentage,
        };
      });

      return {
        questionIndex: index,
        questionId: question.id,
        questionText: question.text,
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        accuracyPercentage,
        difficulty: question.difficulty,
        topics: question.topics || [],
        answerOptions,
      };
    });

    return c.json({ questions: questionStats });
  } catch (error) {
    console.error('Error fetching question statistics:', error);
    return c.json({ error: 'Failed to fetch question statistics' }, 500);
  }
});

export default sessionRoutes;
