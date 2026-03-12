import { Hono } from 'hono';
import { questionBanks, getBankTree } from '../state.js';
import { getPrisma } from '../db/index.js';
import { reloadQuestionBanks } from '../reload-banks.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const questionBankRoutes = new Hono();

// ─── Helper: build question-stats response for a bank ────────────────────────

async function buildBankStatsResponse(bankId: string) {
  const bank = questionBanks.get(bankId);
  if (!bank) return null;

  const prisma = getPrisma();
  const globalStats = await prisma.questionGlobalStat.findMany({
    where: { questionBankId: bankId },
  });
  const statsMap = new Map(globalStats.map((s) => [s.questionId, s]));

  const questions = bank.questions.map((question) => {
    const stat = statsMap.get(question.id);
    let answerSelections: Record<string, number> = {};
    try {
      answerSelections = stat ? JSON.parse(stat.answerSelections) : {};
    } catch {
      answerSelections = {};
    }
    const correctIds = new Set(question.correctAnswerIds);
    const correctSelections = question.correctAnswerIds.reduce(
      (sum, id) => sum + (answerSelections[id] ?? 0), 0,
    );
    const dominantDistractors = question.answers
      .filter((a) => !correctIds.has(a.id) && (answerSelections[a.id] ?? 0) > correctSelections)
      .map((a) => a.id);
    const declaredScore =
      question.difficulty === 'easy' ? 0.8 : question.difficulty === 'medium' ? 0.5 : 0.2;
    const divergence =
      stat?.empiricalDifficulty != null
        ? Math.abs(stat.empiricalDifficulty - declaredScore)
        : null;
    return {
      questionId: question.id,
      questionText: question.text,
      difficulty: question.difficulty,
      topics: question.topics,
      tags: question.tags,
      timesAppeared: stat?.timesAppeared ?? 0,
      timesAnswered: stat?.timesAnswered ?? 0,
      timesCorrect: stat?.timesCorrect ?? 0,
      averageResponseMs: stat?.averageResponseMs ?? 0,
      averageScore: stat?.averageScore ?? 0,
      empiricalDifficulty: stat?.empiricalDifficulty ?? null,
      answerSelections,
      dominantDistractors,
      difficultyDivergence: divergence !== null ? Math.round(divergence * 1000) / 1000 : null,
      flagDifficultyMismatch: divergence !== null && divergence > 0.3,
      updatedAt: stat?.updatedAt.getTime() ?? null,
    };
  });

  return {
    questionBankId: bankId,
    questionBankName: bank.metadata.name,
    totalQuestions: bank.questions.length,
    questions,
  };
}

// ─── Helper: build paginated questions response ───────────────────────────────

function buildQuestionsResponse(bankId: string, query: Record<string, string | undefined>) {
  const bank = questionBanks.get(bankId);
  if (!bank) return null;

  const page = parseInt(query['page'] || '1', 10);
  const limit = parseInt(query['limit'] || '50', 10);
  const difficulty = query['difficulty'] ?? null;
  const topic = query['topic'] ?? null;
  const tag = query['tag'] ?? null;

  let filtered = [...bank.questions];
  if (difficulty) {
    const diffs = difficulty.split(',').map((d) => d.trim().toLowerCase());
    filtered = filtered.filter((q) => diffs.includes(q.difficulty));
  }
  if (topic) {
    const topics = topic.split(',').map((t) => t.trim());
    filtered = filtered.filter((q) => topics.some((t) => q.topics.includes(t)));
  }
  if (tag) {
    const tags = tag.split(',').map((t) => t.trim());
    filtered = filtered.filter((q) => tags.some((t) => q.tags.includes(t)));
  }

  const totalQuestions = filtered.length;
  const totalPages = Math.ceil(totalQuestions / limit);
  const start = (page - 1) * limit;
  return {
    questions: filtered.slice(start, start + limit),
    pagination: { page, limit, totalQuestions, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    filters: { difficulty, topic, tag },
  };
}

// ─── Routes (fixed paths must come before wildcard :id) ─────────────────────

/**
 * GET /api/question-banks
 * Returns the full folder tree including nested folders and bank summaries.
 */
questionBankRoutes.get('/', (c) => {
  return c.json({ tree: getBankTree() });
});

/**
 * GET /api/question-banks/bank?id=<bank-id>
 * Returns the full QuestionBank object (with questions) for the given id.
 */
questionBankRoutes.get('/bank', (c) => {
  const bankId = new URL(c.req.url).searchParams.get('id');
  if (!bankId) return c.json({ error: 'Missing required query param: id' }, 400);
  const bank = questionBanks.get(bankId);
  if (!bank) return c.json({ error: 'Question bank not found' }, 404);
  return c.json(bank);
});

/**
 * GET /api/question-banks/questions?bankId=<bank-id>&page=&limit=&difficulty=&topic=&tag=
 * Questions from a bank with filtering and pagination.
 */
questionBankRoutes.get('/questions', (c) => {
  const url = new URL(c.req.url);
  const bankId = url.searchParams.get('bankId');
  if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<string, string | undefined>;
  const result = buildQuestionsResponse(bankId, query);
  if (!result) return c.json({ error: 'Question bank not found' }, 404);
  return c.json(result);
});

/**
 * GET /api/question-banks/stats?bankId=<bank-id>
 * Global question statistics for all questions in a bank.
 */
questionBankRoutes.get('/stats', async (c) => {
  const bankId = new URL(c.req.url).searchParams.get('bankId');
  if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);
  try {
    const result = await buildBankStatsResponse(bankId);
    if (!result) return c.json({ error: 'Question bank not found' }, 404);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching question bank stats:', error);
    return c.json({ error: 'Failed to fetch question bank stats' }, 500);
  }
});

/**
 * POST /api/question-banks/reload
 * Hot-reload question banks from disk (development / ops convenience).
 */
questionBankRoutes.post('/reload', (c) => {
  try {
    const questionBanksPath =
      process.env.QUESTION_BANKS_PATH ||
      join(__dirname, '../../../../question-banks');
    console.log(`🔄 Reloading question banks from: ${questionBanksPath}`);
    const result = reloadQuestionBanks(questionBanksPath);
    return c.json({
      success: true,
      message: `Reloaded ${result.count} question bank(s)`,
      banks: result.banks,
    });
  } catch (error) {
    console.error('❌ Error reloading question banks:', error);
    return c.json({
      error: 'Failed to reload question banks',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// ─── Legacy routes (backward compat \u2014 flat/no-slash ids only) ─────────────────

/** @deprecated Use GET /bank?id= instead */
questionBankRoutes.get('/:id', (c) => {
  const bankId = c.req.param('id');
  const bank = questionBanks.get(bankId);
  if (!bank) return c.json({ error: 'Question bank not found' }, 404);
  return c.json(bank);
});

/** @deprecated Use GET /questions?bankId= instead */
questionBankRoutes.get('/:id/questions', (c) => {
  const bankId = c.req.param('id');
  const url = new URL(c.req.url);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<string, string | undefined>;
  const result = buildQuestionsResponse(bankId, query);
  if (!result) return c.json({ error: 'Question bank not found' }, 404);
  return c.json(result);
});

/** @deprecated Use GET /stats?bankId= instead */
questionBankRoutes.get('/:id/stats', async (c) => {
  const bankId = c.req.param('id');
  try {
    const result = await buildBankStatsResponse(bankId);
    if (!result) return c.json({ error: 'Question bank not found' }, 404);
    return c.json(result);
  } catch (error) {
    console.error('Error fetching question bank stats:', error);
    return c.json({ error: 'Failed to fetch question bank stats' }, 500);
  }
});

export default questionBankRoutes;
