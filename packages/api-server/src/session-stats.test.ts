/**
 * Phase 9F Integration Tests
 *
 * Covers:
 *  - recordSessionStats() helper: HostedSession, PlayerStat, UserQuestionStat, QuestionGlobalStat
 *  - Idempotency: re-running on same session is a no-op
 *  - Anonymous sessions / anonymous players handled correctly
 *  - responseTimeMs stored when submitting answers via HTTP
 *  - POST /:id/next (last question) and POST /:id/end trigger stat recording
 *  - GET /api/users/me/question-stats
 *  - GET /api/users/me/weak-topics
 *  - GET /api/question-banks/:id/stats (empirical difficulty, dominantDistractors, answerSelections)
 *  - Player join stores userId for authenticated players
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getPrisma } from './db/index.js';
import { questionBanks } from './state.js';
import { recordSessionStats } from './session-stats.js';
import { generateId } from '@quizzquizz/common';
import type { QuestionBank } from '@quizzquizz/common';
import app from './index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test question bank
// ─────────────────────────────────────────────────────────────────────────────
const TEST_BANK: QuestionBank = {
  id: 'stats-test-bank',
  metadata: {
    name: 'Stats Test Bank',
    defaultTimeLimit: 20,
    topics: ['Math', 'Science'],
  },
  questions: [
    {
      id: 'sq1',
      text: 'What is 2+2?',
      answers: [
        { id: 'sa1', text: '3' },
        { id: 'sa2', text: '4' }, // correct
        { id: 'sa3', text: '5' },
      ],
      correctAnswerIds: ['sa2'],
      difficulty: 'easy',
      topics: ['Math'],
      tags: ['arithmetic'],
      timeLimit: 20,
    },
    {
      id: 'sq2',
      text: 'Speed of light (approx)?',
      answers: [
        { id: 'sa4', text: '3×10⁸ m/s' }, // correct
        { id: 'sa5', text: '3×10⁶ m/s' },
      ],
      correctAnswerIds: ['sa4'],
      difficulty: 'medium',
      topics: ['Science'],
      tags: ['physics'],
      timeLimit: 20,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers (mirror users.test.ts pattern)
// ─────────────────────────────────────────────────────────────────────────────
function extractToken(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function signUp(email: string, username: string, password = 'TestPass123') {
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, name: username }),
  });
  const data = await res.json() as any;
  const token = extractToken(res)!;
  return { token, userId: data.user.id as string };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB cleanup helper
// ─────────────────────────────────────────────────────────────────────────────
async function cleanDb() {
  const prisma = getPrisma();
  // delete in FK-safe order
  try { await prisma.userQuestionStat.deleteMany({}); } catch {}
  try { await prisma.questionGlobalStat.deleteMany({}); } catch {}
  try { await prisma.playerAnswer.deleteMany({}); } catch {}
  try { await prisma.player.deleteMany({}); } catch {}
  try { await prisma.hostedSession.deleteMany({}); } catch {}
  try { await prisma.playerStat.deleteMany({}); } catch {}
  try { await prisma.savedQuiz.deleteMany({}); } catch {}
  try { await prisma.quizSession.deleteMany({}); } catch {}
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ─────────────────────────────────────────────────────────────────────────────
async function createFinishedSession(opts: {
  hostUserId?: string;
  players: Array<{
    id: string;
    userId?: string;
    nickname: string;
    score: number;
    answers: Array<{
      questionId: string;
      selectedAnswerIds: string[];
      isCorrect: boolean;
      score: number;
      responseTimeMs: number;
    }>;
  }>;
}) {
  const prisma = getPrisma();
  const sessionId = generateId();

  await prisma.quizSession.create({
    data: {
      id: sessionId,
      pin: Math.random().toString().slice(2, 8),
      hostToken: generateId(),
      userId: opts.hostUserId ?? null,
      questionBankId: TEST_BANK.id,
      status: 'finished',
      currentQuestionIndex: -1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });

  for (const p of opts.players) {
    await prisma.player.create({
      data: {
        id: p.id,
        sessionId,
        userId: p.userId ?? null,
        nickname: p.nickname,
        score: p.score,
        joinedAt: new Date(),
      },
    });
    for (const a of p.answers) {
      await prisma.playerAnswer.create({
        data: {
          id: generateId(),
          playerId: p.id,
          questionId: a.questionId,
          selectedAnswerIds: JSON.stringify(a.selectedAnswerIds),
          isCorrect: a.isCorrect,
          submittedAt: new Date(),
          score: a.score,
          responseTimeMs: a.responseTimeMs,
        },
      });
    }
  }

  return sessionId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 9F: Granular Question Statistics', () => {
  beforeAll(async () => {
    // Register test question bank (supplement what's loaded from filesystem)
    questionBanks.set(TEST_BANK.id, TEST_BANK);
  });

  beforeEach(async () => {
    await cleanDb();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. recordSessionStats – core functionality
  // ═══════════════════════════════════════════════════════════════════════════
  describe('recordSessionStats()', () => {
    it('creates HostedSession when host is authenticated', async () => {
      const { userId: hostId } = await signUp('host1@test.com', 'host1');
      const sessionId = await createFinishedSession({
        hostUserId: hostId,
        players: [],
      });

      await recordSessionStats(sessionId);

      const hosted = await getPrisma().hostedSession.findUnique({ where: { sessionId } });
      expect(hosted).not.toBeNull();
      expect(hosted!.userId).toBe(hostId);
      expect(hosted!.questionBankId).toBe(TEST_BANK.id);
      expect(hosted!.questionBankName).toBe(TEST_BANK.metadata.name);
      expect(hosted!.totalQuestions).toBe(TEST_BANK.questions.length);
    });

    it('does NOT create HostedSession for anonymous host', async () => {
      const sessionId = await createFinishedSession({ players: [] });

      await recordSessionStats(sessionId);

      const hosted = await getPrisma().hostedSession.findUnique({ where: { sessionId } });
      expect(hosted).toBeNull();
    });

    it('creates PlayerStat for authenticated player', async () => {
      const { userId } = await signUp('player1@test.com', 'player1');
      const pid = generateId();
      const sessionId = await createFinishedSession({
        players: [{
          id: pid,
          userId,
          nickname: 'Player1',
          score: 800,
          answers: [
            { questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 3000 },
            { questionId: 'sq2', selectedAnswerIds: ['sa5'], isCorrect: false, score: 0, responseTimeMs: 8000 },
          ],
        }],
      });

      await recordSessionStats(sessionId);

      const stat = await getPrisma().playerStat.findFirst({ where: { userId, sessionId } });
      expect(stat).not.toBeNull();
      expect(stat!.finalScore).toBe(800);
      expect(stat!.finalRank).toBe(1);
      expect(stat!.correctAnswers).toBe(1);
      expect(stat!.totalQuestions).toBe(TEST_BANK.questions.length);
      expect(stat!.averageTime).toBe(Math.round((3000 + 8000) / 2)); // 5500
    });

    it('does NOT create PlayerStat for anonymous player', async () => {
      const pid = generateId();
      const sessionId = await createFinishedSession({
        players: [{
          id: pid,
          nickname: 'Anon',
          score: 500,
          answers: [
            { questionId: 'sq1', selectedAnswerIds: ['sa1'], isCorrect: false, score: 0, responseTimeMs: 5000 },
          ],
        }],
      });

      await recordSessionStats(sessionId);

      const stats = await getPrisma().playerStat.findMany();
      expect(stats).toHaveLength(0);
    });

    it('ranks multiple players correctly (score desc, join time as tiebreak)', async () => {
      const { userId: uid1 } = await signUp('rank1@test.com', 'rank1');
      const { userId: uid2 } = await signUp('rank2@test.com', 'rank2');
      const { userId: uid3 } = await signUp('rank3@test.com', 'rank3');
      const p1 = generateId(), p2 = generateId(), p3 = generateId();
      const sessionId = await createFinishedSession({
        players: [
          { id: p1, userId: uid1, nickname: 'P1', score: 1000, answers: [] },
          { id: p2, userId: uid2, nickname: 'P2', score: 500, answers: [] },
          { id: p3, userId: uid3, nickname: 'P3', score: 750, answers: [] },
        ],
      });

      await recordSessionStats(sessionId);

      const stats = await getPrisma().playerStat.findMany({ orderBy: { finalRank: 'asc' } });
      expect(stats).toHaveLength(3);
      expect(stats[0].userId).toBe(uid1); // score 1000 → rank 1
      expect(stats[1].userId).toBe(uid3); // score 750 → rank 2
      expect(stats[2].userId).toBe(uid2); // score 500 → rank 3
    });

    it('creates UserQuestionStat for each answer by authenticated player', async () => {
      const { userId } = await signUp('uqs1@test.com', 'uqs1');
      const pid = generateId();
      const sessionId = await createFinishedSession({
        players: [{
          id: pid,
          userId,
          nickname: 'UQS',
          score: 600,
          answers: [
            { questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 2500 },
            { questionId: 'sq2', selectedAnswerIds: ['sa5'], isCorrect: false, score: 0, responseTimeMs: 10000 },
          ],
        }],
      });

      await recordSessionStats(sessionId);

      const uqs1 = await getPrisma().userQuestionStat.findUnique({
        where: { userId_questionId: { userId, questionId: 'sq1' } },
      });
      expect(uqs1).not.toBeNull();
      expect(uqs1!.timesAnswered).toBe(1);
      expect(uqs1!.timesCorrect).toBe(1);
      expect(uqs1!.averageResponseMs).toBe(2500);
      expect(uqs1!.lastWasCorrect).toBe(true);
      // practiceWeight: 1.0 × 0.8 = 0.8 (correct answer)
      expect(uqs1!.practiceWeight).toBeCloseTo(0.8, 5);

      const uqs2 = await getPrisma().userQuestionStat.findUnique({
        where: { userId_questionId: { userId, questionId: 'sq2' } },
      });
      expect(uqs2).not.toBeNull();
      expect(uqs2!.timesCorrect).toBe(0);
      expect(uqs2!.lastWasCorrect).toBe(false);
      // practiceWeight: 1.0 × 1.5 = 1.5 (wrong answer)
      expect(uqs2!.practiceWeight).toBeCloseTo(1.5, 5);
    });

    it('accumulates UserQuestionStat across multiple sessions', async () => {
      const { userId } = await signUp('uqs2@test.com', 'uqs2');
      const pid1 = generateId(), pid2 = generateId();

      // Session 1: got sq1 correct in 3s
      const s1 = await createFinishedSession({
        players: [{
          id: pid1, userId, nickname: 'U', score: 500,
          answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 3000 }],
        }],
      });
      await recordSessionStats(s1);

      // Session 2: got sq1 wrong in 5s
      const s2 = await createFinishedSession({
        players: [{
          id: pid2, userId, nickname: 'U', score: 0,
          answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa1'], isCorrect: false, score: 0, responseTimeMs: 5000 }],
        }],
      });
      await recordSessionStats(s2);

      const uqs = await getPrisma().userQuestionStat.findUnique({
        where: { userId_questionId: { userId, questionId: 'sq1' } },
      });
      expect(uqs!.timesAnswered).toBe(2);
      expect(uqs!.timesCorrect).toBe(1);
      // Rolling average: (3000 + 5000) / 2 = 4000
      expect(uqs!.averageResponseMs).toBe(4000);
      expect(uqs!.lastWasCorrect).toBe(false);
      // practiceWeight: 1.0 → ×0.8=0.8 (correct) → ×1.5=1.2 (wrong)
      expect(uqs!.practiceWeight).toBeCloseTo(1.2, 5);
    });

    it('creates QuestionGlobalStat for every question in session (timesAppeared)', async () => {
      const sessionId = await createFinishedSession({ players: [] });

      await recordSessionStats(sessionId);

      const sq1 = await getPrisma().questionGlobalStat.findUnique({ where: { questionId: 'sq1' } });
      const sq2 = await getPrisma().questionGlobalStat.findUnique({ where: { questionId: 'sq2' } });
      expect(sq1!.timesAppeared).toBe(1);
      expect(sq1!.timesAnswered).toBe(0); // no players/answers
      expect(sq2!.timesAppeared).toBe(1);
    });

    it('accumulates QuestionGlobalStat timesAnswered, timesCorrect, answerSelections', async () => {
      const p1 = generateId(), p2 = generateId();
      const sessionId = await createFinishedSession({
        players: [
          {
            id: p1, nickname: 'A', score: 500,
            answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 3000 }],
          },
          {
            id: p2, nickname: 'B', score: 0,
            answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa1'], isCorrect: false, score: 0, responseTimeMs: 7000 }],
          },
        ],
      });

      await recordSessionStats(sessionId);

      const stat = await getPrisma().questionGlobalStat.findUnique({ where: { questionId: 'sq1' } });
      expect(stat!.timesAppeared).toBe(1);
      expect(stat!.timesAnswered).toBe(2);
      expect(stat!.timesCorrect).toBe(1);
      // Rolling average response time: (3000 + 7000) / 2 = 5000
      expect(stat!.averageResponseMs).toBe(5000);

      const selections = JSON.parse(stat!.answerSelections) as Record<string, number>;
      expect(selections['sa2']).toBe(1); // correct answer selected once
      expect(selections['sa1']).toBe(1); // wrong answer selected once

      // Not enough data for empiricalDifficulty (need >= 10 answers)
      expect(stat!.empiricalDifficulty).toBeNull();
    });

    it('computes empiricalDifficulty after 10+ answers', async () => {
      // Create 5 sessions with 2 players each submitting sq1, giving us 10 answers total
      // 7 correct, 3 wrong → empirical = 0.7
      for (let i = 0; i < 5; i++) {
        // sessions where both answer, alternating: 7 correct 3 wrong across 10
        const correctFirst = i < 4; // first 4 sessions: 1 right 1 wrong = 8 right, 8 wrong... hmm
        // Let's do: sessions 0..3 → 2 correct each (8 correct) is too many
        // Better: 10 answers: 7 correct, 3 wrong across 5 sessions with 2 players
        // Sessions 0,1,2,3 → 2 correct (8 correct total)
        // Session 4 → 1 correct + 1 wrong (only 1 wrong)
        // That gives 9 correct 1 wrong. Let me try: make some wrong answers.
        // I'll use: 3 sessions with 2 correct, 2 sessions with 1 correct + 1 wrong
        // → 3×2 + 2×1 = 8 correct, 2×1 = 2 wrong → 8/10 = 0.8

        const isCorrectSecond = i >= 3; // sessions 3,4 have 1 wrong each
        const p1 = generateId(), p2 = generateId();
        const sid = await createFinishedSession({
          players: [
            {
              id: p1, nickname: `PA${i}`, score: 500,
              answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 3000 }],
            },
            {
              id: p2, nickname: `PB${i}`, score: isCorrectSecond ? 0 : 500,
              answers: [{
                questionId: 'sq1',
                selectedAnswerIds: isCorrectSecond ? ['sa1'] : ['sa2'],
                isCorrect: !isCorrectSecond,
                score: isCorrectSecond ? 0 : 500,
                responseTimeMs: 4000,
              }],
            },
          ],
        });
        await recordSessionStats(sid);
      }

      const stat = await getPrisma().questionGlobalStat.findUnique({ where: { questionId: 'sq1' } });
      expect(stat!.timesAnswered).toBe(10);
      // empiricalDifficulty should now be set
      expect(stat!.empiricalDifficulty).not.toBeNull();
      // 8 correct out of 10
      expect(stat!.empiricalDifficulty).toBeCloseTo(0.8, 2);
    });

    it('is idempotent: calling twice does not duplicate records', async () => {
      const { userId: hostId } = await signUp('idem1@test.com', 'idem1');
      const { userId } = await signUp('idem2@test.com', 'idem2');
      const pid = generateId();
      const sessionId = await createFinishedSession({
        hostUserId: hostId,
        players: [{
          id: pid, userId, nickname: 'I', score: 600,
          answers: [{ questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 600, responseTimeMs: 3000 }],
        }],
      });

      await recordSessionStats(sessionId);
      await recordSessionStats(sessionId); // second call should be a no-op

      const hostedCount = await getPrisma().hostedSession.count({ where: { sessionId } });
      expect(hostedCount).toBe(1); // not 2

      const statCount = await getPrisma().playerStat.count({ where: { userId, sessionId } });
      expect(statCount).toBe(1);

      const uqs = await getPrisma().userQuestionStat.findUnique({
        where: { userId_questionId: { userId, questionId: 'sq1' } },
      });
      expect(uqs!.timesAnswered).toBe(1); // not 2
    });

    it('handles session not found gracefully (no throws)', async () => {
      await expect(recordSessionStats('nonexistent-session-id')).resolves.toBeUndefined();
    });

    it('clamps practiceWeight within [0.1, 5.0]', async () => {
      const { userId } = await signUp('clamp@test.com', 'clamp');

      // Seed a practiceWeight near the upper bound (5.0)
      await getPrisma().userQuestionStat.create({
        data: {
          id: generateId(),
          userId,
          questionId: 'sq2',
          questionBankId: TEST_BANK.id,
          timesAnswered: 10,
          timesCorrect: 0,
          averageResponseMs: 5000,
          lastWasCorrect: false,
          practiceWeight: 4.5, // one more wrong would push to 6.75, but should clamp to 5.0
        },
      });

      const pid = generateId();
      const sessionId = await createFinishedSession({
        players: [{
          id: pid, userId, nickname: 'C', score: 0,
          answers: [{ questionId: 'sq2', selectedAnswerIds: ['sa5'], isCorrect: false, score: 0, responseTimeMs: 5000 }],
        }],
      });

      await recordSessionStats(sessionId);

      const uqs = await getPrisma().userQuestionStat.findUnique({
        where: { userId_questionId: { userId, questionId: 'sq2' } },
      });
      expect(uqs!.practiceWeight).toBeLessThanOrEqual(5.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. responseTimeMs stored via HTTP answer submission
  // ═══════════════════════════════════════════════════════════════════════════
  describe('responseTimeMs in answer submissions', () => {
    it('stores non-zero responseTimeMs when question was started', async () => {
      const prisma = getPrisma();

      const sessionId = generateId();
      const hostToken = generateId();
      const playerId = generateId();

      await prisma.quizSession.create({
        data: {
          id: sessionId,
          pin: Math.random().toString().slice(2, 8),
          hostToken,
          questionBankId: TEST_BANK.id,
          status: 'playing',
          currentQuestionIndex: 0,
          questionStartedAt: new Date(Date.now() - 3000), // started 3 seconds ago
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      await prisma.player.create({
        data: { id: playerId, sessionId, nickname: 'RespTest', score: 0, joinedAt: new Date() },
      });

      const res = await app.request(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Player-Id': playerId,
        },
        body: JSON.stringify({ questionId: 'sq1', selectedAnswerIds: ['sa2'] }),
      });

      expect(res.status).toBe(200);

      const answer = await prisma.playerAnswer.findFirst({ where: { playerId } });
      expect(answer).not.toBeNull();
      expect(answer!.responseTimeMs).toBeGreaterThan(0);
      expect(answer!.responseTimeMs).toBeGreaterThanOrEqual(3000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Session finish triggers stat recording via POST /next and POST /end
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Session finish triggers stat recording', () => {
    it('POST /next on last question writes QuestionGlobalStat', async () => {
      const prisma = getPrisma();
      const { userId: hostId, token: hostAuthToken } = await signUp('finhost1@test.com', 'finhost1');
      const playerId = generateId();
      const sessionId = generateId();
      const hostToken = generateId();

      // Create session already at last question
      await prisma.quizSession.create({
        data: {
          id: sessionId,
          pin: Math.random().toString().slice(2, 8),
          hostToken,
          userId: hostId,
          questionBankId: TEST_BANK.id,
          status: 'playing',
          currentQuestionIndex: TEST_BANK.questions.length - 1, // last question
          questionStartedAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      await prisma.player.create({
        data: { id: playerId, sessionId, nickname: 'FN', score: 500, joinedAt: new Date() },
      });

      const res = await app.request(`/api/sessions/${sessionId}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('finished');

      // Wait a tick for the async stat recording
      await new Promise((r) => setTimeout(r, 50));

      const hosted = await prisma.hostedSession.findUnique({ where: { sessionId } });
      expect(hosted).not.toBeNull();
      expect(hosted!.userId).toBe(hostId);

      const globalStats = await prisma.questionGlobalStat.findMany({
        where: { questionBankId: TEST_BANK.id },
      });
      expect(globalStats.length).toBe(TEST_BANK.questions.length);
    });

    it('POST /end writes stats when host force-ends', async () => {
      const prisma = getPrisma();
      const { userId: hostId } = await signUp('finhost2@test.com', 'finhost2');
      const sessionId = generateId();
      const hostToken = generateId();

      await prisma.quizSession.create({
        data: {
          id: sessionId,
          pin: Math.random().toString().slice(2, 8),
          hostToken,
          userId: hostId,
          questionBankId: TEST_BANK.id,
          status: 'playing',
          currentQuestionIndex: 0,
          questionStartedAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await app.request(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);

      await new Promise((r) => setTimeout(r, 50));

      const hosted = await prisma.hostedSession.findUnique({ where: { sessionId } });
      expect(hosted).not.toBeNull();
      expect(hosted!.userId).toBe(hostId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Player join stores userId for authenticated players
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Player join with auth', () => {
    it('stores userId in player record when player is authenticated', async () => {
      const prisma = getPrisma();
      const { userId, token } = await signUp('auth-player@test.com', 'authplayer');

      const sessionId = generateId();
      await prisma.quizSession.create({
        data: {
          id: sessionId,
          pin: '777888',
          hostToken: generateId(),
          questionBankId: TEST_BANK.id,
          status: 'lobby',
          currentQuestionIndex: -1,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await app.request('/api/sessions/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${token}`,
        },
        body: JSON.stringify({ pin: '777888', nickname: 'AuthPlayer' }),
      });

      expect(res.status).toBe(201);
      const { playerId } = await res.json() as any;

      const player = await prisma.player.findUnique({ where: { id: playerId } });
      expect(player!.userId).toBe(userId);
    });

    it('stores null userId for anonymous player', async () => {
      const prisma = getPrisma();

      const sessionId = generateId();
      await prisma.quizSession.create({
        data: {
          id: sessionId,
          pin: '999111',
          hostToken: generateId(),
          questionBankId: TEST_BANK.id,
          status: 'lobby',
          currentQuestionIndex: -1,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await app.request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '999111', nickname: 'AnonPlayer' }),
      });

      expect(res.status).toBe(201);
      const { playerId } = await res.json() as any;

      const player = await prisma.player.findUnique({ where: { id: playerId } });
      expect(player!.userId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GET /api/users/me/question-stats
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users/me/question-stats', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request('/api/users/me/question-stats');
      expect(res.status).toBe(401);
    });

    it('returns empty when user has no question stats', async () => {
      const { token } = await signUp('qs1@test.com', 'qs1');
      const res = await app.request('/api/users/me/question-stats', {
        headers: { Cookie: `better-auth.session_token=${token}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.questions).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it('returns questions sorted by accuracy ASC (weakest first)', async () => {
      const { token, userId } = await signUp('qs2@test.com', 'qs2');

      // sq1: answered 3 times, 1 correct → accuracy 0.33
      // sq2: answered 2 times, 2 correct → accuracy 1.0
      await getPrisma().userQuestionStat.createMany({
        data: [
          {
            id: generateId(), userId, questionId: 'sq1', questionBankId: TEST_BANK.id,
            timesAnswered: 3, timesCorrect: 1, averageResponseMs: 4000,
            lastWasCorrect: false, practiceWeight: 1.2,
          },
          {
            id: generateId(), userId, questionId: 'sq2', questionBankId: TEST_BANK.id,
            timesAnswered: 2, timesCorrect: 2, averageResponseMs: 3000,
            lastWasCorrect: true, practiceWeight: 0.64,
          },
        ],
      });

      const res = await app.request('/api/users/me/question-stats', {
        headers: { Cookie: `better-auth.session_token=${token}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.questions).toHaveLength(2);
      // Weakest first: sq1 (accuracy 0.33) before sq2 (accuracy 1.0)
      expect(data.questions[0].questionId).toBe('sq1');
      expect(data.questions[0].accuracy).toBeCloseTo(1 / 3, 2);
      expect(data.questions[1].questionId).toBe('sq2');
      expect(data.questions[1].accuracy).toBe(1);
    });

    it('filters by bankId query parameter', async () => {
      const { token, userId } = await signUp('qs3@test.com', 'qs3');

      await getPrisma().userQuestionStat.createMany({
        data: [
          {
            id: generateId(), userId, questionId: 'sq1', questionBankId: TEST_BANK.id,
            timesAnswered: 5, timesCorrect: 2, averageResponseMs: 4000,
            lastWasCorrect: false, practiceWeight: 1.0,
          },
          {
            id: generateId(), userId, questionId: 'other-q', questionBankId: 'other-bank',
            timesAnswered: 5, timesCorrect: 5, averageResponseMs: 2000,
            lastWasCorrect: true, practiceWeight: 0.5,
          },
        ],
      });

      const res = await app.request(
        `/api/users/me/question-stats?bankId=${TEST_BANK.id}`,
        { headers: { Cookie: `better-auth.session_token=${token}` } }
      );
      const data = await res.json() as any;
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].questionBankId).toBe(TEST_BANK.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GET /api/users/me/weak-topics
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users/me/weak-topics', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request('/api/users/me/weak-topics');
      expect(res.status).toBe(401);
    });

    it('returns empty when user has no stats', async () => {
      const { token } = await signUp('wt1@test.com', 'wt1');
      const res = await app.request('/api/users/me/weak-topics', {
        headers: { Cookie: `better-auth.session_token=${token}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.topics).toHaveLength(0);
    });

    it('aggregates accuracy by topic and sorts weakest first', async () => {
      const { token, userId } = await signUp('wt2@test.com', 'wt2');

      // sq1 → topic Math, tag arithmetic: 1/3 correct
      // sq2 → topic Science, tag physics: 2/2 correct
      await getPrisma().userQuestionStat.createMany({
        data: [
          {
            id: generateId(), userId, questionId: 'sq1', questionBankId: TEST_BANK.id,
            timesAnswered: 3, timesCorrect: 1, averageResponseMs: 4000,
            lastWasCorrect: false, practiceWeight: 1.0,
          },
          {
            id: generateId(), userId, questionId: 'sq2', questionBankId: TEST_BANK.id,
            timesAnswered: 2, timesCorrect: 2, averageResponseMs: 3000,
            lastWasCorrect: true, practiceWeight: 0.8,
          },
        ],
      });

      const res = await app.request('/api/users/me/weak-topics', {
        headers: { Cookie: `better-auth.session_token=${token}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.topics.length).toBeGreaterThanOrEqual(2);

      // Math should come before Science because lower accuracy
      const mathTopic = data.topics.find((t: any) => t.topic === 'Math');
      const sciTopic = data.topics.find((t: any) => t.topic === 'Science');
      expect(mathTopic).toBeDefined();
      expect(sciTopic).toBeDefined();
      expect(mathTopic.accuracy).toBeCloseTo(1 / 3, 2);
      expect(sciTopic.accuracy).toBe(1);

      // Weakest first
      const mathIndex = data.topics.indexOf(mathTopic);
      const sciIndex = data.topics.indexOf(sciTopic);
      expect(mathIndex).toBeLessThan(sciIndex);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. GET /api/question-banks/:id/stats
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/question-banks/:id/stats', () => {
    it('returns 404 for unknown bank', async () => {
      const res = await app.request('/api/question-banks/nonexistent/stats');
      expect(res.status).toBe(404);
    });

    it('returns all questions with zero stats for fresh bank', async () => {
      const res = await app.request(`/api/question-banks/${TEST_BANK.id}/stats`);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.questionBankId).toBe(TEST_BANK.id);
      expect(data.totalQuestions).toBe(TEST_BANK.questions.length);
      expect(data.questions).toHaveLength(TEST_BANK.questions.length);
      // All zeros for fresh bank
      expect(data.questions[0].timesAppeared).toBe(0);
      expect(data.questions[0].empiricalDifficulty).toBeNull();
    });

    it('returns empirical difficulty and answerSelections after play', async () => {
      const p1 = generateId();
      const sessionId = await createFinishedSession({
        players: [{
          id: p1, nickname: 'P', score: 500,
          answers: [
            { questionId: 'sq1', selectedAnswerIds: ['sa2'], isCorrect: true, score: 500, responseTimeMs: 3000 },
            { questionId: 'sq1', selectedAnswerIds: ['sa1'], isCorrect: false, score: 0, responseTimeMs: 5000 },
            // Note: same player can't answer twice normally, but we're inserting directly
          ],
        }],
      });
      await recordSessionStats(sessionId);

      const res = await app.request(`/api/question-banks/${TEST_BANK.id}/stats`);
      const data = await res.json() as any;
      const sq1Data = data.questions.find((q: any) => q.questionId === 'sq1');
      expect(sq1Data.timesAppeared).toBe(1);
      expect(sq1Data.timesAnswered).toBe(2);
      expect(sq1Data.timesCorrect).toBe(1);
      expect(sq1Data.answerSelections).toBeDefined();
      expect(sq1Data.answerSelections['sa2']).toBe(1);
      expect(sq1Data.answerSelections['sa1']).toBe(1);
    });

    it('flags dominant distractor (wrong answer chosen more than correct)', async () => {
      // Create stats where sa1 (wrong) is selected more than sa2 (correct)
      await getPrisma().questionGlobalStat.create({
        data: {
          id: generateId(),
          questionId: 'sq1',
          questionBankId: TEST_BANK.id,
          timesAppeared: 10,
          timesAnswered: 10,
          timesCorrect: 3,
          averageResponseMs: 5000,
          averageScore: 150,
          // sa1 selected 7 times (wrong), sa2 selected 3 times (correct)
          answerSelections: JSON.stringify({ sa1: 7, sa2: 3 }),
          empiricalDifficulty: 0.3,
        },
      });

      const res = await app.request(`/api/question-banks/${TEST_BANK.id}/stats`);
      const data = await res.json() as any;
      const sq1Data = data.questions.find((q: any) => q.questionId === 'sq1');
      expect(sq1Data.dominantDistractors).toContain('sa1');
    });

    it('flags difficulty mismatch when empirical vs declared diverge by > 0.3', async () => {
      // sq1 is declared 'easy' (score ~0.8) but empirical is 0.3 → divergence 0.5 > 0.3
      await getPrisma().questionGlobalStat.create({
        data: {
          id: generateId(),
          questionId: 'sq1',
          questionBankId: TEST_BANK.id,
          timesAppeared: 20,
          timesAnswered: 20,
          timesCorrect: 6,
          averageResponseMs: 8000,
          averageScore: 100,
          answerSelections: JSON.stringify({ sa1: 14, sa2: 6 }),
          empiricalDifficulty: 0.3,
        },
      });

      const res = await app.request(`/api/question-banks/${TEST_BANK.id}/stats`);
      const data = await res.json() as any;
      const sq1Data = data.questions.find((q: any) => q.questionId === 'sq1');
      expect(sq1Data.flagDifficultyMismatch).toBe(true);
      expect(sq1Data.difficultyDivergence).toBeGreaterThan(0.3);
    });
  });
});
