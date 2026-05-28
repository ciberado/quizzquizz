import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { generateId, generatePin, calculateAutoQuestionTime } from '@quizzquizz/common';
import { questionBanks } from '../state.js';
import { getSessionQuestions } from '../session-utils.js';
import { authMiddleware } from '../auth/middleware.js';
import { recordSessionStats } from '../session-stats.js';
import { updateDoc, destroySession } from '../session-doc-manager.js';

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
  mode: z.enum(['quiz', 'flashcard']).optional().default('quiz'),
  questionIds: z.array(z.string()).optional(),
  randomOrder: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional().default(true),
  automaticPace: z.boolean().optional(),
  autoQuestionTime: z.boolean().optional(),
  pace: z.enum(['normal', 'calm', 'manual']).optional().default('normal'),
});

/** Read the global question-time multiplier from env (default 1.5 = 50% more than original). */
function getAutoTimeMuliplier(): number {
  const raw = process.env.AUTO_QUESTION_TIME_MULTIPLIER;
  if (!raw) return 1.5;
  const val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? 1.5 : val;
}

// Create a new session
sessionRoutes.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const { questionBankId, mode, questionIds, randomOrder, shuffleAnswers, automaticPace, autoQuestionTime, pace } = c.req.valid('json');
  
  // Derive automaticPace from pace: 'normal' means auto-advance, others don't
  const effectiveAutomaticPace = automaticPace !== undefined ? automaticPace : (pace === 'normal');
  
  // Flashcard sessions start immediately in 'playing' state (no lobby wait)
  const initialStatus = mode === 'flashcard' ? 'playing' : 'lobby';

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
        mode: mode || 'quiz',
        questionBankId,
        questionIds: questionIds ? JSON.stringify(questionIds) : null,
        randomOrder: randomOrder || false,
        shuffleAnswers: shuffleAnswers ?? true, // Default to true if not specified
        automaticPace: effectiveAutomaticPace,
        autoQuestionTime: autoQuestionTime || false,
        pace: pace || 'normal',
        status: initialStatus,
        currentQuestionIndex: -1,
        // createdAt uses @default(now()) in schema
        expiresAt,
      },
    });

    // Pre-load the session questions count for the doc
    const questionBank = questionBanks.get(questionBankId);
    const questions = questionBank?.questions ?? [];

    // Initialize Yjs session doc so clients can connect immediately
    updateDoc(sessionId, {
      status: initialStatus,
      automaticPace: effectiveAutomaticPace,
      pace: pace || 'normal',
      totalQuestions: questions.length,
      mode: mode || 'quiz',
      currentQuestionIndex: -1,
      currentQuestionNumber: 0,
      currentQuestion: null,
      questionStartedAt: null,
      timeLimit: null,
      timerPaused: false,
      timerPausedAt: null,
      allPlayersAnswered: false,
      answeredCount: 0,
      serverTime: Date.now(),
      players: [],
      leaderboard: [],
    });

    return c.json(
      {
        id: sessionId,
        pin,
        hostToken,
        questionBankId,
        mode: mode || 'quiz',
        status: initialStatus,
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
        
        // Use host override if available, otherwise calculate
        if (session.timeLimitOverride !== null) {
          currentQuestionTimeLimit = session.timeLimitOverride;
        } else if (session.autoQuestionTime) {
          currentQuestionTimeLimit = calculateAutoQuestionTime(
            currentQ.text,
            currentQ.answers,
            currentQ.difficulty,
            getAutoTimeMuliplier()
          );
        } else if (session.pace === 'manual') {
          currentQuestionTimeLimit = null; // No timer in manual mode
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
      timerPausedAt: session.timerPausedAt ? session.timerPausedAt.getTime() : null,
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

    // Notify connected clients that the session is gone, then clean up the doc
    destroySession(sessionId);

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

    const now = new Date();
    // Start quiz: move to first question
    await getPrisma().quizSession.update({
      where: { id: sessionId },
      data: {
        status: 'playing',
        currentQuestionIndex: 0,
        questionStartedAt: now,
      },
    });

    // Build session questions to get the first question for the doc
    const startedSession = { ...session, currentQuestionIndex: 0 };
    const questions = getSessionQuestions(startedSession);
    const firstQ = questions[0] ?? null;
    const timeLimit = firstQ
      ? (session.autoQuestionTime
          ? calculateAutoQuestionTime(firstQ.text, firstQ.answers, firstQ.difficulty, getAutoTimeMuliplier())
          : firstQ.timeLimit || questionBank.metadata.defaultTimeLimit || 20)
      : null;

    updateDoc(sessionId, {
      status: 'playing',
      currentQuestionIndex: 0,
      currentQuestionNumber: 1,
      currentQuestion: firstQ
        ? { id: firstQ.id, text: firstQ.text, answers: firstQ.answers, difficulty: firstQ.difficulty, timeLimit }
        : null,
      questionStartedAt: now.getTime(),
      timeLimit,
      timerPaused: false,
      timerPausedAt: null,
      allPlayersAnswered: false,
      answeredCount: 0,
      serverTime: Date.now(),
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

      // Record post-game statistics (non-blocking)
      void recordSessionStats(sessionId);

      updateDoc(sessionId, {
        status: 'finished',
        currentQuestionIndex: -1,
        currentQuestionNumber: questions.length,
        currentQuestion: null,
        questionStartedAt: null,
        timerPaused: false,
        timerPausedAt: null,
        serverTime: Date.now(),
      });

      return c.json({
        message: 'Quiz finished',
        status: 'finished',
      });
    }

    // Move to next question
    const now = new Date();
    await getPrisma().quizSession.update({
      where: { id: sessionId },
      data: {
        currentQuestionIndex: nextIndex,
        questionStartedAt: now,
        timeLimitOverride: null, // Reset host timer adjustments
        timerPausedAt: null,     // Reset pause state
      },
    });

    const nextQ = questions[nextIndex];
    const qBank = questionBanks.get(session.questionBankId);
    const nextTimeLimit = nextQ
      ? (session.autoQuestionTime
          ? calculateAutoQuestionTime(nextQ.text, nextQ.answers, nextQ.difficulty, getAutoTimeMuliplier())
          : session.pace === 'manual'
            ? null
            : nextQ.timeLimit || qBank?.metadata.defaultTimeLimit || 20)
      : null;

    // Count answers for the new question (should be 0, but reset in doc)
    const playerCount = await getPrisma().player.count({ where: { sessionId } });

    updateDoc(sessionId, {
      status: 'playing',
      currentQuestionIndex: nextIndex,
      currentQuestionNumber: nextIndex + 1,
      currentQuestion: nextQ
        ? { id: nextQ.id, text: nextQ.text, answers: nextQ.answers, difficulty: nextQ.difficulty, timeLimit: nextTimeLimit }
        : null,
      questionStartedAt: now.getTime(),
      timeLimit: nextTimeLimit,
      timerPaused: false,
      timerPausedAt: null,
      allPlayersAnswered: playerCount === 0,
      answeredCount: 0,
      serverTime: Date.now(),
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

// Adjust timer for current question (requires host token)
const AdjustTimerSchema = z.object({
  action: z.enum(['add', 'remove', 'end', 'pause', 'resume']),
  seconds: z.number().int().positive().optional(), // Required for add/remove
});

sessionRoutes.post('/:id/adjust-timer', zValidator('json', AdjustTimerSchema), async (c) => {
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

    if (session.status !== 'playing' || session.currentQuestionIndex < 0) {
      return c.json({ error: 'No active question' }, 400);
    }

    const { action, seconds } = c.req.valid('json');

    // Compute current effective time limit
    const questions = getSessionQuestions(session);
    const currentQ = questions[session.currentQuestionIndex];
    if (!currentQ) {
      return c.json({ error: 'Current question not found' }, 404);
    }

    const questionBank = questionBanks.get(session.questionBankId);
    let baseTimeLimit: number;
    if (session.autoQuestionTime) {
      baseTimeLimit = calculateAutoQuestionTime(
        currentQ.text,
        currentQ.answers,
        currentQ.difficulty,
        1.5
      );
    } else {
      baseTimeLimit = currentQ.timeLimit || questionBank?.metadata.defaultTimeLimit || 20;
    }
    const currentTimeLimit = session.timeLimitOverride ?? baseTimeLimit;

    const now = new Date();

    if (action === 'pause') {
      if (session.timerPausedAt) {
        return c.json({ error: 'Timer is already paused' }, 400);
      }
      await getPrisma().quizSession.update({
        where: { id: sessionId },
        data: { timerPausedAt: now },
      });
      updateDoc(sessionId, { timerPaused: true, timerPausedAt: now.getTime(), serverTime: Date.now() });
      return c.json({ message: 'Timer paused', timerPausedAt: now.getTime() });
    }

    if (action === 'resume') {
      if (!session.timerPausedAt) {
        return c.json({ error: 'Timer is not paused' }, 400);
      }
      // Shift questionStartedAt forward by the paused duration so elapsed time stays correct
      const pausedDurationMs = now.getTime() - session.timerPausedAt.getTime();
      const newStartedAt = new Date(
        (session.questionStartedAt?.getTime() ?? now.getTime()) + pausedDurationMs
      );
      await getPrisma().quizSession.update({
        where: { id: sessionId },
        data: {
          timerPausedAt: null,
          questionStartedAt: newStartedAt,
        },
      });
      updateDoc(sessionId, {
        timerPaused: false,
        timerPausedAt: null,
        questionStartedAt: newStartedAt.getTime(),
        serverTime: Date.now(),
      });
      return c.json({ message: 'Timer resumed' });
    }

    if (action === 'end') {
      // Set the time limit to make remaining = 0 based on current elapsed
      const elapsed = session.questionStartedAt
        ? Math.ceil((now.getTime() - session.questionStartedAt.getTime()) / 1000)
        : 0;
      await getPrisma().quizSession.update({
        where: { id: sessionId },
        data: {
          timeLimitOverride: elapsed, // remaining becomes 0
          timerPausedAt: null,
        },
      });
      updateDoc(sessionId, { timeLimit: elapsed, timerPaused: false, timerPausedAt: null, serverTime: Date.now() });
      return c.json({ message: 'Timer ended', timeLimitOverride: elapsed });
    }

    // add or remove seconds
    if (!seconds) {
      return c.json({ error: 'seconds is required for add/remove' }, 400);
    }

    let newTimeLimit: number;
    if (action === 'add') {
      newTimeLimit = currentTimeLimit + seconds;
    } else {
      // For remove: ensure we don't go below elapsed time (would make remaining < 0)
      const elapsed = session.questionStartedAt
        ? Math.ceil((now.getTime() - session.questionStartedAt.getTime()) / 1000)
        : 0;
      newTimeLimit = Math.max(elapsed, currentTimeLimit - seconds);
    }

    await getPrisma().quizSession.update({
      where: { id: sessionId },
      data: {
        timeLimitOverride: newTimeLimit,
        timerPausedAt: null, // Unpause if adjusting while paused
      },
    });
    updateDoc(sessionId, { timeLimit: newTimeLimit, timerPaused: false, timerPausedAt: null, serverTime: Date.now() });
    return c.json({ message: `Timer adjusted`, timeLimitOverride: newTimeLimit });
  } catch (error) {
    console.error('Error adjusting timer:', error);
    return c.json({ error: 'Failed to adjust timer' }, 500);
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

    // Record post-game statistics (non-blocking)
    void recordSessionStats(sessionId);

    updateDoc(sessionId, {
      status: 'finished',
      currentQuestionIndex: -1,
      currentQuestion: null,
      questionStartedAt: null,
      timerPaused: false,
      timerPausedAt: null,
      serverTime: Date.now(),
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

// Get flashcard session state (returns all questions for client-side Leitner engine)
sessionRoutes.get('/:id/flashcard-state', async (c) => {
  const sessionId = c.req.param('id');

  try {
    const session = await getPrisma().quizSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.mode !== 'flashcard') {
      return c.json({ error: 'Session is not a flashcard session' }, 400);
    }

    const questions = getSessionQuestions(session);
    const questionBank = questionBanks.get(session.questionBankId);

    return c.json({
      sessionId: session.id,
      pin: session.pin,
      status: session.status,
      mode: session.mode,
      questionBankId: session.questionBankId,
      questionBankName: questionBank?.metadata.name || session.questionBankId,
      questions,
      totalQuestions: questions.length,
      createdAt: session.createdAt.getTime(),
    });
  } catch (error) {
    console.error('Error fetching flashcard state:', error);
    return c.json({ error: 'Failed to fetch flashcard state' }, 500);
  }
});

export default sessionRoutes;
