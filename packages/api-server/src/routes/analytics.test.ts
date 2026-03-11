/**
 * Analytics API Authorization Tests
 *
 * Verifies:
 * - 401 for unauthenticated requests on every analytics endpoint
 * - 403 when a user tries to access another user's host analytics
 * - Player (me/*) endpoints only return data scoped to the authenticated user
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../index.js';
import { getPrisma } from '../db/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function signUp(email: string, username: string, password: string) {
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, name: username }),
  });

  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  const data = await res.json();
  return { token: token ?? (data.token as string), userId: data.user?.id as string };
}

function authHeaders(token: string) {
  return { Cookie: `better-auth.session_token=${token}` };
}

// ─── Test Setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  const prisma = getPrisma();
  // Delete in dependency order
  try { await prisma.playerAnswer.deleteMany(); } catch { /* ignore */ }
  try { await prisma.playerStat.deleteMany(); } catch { /* ignore */ }
  try { await prisma.userQuestionStat.deleteMany(); } catch { /* ignore */ }
  try { await prisma.questionGlobalStat.deleteMany(); } catch { /* ignore */ }
  try { await prisma.player.deleteMany(); } catch { /* ignore */ }
  try { await prisma.quizSession.deleteMany(); } catch { /* ignore */ }
  try { await prisma.hostedSession.deleteMany(); } catch { /* ignore */ }
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

// ─── 401 Unauthenticated ──────────────────────────────────────────────────────

describe('Analytics API — 401 for unauthenticated requests', () => {
  const unauthenticatedEndpoints = [
    '/api/analytics/sessions/some-session-id/report',
    '/api/analytics/banks/some-bank-id/health',
    '/api/analytics/banks/some-bank-id/engagement',
    '/api/analytics/sessions/compare?sessionA=a&sessionB=b',
    '/api/analytics/me/dashboard',
    '/api/analytics/me/accuracy-trend',
    '/api/analytics/me/weak-topics',
    '/api/analytics/me/response-profile',
    '/api/analytics/me/practice',
    '/api/analytics/me/global-comparison?bankId=some-bank',
  ];

  for (const endpoint of unauthenticatedEndpoints) {
    it(`GET ${endpoint} → 401`, async () => {
      const res = await app.request(endpoint);
      expect(res.status).toBe(401);
    });
  }
});

// ─── 403 Ownership (host analytics) ──────────────────────────────────────────

describe('Analytics API — 403 for wrong-user host access', () => {
  it('GET /sessions/:id/report → 403 when session belongs to another user', async () => {
    const owner = await signUp('owner@test.com', 'owner', 'OwnerPass123!');
    const stranger = await signUp('stranger@test.com', 'stranger', 'StrangerPass123!');

    // Create a hostedSession record owned by `owner`
    const prisma = getPrisma();
    await prisma.quizSession.create({
      data: { id: 'session-abc', pin: '100001', hostToken: randomUUID(), questionBankId: 'b', status: 'finished', currentQuestionIndex: 0 },
    });
    await prisma.hostedSession.create({
      data: {
        id: randomUUID(),
        userId: owner.userId,
        sessionId: 'session-abc',
        questionBankId: 'bank-xyz',
        questionBankName: 'Test Bank',
        totalPlayers: 0,
        totalQuestions: 0,
        completedAt: new Date(),
      },
    });

    const res = await app.request('/api/analytics/sessions/session-abc/report', {
      headers: authHeaders(stranger.token!),
    });
    expect(res.status).toBe(403);
  });

  it('GET /banks/:id/health → 403 when bank not hosted by requester', async () => {
    const owner = await signUp('owner2@test.com', 'owner2', 'OwnerPass123!');
    const stranger = await signUp('stranger2@test.com', 'stranger2', 'StrangerPass123!');

    const prisma = getPrisma();
    await prisma.quizSession.create({
      data: { id: 'session-def', pin: '100002', hostToken: randomUUID(), questionBankId: 'bank-for-health', status: 'finished', currentQuestionIndex: 0 },
    });
    await prisma.hostedSession.create({
      data: {
        id: randomUUID(),
        userId: owner.userId,
        sessionId: 'session-def',
        questionBankId: 'bank-for-health',
        questionBankName: 'Test Bank',
        totalPlayers: 0,
        totalQuestions: 0,
        completedAt: new Date(),
      },
    });

    const res = await app.request('/api/analytics/banks/bank-for-health/health', {
      headers: authHeaders(stranger.token!),
    });
    expect(res.status).toBe(403);
  });

  it('GET /sessions/compare → 403 when sessions belong to another user', async () => {
    const owner = await signUp('owner3@test.com', 'owner3', 'OwnerPass123!');
    const stranger = await signUp('stranger3@test.com', 'stranger3', 'StrangerPass123!');

    const prisma = getPrisma();
    await prisma.quizSession.createMany({
      data: [
        { id: 'session-g11', pin: '100003', hostToken: randomUUID(), questionBankId: 'bank-compare', status: 'finished', currentQuestionIndex: 0 },
        { id: 'session-g22', pin: '100004', hostToken: randomUUID(), questionBankId: 'bank-compare', status: 'finished', currentQuestionIndex: 0 },
      ],
    });
    await prisma.hostedSession.createMany({
      data: [
        {
          id: randomUUID(),
          userId: owner.userId,
          sessionId: 'session-g11',
          questionBankId: 'bank-compare',
          questionBankName: 'Test Bank',
          totalPlayers: 0,
          totalQuestions: 0,
          completedAt: new Date(),
        },
        {
          id: randomUUID(),
          userId: owner.userId,
          sessionId: 'session-g22',
          questionBankId: 'bank-compare',
          questionBankName: 'Test Bank',
          totalPlayers: 0,
          totalQuestions: 0,
          completedAt: new Date(),
        },
      ],
    });

    const res = await app.request('/api/analytics/sessions/compare?sessionA=session-g11&sessionB=session-g22', {
      headers: authHeaders(stranger.token!),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Player endpoints scoped to authenticated user ────────────────────────────

describe('Analytics API — player endpoints return own data only', () => {
  it('GET /me/dashboard → 200 with data scoped to authenticated user', async () => {
    const user = await signUp('player@test.com', 'playeruser', 'PlayerPass123!');

    const res = await app.request('/api/analytics/me/dashboard', {
      headers: authHeaders(user.token!),
    });
    // Returns 200 (empty stats are fine — no sessions played yet)
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('userId', user.userId);
  });

  it('GET /me/accuracy-trend → 200 scoped to authenticated user', async () => {
    const user = await signUp('trend@test.com', 'trenduser', 'TrendPass123!');

    const res = await app.request('/api/analytics/me/accuracy-trend', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('userId', user.userId);
  });

  it('GET /me/response-profile → 200 scoped to authenticated user', async () => {
    const user = await signUp('profile@test.com', 'profileuser', 'ProfilePass123!');

    const res = await app.request('/api/analytics/me/response-profile', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('userId', user.userId);
  });

  it('GET /me/global-comparison requires bankId param', async () => {
    const user = await signUp('global@test.com', 'globaluser', 'GlobalPass123!');

    const res = await app.request('/api/analytics/me/global-comparison', {
      headers: authHeaders(user.token!),
    });
    // Missing required bankId should return 400
    expect(res.status).toBe(400);
  });
});

// ─── Player: Session History (/me/sessions) ───────────────────────────────────

describe('Analytics API — GET /me/sessions', () => {
  it('401 for unauthenticated request', async () => {
    const res = await app.request('/api/analytics/me/sessions');
    expect(res.status).toBe(401);
  });

  it('200 with empty sessions list when user has no history', async () => {
    const user = await signUp('hist-empty@test.com', 'histempty', 'TestPass123!');

    const res = await app.request('/api/analytics/me/sessions', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { sessions: unknown[] };
    expect(body).toHaveProperty('sessions');
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions).toHaveLength(0);
  });

  it('200 returns sessions belonging to the authenticated user only', async () => {
    const userA = await signUp('hist-a@test.com', 'histusera', 'TestPass123!');
    const userB = await signUp('hist-b@test.com', 'histuserb', 'TestPass123!');
    const prisma = getPrisma();

    // Create a QuizSession so PlayerStat can reference it
    await prisma.quizSession.create({
      data: {
        id: 'qs-hist-1',
        pin: '777001',
        hostToken: randomUUID(),
        questionBankId: 'bank-hist',
        status: 'finished',
        currentQuestionIndex: 2,
      },
    });

    // PlayerStat for userA only
    await prisma.playerStat.create({
      data: {
        id: randomUUID(),
        userId: userA.userId,
        sessionId: 'qs-hist-1',
        nickname: 'Alice',
        finalScore: 800,
        finalRank: 1,
        correctAnswers: 3,
        totalQuestions: 5,
        averageTime: 4000,
        playedAt: new Date('2026-03-01T12:00:00Z'),
      },
    });

    // userA sees their session
    const resA = await app.request('/api/analytics/me/sessions', {
      headers: authHeaders(userA.token!),
    });
    expect(resA.status).toBe(200);
    const bodyA = await resA.json() as { sessions: { sessionId: string; nickname: string; finalScore: number; accuracy: number }[] };
    expect(bodyA.sessions).toHaveLength(1);
    expect(bodyA.sessions[0]!.sessionId).toBe('qs-hist-1');
    expect(bodyA.sessions[0]!.nickname).toBe('Alice');
    expect(bodyA.sessions[0]!.finalScore).toBe(800);
    expect(bodyA.sessions[0]!.accuracy).toBeCloseTo(0.6);

    // userB sees nothing
    const resB = await app.request('/api/analytics/me/sessions', {
      headers: authHeaders(userB.token!),
    });
    expect(resB.status).toBe(200);
    const bodyB = await resB.json() as { sessions: unknown[] };
    expect(bodyB.sessions).toHaveLength(0);
  });

  it('200 enriches sessions with quiz bank name from HostedSession', async () => {
    const user = await signUp('hist-bank@test.com', 'histbankuser', 'TestPass123!');
    const hostUser = await signUp('hist-host@test.com', 'histhostuser', 'TestPass123!');
    const prisma = getPrisma();

    await prisma.quizSession.create({
      data: {
        id: 'qs-hist-2',
        pin: '777002',
        hostToken: randomUUID(),
        questionBankId: 'bank-gen',
        status: 'finished',
        currentQuestionIndex: 2,
      },
    });

    await prisma.hostedSession.create({
      data: {
        id: randomUUID(),
        userId: hostUser.userId,
        sessionId: 'qs-hist-2',
        questionBankId: 'bank-gen',
        questionBankName: 'General Knowledge',
        totalPlayers: 3,
        totalQuestions: 5,
        completedAt: new Date('2026-03-01T12:00:00Z'),
      },
    });

    await prisma.playerStat.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        sessionId: 'qs-hist-2',
        nickname: 'Bob',
        finalScore: 600,
        finalRank: 2,
        correctAnswers: 3,
        totalQuestions: 5,
        averageTime: 5000,
        playedAt: new Date('2026-03-01T12:00:00Z'),
      },
    });

    const res = await app.request('/api/analytics/me/sessions', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { sessions: { questionBankName: string | null }[] };
    expect(body.sessions[0]!.questionBankName).toBe('General Knowledge');
  });

  it('200 multiple sessions are ordered most-recent first', async () => {
    const user = await signUp('hist-order@test.com', 'historderuser', 'TestPass123!');
    const prisma = getPrisma();

    for (const [idx, iso] of [['qs-hist-3', '2026-01-01'], ['qs-hist-4', '2026-03-10']] as [string, string][]) {
      await prisma.quizSession.create({
        data: { id: idx, pin: `77800${idx.slice(-1)}`, hostToken: randomUUID(), questionBankId: 'b', status: 'finished', currentQuestionIndex: 0 },
      });
      await prisma.playerStat.create({
        data: { id: randomUUID(), userId: user.userId, sessionId: idx, nickname: 'X', finalScore: 100, finalRank: 1, correctAnswers: 1, totalQuestions: 1, averageTime: 1000, playedAt: new Date(iso) },
      });
    }

    const res = await app.request('/api/analytics/me/sessions', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { sessions: { sessionId: string }[] };
    expect(body.sessions).toHaveLength(2);
    // Most recent first: qs-hist-4 (2026-03-10) before qs-hist-3 (2026-01-01)
    expect(body.sessions[0]!.sessionId).toBe('qs-hist-4');
    expect(body.sessions[1]!.sessionId).toBe('qs-hist-3');
  });
});

// ─── Player: Session Detail (/me/sessions/:id) ────────────────────────────────

describe('Analytics API — GET /me/sessions/:id', () => {
  it('401 for unauthenticated request', async () => {
    const res = await app.request('/api/analytics/me/sessions/some-id');
    expect(res.status).toBe(401);
  });

  it('404 when session does not belong to the requesting user', async () => {
    const userA = await signUp('det-a@test.com', 'detusera', 'TestPass123!');
    const userB = await signUp('det-b@test.com', 'detuserb', 'TestPass123!');
    const prisma = getPrisma();

    await prisma.quizSession.create({
      data: { id: 'qs-det-1', pin: '888001', hostToken: randomUUID(), questionBankId: 'b', status: 'finished', currentQuestionIndex: 0 },
    });
    await prisma.playerStat.create({
      data: { id: randomUUID(), userId: userA.userId, sessionId: 'qs-det-1', nickname: 'A', finalScore: 100, finalRank: 1, correctAnswers: 1, totalQuestions: 1, averageTime: 1000, playedAt: new Date() },
    });

    // userB tries to access userA's session
    const res = await app.request('/api/analytics/me/sessions/qs-det-1', {
      headers: authHeaders(userB.token!),
    });
    expect(res.status).toBe(404);
  });

  it('404 for completely unknown session id', async () => {
    const user = await signUp('det-notfound@test.com', 'detnotfound', 'TestPass123!');
    const res = await app.request('/api/analytics/me/sessions/non-existent-session-id', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(404);
  });

  it('200 returns correct summary stats', async () => {
    const user = await signUp('det-ok@test.com', 'detokuser', 'TestPass123!');
    const prisma = getPrisma();

    await prisma.quizSession.create({
      data: { id: 'qs-det-2', pin: '888002', hostToken: randomUUID(), questionBankId: 'b', status: 'finished', currentQuestionIndex: 0 },
    });
    await prisma.playerStat.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        sessionId: 'qs-det-2',
        nickname: 'Charlie',
        finalScore: 1200,
        finalRank: 1,
        correctAnswers: 4,
        totalQuestions: 5,
        averageTime: 3500,
        playedAt: new Date('2026-03-10T10:00:00Z'),
      },
    });

    const res = await app.request('/api/analytics/me/sessions/qs-det-2', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);

    type Detail = {
      sessionId: string;
      nickname: string;
      finalScore: number;
      finalRank: number;
      correctAnswers: number;
      totalQuestions: number;
      accuracy: number;
      averageTime: number;
      questions: null;
      topicsInSession: unknown[];
    };
    const body = await res.json() as Detail;
    expect(body.sessionId).toBe('qs-det-2');
    expect(body.nickname).toBe('Charlie');
    expect(body.finalScore).toBe(1200);
    expect(body.finalRank).toBe(1);
    expect(body.correctAnswers).toBe(4);
    expect(body.totalQuestions).toBe(5);
    expect(body.accuracy).toBeCloseTo(0.8);
    expect(body.averageTime).toBe(3500);
    // No Player record → questions is null, topicsInSession is empty
    expect(body.questions).toBeNull();
    expect(body.topicsInSession).toHaveLength(0);
  });

  it('200 includes questionBankName from HostedSession', async () => {
    const user = await signUp('det-bank@test.com', 'detbankuser', 'TestPass123!');
    const host = await signUp('det-host@test.com', 'dethostuser', 'TestPass123!');
    const prisma = getPrisma();

    await prisma.quizSession.create({
      data: { id: 'qs-det-3', pin: '888003', hostToken: randomUUID(), questionBankId: 'bank-sci', status: 'finished', currentQuestionIndex: 0 },
    });
    await prisma.hostedSession.create({
      data: {
        id: randomUUID(),
        userId: host.userId,
        sessionId: 'qs-det-3',
        questionBankId: 'bank-sci',
        questionBankName: 'Science Quiz',
        totalPlayers: 2,
        totalQuestions: 5,
        completedAt: new Date(),
      },
    });
    await prisma.playerStat.create({
      data: { id: randomUUID(), userId: user.userId, sessionId: 'qs-det-3', nickname: 'Dana', finalScore: 500, finalRank: 2, correctAnswers: 2, totalQuestions: 5, averageTime: 7000, playedAt: new Date() },
    });

    const res = await app.request('/api/analytics/me/sessions/qs-det-3', {
      headers: authHeaders(user.token!),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { questionBankName: string | null };
    expect(body.questionBankName).toBe('Science Quiz');
  });
});

