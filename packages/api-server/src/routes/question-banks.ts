import { Hono } from 'hono';
import { questionBanks } from '../state.js';
import { loadQuestionBanks } from '@quizzquizz/question-bank';
import { getPrisma } from '../db/index.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const questionBankRoutes = new Hono();

// List all available question banks
questionBankRoutes.get('/', (c) => {
  const banks = Array.from(questionBanks.values()).map((bank) => ({
    id: bank.id,
    name: bank.metadata.name,
    description: bank.metadata.description,
    topics: bank.metadata.topics,
    questionCount: bank.questions.length,
  }));

  return c.json({ questionBanks: banks });
});

// Get a specific question bank with questions
questionBankRoutes.get('/:id', (c) => {
  const bankId = c.req.param('id');
  const bank = questionBanks.get(bankId);

  if (!bank) {
    return c.json({ error: 'Question bank not found' }, 404);
  }

  return c.json(bank);
});

// Get questions from a bank with filtering and pagination
questionBankRoutes.get('/:id/questions', (c) => {
  const bankId = c.req.param('id');
  const bank = questionBanks.get(bankId);

  if (!bank) {
    return c.json({ error: 'Question bank not found' }, 404);
  }

  // Parse query parameters
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const difficulty = url.searchParams.get('difficulty'); // 'easy', 'medium', 'hard', or comma-separated
  const topic = url.searchParams.get('topic'); // single topic or comma-separated
  const tag = url.searchParams.get('tag'); // single tag or comma-separated

  // Filter questions
  let filteredQuestions = [...bank.questions];

  // Filter by difficulty
  if (difficulty) {
    const difficulties = difficulty.split(',').map((d) => d.trim().toLowerCase());
    filteredQuestions = filteredQuestions.filter((q) =>
      difficulties.includes(q.difficulty)
    );
  }

  // Filter by topic
  if (topic) {
    const topics = topic.split(',').map((t) => t.trim());
    filteredQuestions = filteredQuestions.filter((q) =>
      topics.some((t) => q.topics.includes(t))
    );
  }

  // Filter by tag
  if (tag) {
    const tags = tag.split(',').map((t) => t.trim());
    filteredQuestions = filteredQuestions.filter((q) =>
      tags.some((t) => q.tags.includes(t))
    );
  }

  // Calculate pagination
  const totalQuestions = filteredQuestions.length;
  const totalPages = Math.ceil(totalQuestions / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

  return c.json({
    questions: paginatedQuestions,
    pagination: {
      page,
      limit,
      totalQuestions,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    filters: {
      difficulty: difficulty || null,
      topic: topic || null,
      tag: tag || null,
    },
  });
});

/**
 * GET /api/question-banks/:id/stats
 * Global question statistics for all questions in a bank.
 * Returns empirical difficulty, answer selection distribution, and response time data.
 * Useful for question bank authors to see real-world performance data.
 */
questionBankRoutes.get('/:id/stats', async (c) => {
  const bankId = c.req.param('id');
  const bank = questionBanks.get(bankId);

  if (!bank) {
    return c.json({ error: 'Question bank not found' }, 404);
  }

  try {
    const prisma = getPrisma();

    // Load global stats for all questions in this bank
    const globalStats = await prisma.questionGlobalStat.findMany({
      where: { questionBankId: bankId },
    });

    const statsMap = new Map(globalStats.map((s) => [s.questionId, s]));

    const questions = bank.questions.map((question) => {
      const stat = statsMap.get(question.id);

      // Parse answerSelections JSON
      let answerSelections: Record<string, number> = {};
      try {
        answerSelections = stat ? JSON.parse(stat.answerSelections) : {};
      } catch {
        answerSelections = {};
      }

      // Detect dominant distractors: wrong answers selected more than the correct answer
      const correctIds = new Set(question.correctAnswerIds);
      const correctSelections = question.correctAnswerIds.reduce(
        (sum, id) => sum + (answerSelections[id] ?? 0),
        0
      );
      const dominantDistractors = question.answers
        .filter(
          (a) =>
            !correctIds.has(a.id) && (answerSelections[a.id] ?? 0) > correctSelections
        )
        .map((a) => a.id);

      // Empirical difficulty divergence from declared difficulty
      const declaredDifficultyScore =
        question.difficulty === 'easy' ? 0.8 : question.difficulty === 'medium' ? 0.5 : 0.2;
      const divergence =
        stat?.empiricalDifficulty != null
          ? Math.abs(stat.empiricalDifficulty - declaredDifficultyScore)
          : null;

      return {
        questionId: question.id,
        questionText: question.text,
        difficulty: question.difficulty,
        topics: question.topics,
        tags: question.tags,
        // Global stats (null if question has never appeared)
        timesAppeared: stat?.timesAppeared ?? 0,
        timesAnswered: stat?.timesAnswered ?? 0,
        timesCorrect: stat?.timesCorrect ?? 0,
        averageResponseMs: stat?.averageResponseMs ?? 0,
        averageScore: stat?.averageScore ?? 0,
        empiricalDifficulty: stat?.empiricalDifficulty ?? null,
        answerSelections,
        // Derived
        dominantDistractors,
        difficultyDivergence: divergence !== null ? Math.round(divergence * 1000) / 1000 : null,
        flagDifficultyMismatch: divergence !== null && divergence > 0.3,
        updatedAt: stat?.updatedAt.getTime() ?? null,
      };
    });

    return c.json({
      questionBankId: bankId,
      questionBankName: bank.metadata.name,
      totalQuestions: bank.questions.length,
      questions,
    });
  } catch (error) {
    console.error('Error fetching question bank stats:', error);
    return c.json({ error: 'Failed to fetch question bank stats' }, 500);
  }
});

// Reload question banks from disk (useful for hot-reloading during development)
questionBankRoutes.post('/reload', (c) => {
  try {
    // Clear existing question banks
    questionBanks.clear();

    // Reload from disk
    const questionBanksPath = process.env.QUESTION_BANKS_PATH || 
      join(__dirname, '../../../../question-banks');
    
    console.log(`🔄 Reloading question banks from: ${questionBanksPath}`);
    const banks = loadQuestionBanks(questionBanksPath);
    
    for (const bank of banks) {
      questionBanks.set(bank.id, bank);
      console.log(`   ✓ Reloaded: ${bank.metadata.name} (${bank.questions.length} questions)`);
    }
    
    console.log(`✅ Reloaded ${banks.length} question bank(s)`);

    return c.json({
      success: true,
      message: `Reloaded ${banks.length} question bank(s)`,
      banks: banks.map(b => ({
        id: b.id,
        name: b.metadata.name,
        questionCount: b.questions.length,
      })),
    });
  } catch (error) {
    console.error('❌ Error reloading question banks:', error);
    return c.json({ 
      error: 'Failed to reload question banks',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export default questionBankRoutes;
