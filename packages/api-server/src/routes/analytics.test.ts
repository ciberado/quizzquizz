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
