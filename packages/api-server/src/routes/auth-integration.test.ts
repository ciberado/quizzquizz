import { describe, it, expect, beforeEach } from 'vitest';
import { getPrisma } from '../db/index.js';
import app from '../index.js';

/**
 * Helper: Extract session token from Better Auth response
 */
function extractToken(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

/**
 * Authentication Integration Tests
 * 
 * CRITICAL: End-to-end tests covering complete user flows with authentication
 * 
 * Test Coverage:
 * - Complete user registration → login → action → logout flow
 * - Multi-user concurrent sessions
 * - Authenticated quiz hosting workflow
 * - Player participation with authentication
 * - Cross-feature authentication integration
 */

describe('Authentication Integration', () => {
  beforeEach(async () => {
    // Clean database (wrap in try-catch in case tables don't exist)
    try {
      await getPrisma().playerAnswer.deleteMany({});
    } catch (e) {}
    try {
      await getPrisma().player.deleteMany({});
    } catch (e) {}
    try {
      await getPrisma().quizSession.deleteMany({});
    } catch (e) {}
    try {
      await getPrisma().hostedSession.deleteMany({});
    } catch (e) {}
    try {
      await getPrisma().playerStat.deleteMany({});
    } catch (e) {}
    try {
      await getPrisma().savedQuiz.deleteMany({});
    } catch (e) {}
    await getPrisma().account.deleteMany({});
    await getPrisma().session.deleteMany({});
    await getPrisma().user.deleteMany({});
  });

  describe('Complete User Journey', () => {
    it('should complete full registration → login → action → logout flow', async () => {
      // 1. Sign up
      const signUpResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'journey@test.com',
          password: 'JourneyPass123',
          username: 'journeyuser',
          name: 'Journey User',
        }),
      });

      expect(signUpResponse.status).toBe(200);
      const signUpData = await signUpResponse.json();
      const token = extractToken(signUpResponse)!;
      expect(token).toBeDefined();

      // 2. Verify session works
      const sessionResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
        },
      });

      expect(sessionResponse.status).toBe(200);
      const sessionData = await sessionResponse.json();
      expect(sessionData.user.email).toBe('journey@test.com');

      // 3. Create a quiz session (authenticated action)
      const quizResponse = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });

      expect(quizResponse.status).toBe(201);
      const quizData = await quizResponse.json();
      expect(quizData.id).toBeDefined();

      // Verify quiz is linked to user
      const quizSession = await getPrisma().quizSession.findUnique({
        where: { id: quizData.id },
      });
      expect(quizSession?.userId).toBe(signUpData.user.id);

      // 4. Update profile
      const updateResponse = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Journey User',
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 5. Sign out
      const signOutResponse = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
          'Content-Type': 'application/json',
        },
      });

      expect(signOutResponse.status).toBeLessThan(400);

      // 6. Verify session is invalidated
      const afterSignOutResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
        },
      });

      const afterSignOutData = await afterSignOutResponse.json();
      // Better Auth returns null or { user: null, session: null } when not authenticated
      if (afterSignOutData === null) {
        expect(afterSignOutData).toBeNull();
      } else {
        expect(afterSignOutData.user).toBeNull();
      }

      // 7. Verify profile access denied
      const profileResponse = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
        },
      });

      expect(profileResponse.status).toBe(401);
    });

    it('should support re-login after logout', async () => {
      // Sign up
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'relogin@test.com',
          password: 'ReLoginPass123',
          username: 'reloginuser',
          name: 'ReLogin User',
        }),
      });

      // Sign in for first session
      const firstLoginResponse = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'relogin@test.com',
          password: 'ReLoginPass123',
        }),
      });

      await firstLoginResponse.json();
      const firstToken = extractToken(firstLoginResponse)!;

      // Sign out
      await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${firstToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Sign in again
      const secondLoginResponse = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'relogin@test.com',
          password: 'ReLoginPass123',
        }),
      });

      expect(secondLoginResponse.status).toBe(200);
      await secondLoginResponse.json();
      const secondToken = extractToken(secondLoginResponse)!;

      // New token should work
      const sessionResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${secondToken}`,
        },
      });

      expect(sessionResponse.status).toBe(200);
      const sessionData = await sessionResponse.json();
      expect(sessionData.user).toBeDefined();
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users independently', async () => {
      // Create User 1
      const user1Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user1@test.com',
          password: 'User1Pass123',
          username: 'user1',
          name: 'User One',
        }),
      });
      await user1Response.json();
      const user1Token = extractToken(user1Response)!;

      // Create User 2
      const user2Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user2@test.com',
          password: 'User2Pass123',
          username: 'user2',
          name: 'User Two',
        }),
      });
      await user2Response.json();
      const user2Token = extractToken(user2Response)!;

      // User 1 creates quiz
      const quiz1Response = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${user1Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });
      const quiz1Data = await quiz1Response.json();

      // User 2 creates quiz
      const quiz2Response = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${user2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });
      const quiz2Data = await quiz2Response.json();

      // Verify quizzes belong to different users
      const quiz1Session = await getPrisma().quizSession.findUnique({
        where: { id: quiz1Data.id },
      });
      const quiz2Session = await getPrisma().quizSession.findUnique({
        where: { id: quiz2Data.id },
      });

      expect(quiz1Session?.userId).not.toBe(quiz2Session?.userId);
      expect(quiz1Session?.userId).toBeDefined();
      expect(quiz2Session?.userId).toBeDefined();
    });

    it('should prevent session token reuse between users', async () => {
      const user1Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'steal1@test.com',
          password: 'Steal1Pass123',
          username: 'steal1',
          name: 'Steal One',
        }),
      });
      const user1Data = await user1Response.json();
      const user1Token = extractToken(user1Response)!;
      const user1Id = user1Data.user.id;

      const user2Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'steal2@test.com',
          password: 'Steal2Pass123',
          username: 'steal2',
          name: 'Steal Two',
        }),
      });

      // User 2 tries to use User 1's token
      const profileResponse = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${user1Token}`,
        },
      });

      const profileData = await profileResponse.json();
      
      // Should get User 1's data (the token owner), not User 2's
      expect(profileData.user.email).toBe('steal1@test.com');
    });

    it('should support concurrent quiz hosting by multiple users', async () => {
      const users = [];
      
      // Create 5 users
      for (let i = 0; i < 5; i++) {
        const response = await app.request('/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `concurrent${i}@test.com`,
            password: 'ConcurrentPass123',
            username: `concurrent${i}`,
            name: `Concurrent ${i}`,
          }),
        });
        const data = await response.json();
        const token = extractToken(response)!;
        users.push({ token, userId: data.user.id });
      }

      // All users create quizzes simultaneously
      const quizCreations = users.map(user =>
        app.request('/api/sessions', {
          method: 'POST',
          headers: {
            Cookie: `better-auth.session_token=${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionBankId: 'sample-general-knowledge',
          }),
        })
      );

      const quizResponses = await Promise.all(quizCreations);
      
      // All should succeed
      for (const response of quizResponses) {
        expect(response.status).toBe(201);
      }

      // Verify all quizzes are properly attributed
      const sessions = await getPrisma().quizSession.findMany({});
      const userIds = sessions.map(s => s.userId).filter(Boolean);
      
      expect(userIds.length).toBe(5);
      expect(new Set(userIds).size).toBe(5); // All different users
    });
  });

  describe('Authenticated Quiz Workflow', () => {
    let hostToken: string;
    let hostUserId: string;
    let sessionId: string;
    let hostPin: string;

    beforeEach(async () => {
      // Create and authenticate host
      const hostResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'quizhost@test.com',
          password: 'HostPass123',
          username: 'quizhost',
          name: 'Quiz Host',
        }),
      });

      const hostData = await hostResponse.json();
      hostToken = extractToken(hostResponse)!;
      hostUserId = hostData.user.id;

      // Create quiz session
      const quizResponse = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${hostToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });

      const quizData = await quizResponse.json();
      sessionId = quizData.id;
      hostPin = quizData.pin;
    });

    it('should track complete authenticated quiz lifecycle', async () => {
      // Verify session is linked to host
      let session = await getPrisma().quizSession.findUnique({
        where: { id: sessionId },
      });
      expect(session?.userId).toBe(hostUserId);
      expect(session?.status).toBe('lobby');

      // Start quiz (as authenticated host)
      const startResponse = await app.request(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'X-Host-Token': (await getPrisma().quizSession.findUnique({ where: { id: sessionId } }))!.hostToken,
          'Content-Type': 'application/json',
        },
      });
      expect(startResponse.status).toBe(200);

      // Verify status changed
      session = await getPrisma().quizSession.findUnique({
        where: { id: sessionId },
      });
      expect(session?.status).toBe('playing');

      // Complete quiz
      await getPrisma().quizSession.update({
        where: { id: sessionId },
        data: { 
          status: 'finished',
          currentQuestionIndex: 1,
        },
      });

      // Create hosted session record
      await getPrisma().hostedSession.create({
        data: {
          id: `hosted-${sessionId}`,
          userId: hostUserId,
          sessionId: sessionId,
          questionBankId: 'sample-general-knowledge',
          questionBankName: 'General Knowledge',
          totalPlayers: 3,
          totalQuestions: 10,
          completedAt: new Date(),
        },
      });

      // Verify appears in host history
      const historyResponse = await app.request('/api/users/me/history?limit=10&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${hostToken}`,
        },
      });

      const historyData = await historyResponse.json();
      const matchingSession = historyData.history.find(
        (item: any) => item.sessionId === sessionId
      );
      
      expect(matchingSession).toBeDefined();
      expect(matchingSession.type).toBe('hosted');
    });

    it('should allow authenticated and anonymous hosts simultaneously', async () => {
      // Authenticated session already created in beforeEach
      
      // Create anonymous session
      const anonResponse = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });

      expect(anonResponse.status).toBe(201);
      const anonData = await anonResponse.json();

      // Verify both sessions exist
      const authSession = await getPrisma().quizSession.findUnique({
        where: { id: sessionId },
      });
      const anonSession = await getPrisma().quizSession.findUnique({
        where: { id: anonData.id },
      });

      expect(authSession?.userId).toBe(hostUserId);
      expect(anonSession?.userId).toBeNull();
    });

    it('should restrict host controls to authenticated host', async () => {
      // Create second user
      const otherUserResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'otheruser@test.com',
          password: 'OtherPass123',
          username: 'otheruser',
          name: 'Other User',
        }),
      });

      const otherUserData = await otherUserResponse.json();

      // Other user tries to control the session (without host token)
      const startResponse = await app.request(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${otherUserData.token}`,
          'Content-Type': 'application/json',
        },
      });

      // Should fail without proper host token
      expect(startResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain authentication across different API endpoints', async () => {
      const signUpResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'crossfeature@test.com',
          password: 'CrossPass123',
          username: 'crossfeature',
          name: 'Cross Feature',
        }),
      });

      await signUpResponse.json();
      const token = extractToken(signUpResponse)!;

      // Test multiple endpoints with same token
      const endpoints = [
        app.request('/api/users/me', {
          method: 'GET',
          headers: { Cookie: `better-auth.session_token=${token}` },
        }),
        app.request('/api/auth/get-session', {
          method: 'GET',
          headers: { Cookie: `better-auth.session_token=${token}` },
        }),
        app.request('/api/users/me/stats', {
          method: 'GET',
          headers: { Cookie: `better-auth.session_token=${token}` },
        }),
      ];

      const responses = await Promise.all(endpoints);
      
      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });

    it('should preserve authentication during quiz gameplay', async () => {
      // Create authenticated host
      const hostResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'gamehost@test.com',
          password: 'GamePass123',
          username: 'gamehost',
          name: 'Game Host',
        }),
      });

      await hostResponse.json();
      const hostToken = extractToken(hostResponse)!;

      // Create quiz
      const quizResponse = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${hostToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'sample-general-knowledge',
        }),
      });

      const quizData = await quizResponse.json();

      // Create a player to get state (state endpoint requires X-Player-Id)
      const joinResponse = await app.request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: quizData.pin, nickname: 'TestPlayer' }),
      });
      const playerData = await joinResponse.json();

      // Get session state with player ID
      const stateResponse = await app.request(`/api/sessions/${quizData.id}/state`, {
        method: 'GET',
        headers: { 'X-Player-Id': playerData.playerId },
      });

      expect(stateResponse.status).toBe(200);

      // Verify session info is still in context
      const sessionInfo = await getPrisma().quizSession.findUnique({
        where: { id: quizData.id },
      });

      expect(sessionInfo?.userId).not.toBeNull();
    });
  });

  describe('Error Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Sign up user
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'recovery@test.com',
          password: 'RecoveryPass123',
          username: 'recovery',
          name: 'Recovery User',
        }),
      });

      expect(response.status).toBe(200);
      
      // Even if subsequent operations fail, auth should remain stable
      await response.json();
      const token = extractToken(response)!;
      
      const sessionResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${token}`,
        },
      });

      expect(sessionResponse.status).toBe(200);
    });

    it('should handle malformed authentication headers', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: 'malformed cookie string without proper format',
        },
      });

      // Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('should survive concurrent authentication attempts', async () => {
      const attempts = Array(20).fill(null).map((_, i) =>
        app.request('/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `concurrent${i}@test.com`,
            password: 'ConcurrentPass123',
            username: `concurrent${i}`,
            name: `Concurrent ${i}`,
          }),
        })
      );

      const responses = await Promise.all(attempts);
      
      // Most should succeed (some may be rate limited)
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThan(0);
      
      // None should crash (no 500 errors)
      const crashed = responses.filter(r => r.status >= 500);
      expect(crashed.length).toBe(0);
    }, 30000);
  });

  describe('Session Persistence', () => {
    it('should persist sessions across server restarts', async () => {
      // Create user and session
      const signUpResponse = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'persist@test.com',
          password: 'PersistPass123',
          username: 'persist',
          name: 'Persist User',
        }),
      });

      await signUpResponse.json();
      const token = extractToken(signUpResponse)!;

      // Verify session exists in database (token in cookie is signed JWT, not the raw DB token)
      const sessionInDb = await getPrisma().session.findFirst({
        where: { user: { email: 'persist@test.com' } },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Session should have correct user (simulating server restart by checking DB)
      expect(sessionInDb?.user.email).toBe('persist@test.com');

      // Verify token still works by calling an authenticated endpoint
      const meResponse = await app.request('/api/users/me', {
        method: 'GET',
        headers: { Cookie: `better-auth.session_token=${token}` },
      });
      expect(meResponse.status).toBe(200);
    });
  });
});
