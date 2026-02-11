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

// Get player's complete game review (post-game)
gameRoutes.get('/:sessionId/players/:playerId/review', async (c) => {
  const sessionId = c.req.param('sessionId');
  const playerId = c.req.param('playerId');
  const requestingPlayerId = c.req.header('X-Player-Id');

  // Verify the requesting player matches the playerId in the URL
  if (!requestingPlayerId || requestingPlayerId !== playerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Verify session exists and is finished
    const session = await getPrisma().session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Allow review for 'finished' sessions or 'playing' (for testing)
    if (session.status !== 'finished' && session.status !== 'playing') {
      return c.json({ error: 'Game review only available after game ends' }, 400);
    }

    // Verify player exists in session
    const player = await getPrisma().player.findFirst({
      where: {
        id: playerId,
        sessionId,
      },
    });

    if (!player) {
      return c.json({ error: 'Player not found in session' }, 404);
    }

    // Get question bank
    const questionBank = questionBanks.get(session.questionBankId);
    if (!questionBank) {
      return c.json({ error: 'Question bank not found' }, 404);
    }

    // Get all player answers for this session
    const playerAnswers = await getPrisma().playerAnswer.findMany({
      where: {
        playerId,
      },
    });

    // Build question review items
    const questionReviewItems = questionBank.questions.map((question) => {
      const playerAnswer = playerAnswers.find((pa) => pa.questionId === question.id);
      
      return {
        questionId: question.id,
        questionText: question.text,
        answers: question.answers,
        correctAnswerIds: question.correctAnswerIds,
        playerSelectedAnswerIds: playerAnswer 
          ? JSON.parse(playerAnswer.selectedAnswerIds as string) 
          : [],
        isCorrect: playerAnswer?.isCorrect || false,
        pointsEarned: playerAnswer?.score || 0,
      };
    });

    // Get full leaderboard for rank calculation
    const allPlayers = await getPrisma().player.findMany({
      where: { sessionId },
      orderBy: [
        { score: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    // Calculate rankings
    let currentRank = 1;
    let previousScore: number | null = null;
    const leaderboardWithRanks = allPlayers.map((p, index) => {
      if (previousScore !== null && p.score < previousScore) {
        currentRank = index + 1;
      }
      previousScore = p.score;
      return {
        playerId: p.id,
        nickname: p.nickname,
        score: p.score,
        rank: currentRank,
      };
    });

    // Find current player's position
    const playerIndex = leaderboardWithRanks.findIndex((p) => p.playerId === playerId);
    const currentPlayerEntry = leaderboardWithRanks[playerIndex];

    // Build relative leaderboard (1 above + current + 1 below)
    const relativeLeaderboard = [];
    
    if (playerIndex > 0) {
      // Add player above
      const playerAbove = leaderboardWithRanks[playerIndex - 1];
      relativeLeaderboard.push({
        ...playerAbove,
        isCurrentPlayer: false,
      });
    }
    
    // Add current player
    relativeLeaderboard.push({
      ...currentPlayerEntry,
      isCurrentPlayer: true,
    });
    
    if (playerIndex < leaderboardWithRanks.length - 1) {
      // Add player below
      const playerBelow = leaderboardWithRanks[playerIndex + 1];
      relativeLeaderboard.push({
        ...playerBelow,
        isCurrentPlayer: false,
      });
    }

    // Calculate stats
    const correctAnswers = questionReviewItems.filter((q) => q.isCorrect).length;
    const totalQuestions = questionBank.questions.length;
    const accuracyPercentage = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;

    return c.json({
      stats: {
        totalQuestions,
        correctAnswers,
        totalScore: player.score,
        rank: currentPlayerEntry.rank,
        totalPlayers: allPlayers.length,
        accuracyPercentage,
      },
      relativeLeaderboard,
      questions: questionReviewItems,
    });
  } catch (error) {
    console.error('Error fetching player review:', error);
    return c.json({ error: 'Failed to fetch player review' }, 500);
  }
});

export default gameRoutes;