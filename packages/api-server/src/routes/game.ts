import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getPrisma } from '../db';
import { 
  generateId, 
  calculateScore, 
  isAnswerCorrect,
  SubmitAnswerRequestSchema 
} from '@quizzquizz/common';
import { questionBanks } from '../state';

const gameRoutes = new Hono();

// Get current game state (for players to poll)
gameRoutes.get('/:sessionId/state', async (c) => {
  const sessionId = c.req.param('sessionId');
  const playerId = c.req.header('X-Player-Id');

  if (!playerId) {
    return c.json({ error: 'Player ID required' }, 401);
  }

  try {
    // Verify session exists
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Verify player is in this session
    const player = await getPrisma().player.findFirst({
      where: {
        id: playerId,
        sessionId,
      },
    });

    if (!player) {
      return c.json({ error: 'Player not found in session' }, 403);
    }

    // Get question bank
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank) {
      return c.json({ error: 'Question bank not found' }, 404);
    }

    // Get current question (if any)
    let currentQuestion = null;
    let questionStartedAt = null;
    let timeLimit = null;
    
    if (session.status === 'playing' && session.currentQuestionIndex >= 0) {
      currentQuestion = questionBank.questions[session.currentQuestionIndex];
      
      if (currentQuestion) {
        timeLimit = currentQuestion.timeLimit || questionBank.metadata.defaultTimeLimit;
        questionStartedAt = session.questionStartedAt ? Number(session.questionStartedAt) : null;
      }
    }

    return c.json({
      status: session.status,
      currentQuestion: currentQuestion ? {
        id: currentQuestion.id,
        text: currentQuestion.text,
        answers: currentQuestion.answers,
        difficulty: currentQuestion.difficulty,
        timeLimit: currentQuestion.timeLimit || questionBank.metadata.defaultTimeLimit,
      } : null,
      questionStartedAt,
      timeLimit,
      totalQuestions: questionBank.questions.length,
      currentQuestionNumber: session.currentQuestionIndex + 1,
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    return c.json({ error: 'Failed to fetch game state' }, 500);
  }
});

// Submit an answer
gameRoutes.post('/:sessionId/answer', zValidator('json', SubmitAnswerRequestSchema), async (c) => {
  const sessionId = c.req.param('sessionId');
  const playerId = c.req.header('X-Player-Id');
  const { questionId, selectedAnswerIds } = c.req.valid('json');

  if (!playerId) {
    return c.json({ error: 'Player ID required' }, 401);
  }

  try {
    // Verify session exists and is playing
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'playing') {
      return c.json({ error: 'Session is not currently playing' }, 400);
    }

    if (session.currentQuestionIndex < 0) {
      return c.json({ error: 'No question is currently active' }, 400);
    }

    // Verify player is in this session
    const player = await getPrisma().player.findFirst({
      where: {
        id: playerId,
        sessionId,
      },
    });

    if (!player) {
      return c.json({ error: 'Player not found in session' }, 403);
    }

    // Check if player already answered this question
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank) {
      return c.json({ error: 'Question bank not found' }, 404);
    }

    const currentQuestion = questionBank.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      return c.json({ error: 'Question not found' }, 404);
    }

    // Validate client's questionId matches current question
    if (questionId !== currentQuestion.id) {
      return c.json({ error: 'Question ID does not match current question' }, 400);
    }

    const existingAnswer = await getPrisma().playerAnswer.findFirst({
      where: {
        playerId,
        questionId: currentQuestion.id,
      },
    });

    if (existingAnswer) {
      return c.json({ error: 'Answer already submitted for this question' }, 400);
    }

    // Calculate score
    const isCorrect = isAnswerCorrect(selectedAnswerIds, currentQuestion.correctAnswerIds);
    const timeLimit = currentQuestion.timeLimit || questionBank.metadata.defaultTimeLimit;
    const timeTaken = session.questionStartedAt
      ? (Date.now() - Number(session.questionStartedAt)) / 1000
      : timeLimit;
    const score = calculateScore(isCorrect, timeTaken, timeLimit);

    // Store answer
    const answerId = generateId();
    await getPrisma().playerAnswer.create({
      data: {
        id: answerId,
        playerId,
        questionId: currentQuestion.id,
        selectedAnswerIds: JSON.stringify(selectedAnswerIds),
        isCorrect,
        submittedAt: BigInt(Date.now()),
        score,
      },
    });

    // Update player score
    const newScore = player.score + score;
    await getPrisma().player.update({
      where: { id: playerId },
      data: { score: newScore },
    });

    return c.json({
      correct: isCorrect,
      score,
      correctAnswerIds: currentQuestion.correctAnswerIds,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return c.json({ error: 'Failed to submit answer' }, 500);
  }
});

export default gameRoutes;
