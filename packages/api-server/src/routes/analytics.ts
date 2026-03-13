/**
 * Analytics API routes — /api/analytics/*
 * Requires authentication for all endpoints.
 * Authorization checks are performed per-endpoint.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { authMiddleware, requireAuth } from '../auth/middleware.js';
import { questionBanks } from '../state.js';
import {
  loadSessionAnswers,
  loadSessionPlayers,
  loadBankGlobalStats,
  loadHostedSessions,
  loadPlayerStats,
  loadUserQuestionStats,
  buildSessionReport,
  buildBankHealthReport,
  buildEngagementReport,
  buildComparativeReport,
  buildPlayerDashboard,
  buildAccuracyTrend,
  buildWeakTopics,
  buildResponseProfile,
  buildPracticeReport,
  buildGlobalComparison,
} from '@quizzquizz/analytics';
import type { AnalyticsPrismaClient } from '@quizzquizz/analytics';

// Simple TTL cache using a Map — no external deps (avoids npm hoisting issues
// where lru-cache 11.x can't be hoisted because lru-cache 10.x occupies the
// root node_modules slot for a transitive dependency).
class TtlCache<K, V> {
  private map = new Map<K, { value: V; expires: number }>();
  constructor(private maxEntries: number, private ttlMs: number) {}
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) { this.map.delete(key); return undefined; }
    return entry.value;
  }
  set(key: K, value: V): void {
    // Evict oldest entries when at capacity
    if (this.map.size >= this.maxEntries) {
      const first = this.map.keys().next().value!;
      this.map.delete(first);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

type Variables = {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  } | null;
};

const analyticsRoutes = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
analyticsRoutes.use('*', authMiddleware);

// ─── In-memory LRU cache (30-second TTL) ─────────────────────────────────────

const cache = new TtlCache<string, object>(200, 30 * 1000);

function cacheKey(endpoint: string, userId: string, params: Record<string, string>): string {
  return `${endpoint}:${userId}:${JSON.stringify(params)}`;
}

// ─── Helper: get typed prisma client ─────────────────────────────────────────

function getDb(): AnalyticsPrismaClient {
  return getPrisma() as unknown as AnalyticsPrismaClient;
}

// ─── Helper: build question metadata maps from loaded question banks ──────────

function buildQuestionMetadataMaps(bankId: string) {
  const bank = questionBanks.get(bankId);
  if (!bank) return { topics: {}, difficulties: {}, correctIds: {} };

  const topics: Record<string, string[]> = {};
  const difficulties: Record<string, string> = {};
  const correctIds: Record<string, string[]> = {};

  for (const q of bank.questions) {
    topics[q.id] = q.topics ?? [];
    difficulties[q.id] = q.difficulty ?? 'medium';
    correctIds[q.id] = q.correctAnswerIds ?? [];
  }

  return { topics, difficulties, correctIds };
}

// ─── Host: Session Report ─────────────────────────────────────────────────────

analyticsRoutes.get('/sessions/:id/report', requireAuth, async (c) => {
  const user = c.get('user')!;
  const sessionId = c.req.param('id') ?? '';
  const db = getDb();

  // Ownership check: user must have hosted this session
  const prisma = getPrisma();
  const hosted = await prisma.hostedSession.findFirst({
    where: { sessionId, userId: user.id },
  });
  if (!hosted) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const key = cacheKey('session-report', user.id, { sessionId });
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  const [answers, players] = await Promise.all([
    loadSessionAnswers(db, sessionId),
    loadSessionPlayers(db, sessionId),
  ]);

  const report = buildSessionReport(sessionId, answers, players);
  cache.set(key, report);
  return c.json(report);
});

// ─── Host: Bank Health ────────────────────────────────────────────────────────

analyticsRoutes.get(
  '/banks/:id/health',
  requireAuth,
  zValidator('query', z.object({ limit: z.string().optional() })),
  async (c) => {
    const user = c.get('user')!;
    const bankId = c.req.param('id');
    const db = getDb();

    // Ownership check: user must have hosted at least one session with this bank
    const prisma = getPrisma();
    const hasHosted = await prisma.hostedSession.findFirst({
      where: { questionBankId: bankId, userId: user.id },
    });
    if (!hasHosted) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const key = cacheKey('bank-health', user.id, { bankId });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const stats = await loadBankGlobalStats(db, bankId);
    const { difficulties, correctIds } = buildQuestionMetadataMaps(bankId);
    const report = buildBankHealthReport(bankId, stats, difficulties, correctIds);

    cache.set(key, report);
    return c.json(report);
  },
);

// ─── Host: Engagement ─────────────────────────────────────────────────────────

analyticsRoutes.get(
  '/banks/:id/engagement',
  requireAuth,
  zValidator('query', z.object({ range: z.enum(['day', 'week', 'month']).optional() })),
  async (c) => {
    const user = c.get('user')!;
    const bankId = c.req.param('id');
    const range = (c.req.query('range') ?? 'week') as 'day' | 'week' | 'month';
    const db = getDb();

    // Ownership check
    const prisma = getPrisma();
    const hasHosted = await prisma.hostedSession.findFirst({
      where: { questionBankId: bankId, userId: user.id },
    });
    if (!hasHosted) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const key = cacheKey('engagement', user.id, { bankId, range });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const sessions = await loadHostedSessions(db, user.id, bankId);

    // Compute per-session accuracy from PlayerStat records
    const sessionIds = sessions.map((s) => s.sessionId);
    const playerStats = sessionIds.length
      ? await prisma.playerStat.findMany({
          where: { sessionId: { in: sessionIds } },
        })
      : [];

    const sessionAccuracies: Record<string, number> = {};
    const bySession = new Map<string, typeof playerStats>();
    for (const ps of playerStats) {
      const arr = bySession.get(ps.sessionId) ?? [];
      arr.push(ps);
      bySession.set(ps.sessionId, arr);
    }
    for (const [sid, stats] of bySession.entries()) {
      const totalQ = stats.reduce((s, p) => s + p.totalQuestions, 0);
      const totalC = stats.reduce((s, p) => s + p.correctAnswers, 0);
      sessionAccuracies[sid] = totalQ > 0 ? totalC / totalQ : 0;
    }

    const report = buildEngagementReport(bankId, sessions, range, sessionAccuracies);
    cache.set(key, report);
    return c.json(report);
  },
);

// ─── Host: Comparative Analysis ───────────────────────────────────────────────

const compareSchema = z.object({
  sessionA: z.string().min(1),
  sessionB: z.string().min(1),
});

analyticsRoutes.get(
  '/sessions/compare',
  requireAuth,
  zValidator('query', compareSchema),
  async (c) => {
    const user = c.get('user')!;
    const { sessionA, sessionB } = c.req.valid('query');
    const db = getDb();
    const prisma = getPrisma();

    // Ownership check: user must own both sessions
    const [hostedA, hostedB] = await Promise.all([
      prisma.hostedSession.findFirst({ where: { sessionId: sessionA, userId: user.id } }),
      prisma.hostedSession.findFirst({ where: { sessionId: sessionB, userId: user.id } }),
    ]);
    if (!hostedA || !hostedB) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const key = cacheKey('compare', user.id, { sessionA, sessionB });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const [answersA, playersA, answersB, playersB] = await Promise.all([
      loadSessionAnswers(db, sessionA),
      loadSessionPlayers(db, sessionA),
      loadSessionAnswers(db, sessionB),
      loadSessionPlayers(db, sessionB),
    ]);

    const report = buildComparativeReport(
      sessionA,
      answersA,
      playersA.length,
      sessionB,
      answersB,
      playersB.length,
    );
    cache.set(key, report);
    return c.json(report);
  },
);

// ─── Player: Dashboard ────────────────────────────────────────────────────────

analyticsRoutes.get('/me/dashboard', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb();

  const key = cacheKey('dashboard', user.id, {});
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  const stats = await loadPlayerStats(db, user.id);
  const report = buildPlayerDashboard(user.id, stats);
  cache.set(key, report);
  return c.json(report);
});

// ─── Player: Accuracy Trend ───────────────────────────────────────────────────

analyticsRoutes.get('/me/accuracy-trend', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb();

  const key = cacheKey('accuracy-trend', user.id, {});
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  const stats = await loadPlayerStats(db, user.id);
  const report = buildAccuracyTrend(user.id, stats);
  cache.set(key, report);
  return c.json(report);
});

// ─── Player: Weak Topics ──────────────────────────────────────────────────────

analyticsRoutes.get(
  '/me/weak-topics',
  requireAuth,
  zValidator('query', z.object({ bankId: z.string().optional() })),
  async (c) => {
    const user = c.get('user')!;
    const bankId = c.req.query('bankId');
    const db = getDb();

    const key = cacheKey('weak-topics', user.id, { bankId: bankId ?? '' });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const stats = await loadUserQuestionStats(db, user.id, bankId);

    // Build topic map from loaded banks
    const topicMap: Record<string, string[]> = {};
    const banksToCheck = bankId ? [bankId] : Array.from(questionBanks.keys());
    for (const bid of banksToCheck) {
      const bank = questionBanks.get(bid);
      if (!bank) continue;
      for (const q of bank.questions) {
        if (q.topics?.length) topicMap[q.id] = q.topics;
      }
    }

    const report = buildWeakTopics(user.id, stats, topicMap, bankId ?? null);
    cache.set(key, report);
    return c.json(report);
  },
);

// ─── Player: Response Profile ─────────────────────────────────────────────────

analyticsRoutes.get('/me/response-profile', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb();

  const key = cacheKey('response-profile', user.id, {});
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  const stats = await loadUserQuestionStats(db, user.id);

  // Build difficulty map from loaded banks
  const diffMap: Record<string, string> = {};
  for (const bank of questionBanks.values()) {
    for (const q of bank.questions) {
      if (q.difficulty) diffMap[q.id] = q.difficulty;
    }
  }

  const report = buildResponseProfile(user.id, stats, diffMap);
  cache.set(key, report);
  return c.json(report);
});

// ─── Player: Practice Recommendations ────────────────────────────────────────

analyticsRoutes.get(
  '/me/practice',
  requireAuth,
  zValidator(
    'query',
    z.object({
      bankId: z.string().optional(),
      limit: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')!;
    const bankId = c.req.query('bankId');
    const limit = parseInt(c.req.query('limit') ?? '20', 10);
    const db = getDb();

    const key = cacheKey('practice', user.id, { bankId: bankId ?? '', limit: String(limit) });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const stats = await loadUserQuestionStats(db, user.id, bankId);
    const report = buildPracticeReport(user.id, stats, bankId ?? null, limit);
    cache.set(key, report);
    return c.json(report);
  },
);

// ─── Player: Session History ──────────────────────────────────────────────────

analyticsRoutes.get('/me/sessions', requireAuth, async (c) => {
  const user = c.get('user')!;
  const prisma = getPrisma();

  const key = cacheKey('session-history', user.id, {});
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  const stats = await prisma.playerStat.findMany({
    where: { userId: user.id },
    orderBy: { playedAt: 'desc' },
  });

  const sessionIds = stats.map((s) => s.sessionId);

  // Enrich with bank info from HostedSession
  const hostedSessions = sessionIds.length
    ? await prisma.hostedSession.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { sessionId: true, questionBankId: true, questionBankName: true },
      })
    : [];

  const bankInfoBySession = new Map(
    hostedSessions.map((h) => [
      h.sessionId,
      { questionBankId: h.questionBankId, questionBankName: h.questionBankName },
    ]),
  );

  // For sessions without HostedSession, fall back to QuizSession (if not expired)
  const missingSessions = sessionIds.filter((id) => !bankInfoBySession.has(id));
  if (missingSessions.length > 0) {
    const quizSessions = await prisma.quizSession.findMany({
      where: { id: { in: missingSessions } },
      select: { id: true, questionBankId: true },
    });
    for (const qs of quizSessions) {
      const bank = questionBanks.get(qs.questionBankId);
      bankInfoBySession.set(qs.id, {
        questionBankId: qs.questionBankId,
        questionBankName: bank?.metadata.name ?? qs.questionBankId,
      });
    }
  }

  const sessions = stats.map((s) => {
    const bankInfo = bankInfoBySession.get(s.sessionId);
    return {
      sessionId: s.sessionId,
      nickname: s.nickname,
      questionBankId: bankInfo?.questionBankId ?? null,
      questionBankName: bankInfo?.questionBankName ?? null,
      finalScore: s.finalScore,
      finalRank: s.finalRank,
      correctAnswers: s.correctAnswers,
      totalQuestions: s.totalQuestions,
      accuracy: s.totalQuestions > 0 ? s.correctAnswers / s.totalQuestions : 0,
      averageTime: s.averageTime,
      playedAt: s.playedAt.toISOString(),
    };
  });

  const result = { sessions };
  cache.set(key, result);
  return c.json(result);
});

// ─── Player: Session Detail ───────────────────────────────────────────────────

analyticsRoutes.get('/me/sessions/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const sessionId = c.req.param('id') ?? '';
  const prisma = getPrisma();

  const key = cacheKey('session-detail', user.id, { sessionId });
  const cached = cache.get(key);
  if (cached) return c.json(cached);

  // Ownership: user must have a PlayerStat for this session
  const stat = await prisma.playerStat.findFirst({
    where: { userId: user.id, sessionId },
  });
  if (!stat) {
    return c.json({ error: 'Not found' }, 404);
  }

  // Resolve bank info
  let questionBankId: string | null = null;
  let questionBankName: string | null = null;

  const hosted = await prisma.hostedSession.findFirst({
    where: { sessionId },
    select: { questionBankId: true, questionBankName: true },
  });
  if (hosted) {
    questionBankId = hosted.questionBankId;
    questionBankName = hosted.questionBankName;
  } else {
    const quizSession = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: { questionBankId: true },
    });
    if (quizSession) {
      questionBankId = quizSession.questionBankId;
      const bank = questionBanks.get(quizSession.questionBankId);
      questionBankName = bank?.metadata.name ?? quizSession.questionBankId;
    }
  }

  // Try to load per-question answers (only available if session not yet cleaned up)
  type QuestionDetail = {
    questionId: string;
    questionText: string | null;
    topics: string[];
    isCorrect: boolean;
    score: number;
    responseTimeMs: number;
    selectedAnswerIds: string[];
    correctAnswerIds: string[];
  };

  let questions: QuestionDetail[] | null = null;
  const topicsInSession: { topic: string; correct: number; total: number; accuracy: number }[] = [];

  const player = await prisma.player.findFirst({
    where: { sessionId, userId: user.id },
    include: { answers: { orderBy: { submittedAt: 'asc' } } },
  });

  if (player && player.answers.length > 0) {
    const bank = questionBankId ? questionBanks.get(questionBankId) : undefined;
    const questionMap = new Map(bank?.questions.map((q) => [q.id, q]) ?? []);

    questions = player.answers.map((a) => {
      const question = questionMap.get(a.questionId);
      const selectedIds = Array.isArray(a.selectedAnswerIds)
        ? (a.selectedAnswerIds as string[])
        : (() => {
            try {
              return JSON.parse(a.selectedAnswerIds as unknown as string) as string[];
            } catch {
              return [];
            }
          })();

      return {
        questionId: a.questionId,
        questionText: question?.text ?? null,
        topics: question?.topics ?? [],
        isCorrect: a.isCorrect,
        score: a.score,
        responseTimeMs: a.responseTimeMs,
        selectedAnswerIds: selectedIds,
        correctAnswerIds: question?.correctAnswerIds ?? [],
      };
    });

    // Compute per-topic accuracy for this session
    const topicMap = new Map<string, { correct: number; total: number }>();
    for (const q of questions) {
      for (const topic of q.topics) {
        const existing = topicMap.get(topic) ?? { correct: 0, total: 0 };
        topicMap.set(topic, {
          correct: existing.correct + (q.isCorrect ? 1 : 0),
          total: existing.total + 1,
        });
      }
    }
    for (const [topic, counts] of topicMap.entries()) {
      topicsInSession.push({
        topic,
        correct: counts.correct,
        total: counts.total,
        accuracy: counts.total > 0 ? counts.correct / counts.total : 0,
      });
    }
    topicsInSession.sort((a, b) => a.accuracy - b.accuracy);
  }

  const result = {
    sessionId: stat.sessionId,
    nickname: stat.nickname,
    questionBankId,
    questionBankName,
    finalScore: stat.finalScore,
    finalRank: stat.finalRank,
    correctAnswers: stat.correctAnswers,
    totalQuestions: stat.totalQuestions,
    accuracy: stat.totalQuestions > 0 ? stat.correctAnswers / stat.totalQuestions : 0,
    averageTime: stat.averageTime,
    playedAt: stat.playedAt.toISOString(),
    questions,
    topicsInSession,
  };

  cache.set(key, result);
  return c.json(result);
});

// ─── Player: Global Comparison ────────────────────────────────────────────────

analyticsRoutes.get(
  '/me/global-comparison',
  requireAuth,
  zValidator('query', z.object({ bankId: z.string().min(1) })),
  async (c) => {
    const user = c.get('user')!;
    const bankId = c.req.query('bankId');
    if (!bankId) {
      return c.json({ error: 'bankId query parameter required' }, 400);
    }
    const db = getDb();

    const key = cacheKey('global-comparison', user.id, { bankId });
    const cached = cache.get(key);
    if (cached) return c.json(cached);

    const [userStats, globalStats] = await Promise.all([
      loadUserQuestionStats(db, user.id, bankId),
      loadBankGlobalStats(db, bankId),
    ]);

    const report = buildGlobalComparison(user.id, bankId, userStats, globalStats);
    cache.set(key, report);
    return c.json(report);
  },
);

export default analyticsRoutes;
