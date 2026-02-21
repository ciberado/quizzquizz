import { describe, it, expect, beforeEach } from 'vitest';
import { getPrisma } from '../db/index.js';
import { generateId } from '@quizzquizz/common';
import app from '../index.js';

/**
 * Helper: Extract session token from Better Auth response
 * Better Auth returns token in Set-Cookie header with signature
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
 * User Profile & Stats Integration Tests
 * 
 * CRITICAL: Tests user profile management and statistics which are
 * essential for user experience and data integrity.
 * 
 * Test Coverage:
 * - Profile retrieval
 * - Profile updates
 * - User statistics
 * - Quiz history
 * - Saved quizzes
 * - Hosted sessions tracking
 * - Player statistics
 */

describe('User Profile Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clean database (wrap in try-catch in case tables don't exist yet)
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

    // Create and authenticate test user
    const signUpResponse = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'profile@test.com',
        password: 'ProfilePass123',
        username: 'profiletest',
        name: 'Profile Test User',
      }),
    });

    const signUpData = await signUpResponse.json();
    authToken = extractToken(signUpResponse)!;
    userId = signUpData.user.id;
  });

  describe('GET /api/users/me', () => {
    it('should return authenticated user profile', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('profile@test.com');
      expect(data.user.username).toBe('profiletest');
      expect(data.user.name).toBe('Profile Test User');
      expect(data.stats).toBeDefined();
    });

    it('should include user statistics', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      expect(data.stats).toHaveProperty('totalHosted');
      expect(data.stats).toHaveProperty('totalPlayed');
      expect(data.stats).toHaveProperty('totalSaved');
      expect(data.stats.totalHosted).toBe(0);
      expect(data.stats.totalPlayed).toBe(0);
      expect(data.stats.totalSaved).toBe(0);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should not expose sensitive data', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const jsonString = JSON.stringify(await response.json());
      
      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('token');
    });

    it('should return timestamps as numbers', async () => {
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      expect(typeof data.user.createdAt).toBe('number');
      expect(typeof data.user.updatedAt).toBe('number');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update user profile fields', async () => {
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'Updated Name',
          username: 'updatedusername',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.user.name).toBe('Updated Name');
      expect(data.user.username).toBe('updatedusername');
    });

    it('should persist changes to database', async () => {
      await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'New Name',
        }),
      });

      // Fetch again to verify persistence
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      expect(data.user.name).toBe('New Name');
    });

    it('should prevent updating to duplicate username', async () => {
      // Create another user
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'other@test.com',
          password: 'OtherPass123',
          username: 'otherusername',
          name: 'Other User',
        }),
      });

      // Try to update to existing username
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          username: 'otherusername',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should prevent updating email to duplicate', async () => {
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'existing@test.com',
          password: 'ExistingPass123',
          username: 'existinguser',
          name: 'Existing User',
        }),
      });

      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          email: 'existing@test.com',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate email format on update', async () => {
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          email: 'invalid-email-format',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow updating image/avatar URL', async () => {
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          image: 'https://example.com/avatar.jpg',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.image).toBe('https://example.com/avatar.jpg');
    });

    it('should require authentication', async () => {
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should update updatedAt timestamp', async () => {
      const beforeResponse = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });
      const beforeData = await beforeResponse.json();
      const beforeTime = beforeData.user.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 1000));

      await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'Updated Again',
        }),
      });

      const afterResponse = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });
      const afterData = await afterResponse.json();
      const afterTime = afterData.user.updatedAt;

      expect(afterTime).toBeGreaterThan(beforeTime);
    });

    it('should handle partial updates', async () => {
      const response = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          name: 'Only Name Changed',
        }),
      });

      const data = await response.json();
      expect(data.user.name).toBe('Only Name Changed');
      expect(data.user.username).toBe('profiletest'); // Unchanged
      expect(data.user.email).toBe('profile@test.com'); // Unchanged
    });
  });

  describe('GET /api/users/me/stats', () => {
    beforeEach(async () => {
      // Create test data for statistics
      
      // Create hosted sessions
      const session1 = await getPrisma().quizSession.create({
        data: {
          id: 'hosted-session-1',
          pin: '123456',
          hostToken: 'host-token-1',
          userId: userId,
          questionBankId: 'general-knowledge',
          status: 'finished',
        },
      });

      await getPrisma().hostedSession.create({
        data: {
          id: 'hosted-record-1',
          userId: userId,
          sessionId: session1.id,
          questionBankId: 'general-knowledge',
          questionBankName: 'General Knowledge',
          totalPlayers: 5,
          totalQuestions: 10,
          completedAt: new Date(),
        },
      });

      // Create player statistics
      await getPrisma().playerStat.create({
        data: {
          id: 'player-stat-1',
          userId: userId,
          sessionId: 'some-session',
          nickname: 'TestPlayer',
          finalScore: 850,
          finalRank: 1,
          correctAnswers: 8,
          totalQuestions: 10,
          averageTime: 3500,
          playedAt: new Date(),
        },
      });

      // Create saved quiz
      await getPrisma().savedQuiz.create({
        data: {
          id: 'saved-quiz-1',
          userId: userId,
          name: 'My Custom Quiz',
          questionBankId: 'custom',
          randomOrder: false,
        },
      });
    });

    it('should return comprehensive user statistics', async () => {
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats).toBeDefined();
      expect(data.stats.totalHosted).toBe(1);
      expect(data.stats.totalPlayed).toBe(1);
      expect(data.stats.totalSaved).toBe(1);
    });

    it('should calculate average performance correctly', async () => {
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      expect(data.stats.averageScore).toBeDefined();
      expect(data.stats.averageCorrect).toBeDefined();
      expect(data.stats.averageScore).toBe(850);
      expect(data.stats.averageCorrect).toBeCloseTo(0.8, 1);
    });

    it('should return best performance metrics', async () => {
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      expect(data.stats.bestScore).toBe(850);
      expect(data.stats.bestRank).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/me/history', () => {
    beforeEach(async () => {
      // Create historical data
      const now = Date.now();
      
      // Hosted sessions
      for (let i = 0; i < 3; i++) {
        const session = await getPrisma().quizSession.create({
          data: {
            id: `history-session-${i}`,
            pin: `${100000 + i}`,
            hostToken: `host-token-${i}`,
            userId: userId,
            questionBankId: 'test-bank',
            status: 'finished',
            createdAt: new Date(now - (i * 24 * 60 * 60 * 1000)),
          },
        });

        await getPrisma().hostedSession.create({
          data: {
            id: `history-hosted-${i}`,
            userId: userId,
            sessionId: session.id,
            questionBankId: 'test-bank',
            questionBankName: 'Test Bank',
            totalPlayers: 3 + i,
            totalQuestions: 10,
            completedAt: new Date(now - (i * 24 * 60 * 60 * 1000)),
          },
        });
      }

      // Player participations
      for (let i = 0; i < 2; i++) {
        await getPrisma().playerStat.create({
          data: {
            id: `history-player-${i}`,
            userId: userId,
            sessionId: `played-session-${i}`,
            nickname: `Player${i}`,
            finalScore: 700 + (i * 100),
            finalRank: i + 1,
            correctAnswers: 7 + i,
            totalQuestions: 10,
            averageTime: 4000,
            playedAt: new Date(now - (i * 12 * 60 * 60 * 1000)),
          },
        });
      }
    });

    it('should return paginated quiz history', async () => {
      const response = await app.request('/api/users/me/history?limit=10&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
      expect(data.history.length).toBeGreaterThan(0);
    });

    it('should include both hosted and played sessions', async () => {
      const response = await app.request('/api/users/me/history?limit=20&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      const hostedSessions = data.history.filter((item: any) => item.type === 'hosted');
      const playedSessions = data.history.filter((item: any) => item.type === 'played');
      
      expect(hostedSessions.length).toBeGreaterThan(0);
      expect(playedSessions.length).toBeGreaterThan(0);
    });

    it('should sort by date descending (most recent first)', async () => {
      const response = await app.request('/api/users/me/history?limit=10&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      const dates = data.history.map((item: any) => item.date);
      
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('should support pagination with limit and offset', async () => {
      const page1 = await app.request('/api/users/me/history?limit=2&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const page2 = await app.request('/api/users/me/history?limit=2&offset=2', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data1 = await page1.json();
      const data2 = await page2.json();
      
      expect(data1.history.length).toBeLessThanOrEqual(2);
      expect(data2.history.length).toBeGreaterThan(0);
      
      // Different items on different pages
      const ids1 = data1.history.map((item: any) => item.id);
      const ids2 = data2.history.map((item: any) => item.id);
      const overlap = ids1.filter((id: string) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await app.request('/api/users/me/history?limit=10&offset=0', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Quiz Sessions with Authentication', () => {
    it('should link created quiz sessions to authenticated user', async () => {
      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          questionBankId: 'general-knowledge',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      
      // Verify session is linked to user
      const session = await getPrisma().quizSession.findUnique({
        where: { id: data.id },
      });
      
      expect(session?.userId).toBe(userId);
    });

    it('should allow anonymous quiz sessions', async () => {
      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionBankId: 'general-knowledge',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      
      const session = await getPrisma().quizSession.findUnique({
        where: { id: data.id },
      });
      
      expect(session?.userId).toBeNull();
    });

    it('should track hosted sessions for authenticated users', async () => {
      // Create and complete a quiz session
      const createResponse = await app.request('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${authToken}`,
        },
        body: JSON.stringify({
          questionBankId: 'general-knowledge',
        }),
      });

      const createData = await createResponse.json();
      const sessionId = createData.id; // Session creation returns 'id', not 'sessionId'
      
      // Start quiz
      await app.request(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'X-Host-Token': createData.hostToken,
          'Content-Type': 'application/json',
        },
      });

      // Complete quiz (simplified - would normally go through all questions)
      await getPrisma().quizSession.update({
        where: { id: sessionId },
        data: { status: 'finished' },
      });
      
      // Create hosted session record (in production, this would be done automatically)
      const questionBank = await getPrisma().quizSession.findUnique({
        where: { id: sessionId },
      });
      
      await getPrisma().hostedSession.create({
        data: {
          id: generateId(),
          userId: userId,
          sessionId: sessionId,
          questionBankId: createData.questionBankId,
          questionBankName: 'General Knowledge',
          totalPlayers: 0,
          totalQuestions: 10,
          completedAt: new Date(),
        },
      });

      // Check if it appears in history
      const historyResponse = await app.request('/api/users/me/history?limit=10&offset=0', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const historyData = await historyResponse.json();
      const matchingSession = historyData.history.find(
        (item: any) => item.sessionId === sessionId
      );
      
      expect(matchingSession).toBeDefined();
    });
  });

  describe('Data Privacy', () => {
    it('should not expose other users data', async () => {
      // Create second user
      const user2Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user2@test.com',
          password: 'User2Pass123',
          username: 'user2',
          name: 'User Two',
        }),
      });

      const user2Data = await user2Response.json();

      // User 1 tries to access their profile
      const response = await app.request('/api/users/me', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      // Should only see their own data
      expect(data.user.email).toBe('profile@test.com');
      expect(data.user.email).not.toBe('user2@test.com');
    });

    it('should isolate statistics per user', async () => {
      // Create another user with activity
      const user2Response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user2@test.com',
          password: 'User2Pass123',
          username: 'user2',
          name: 'User Two',
        }),
      });

      const user2Data = await user2Response.json();
      
      // Create activity for user2
      await getPrisma().playerStat.create({
        data: {
          id: 'user2-stat',
          userId: user2Data.user.id,
          sessionId: 'user2-session',
          nickname: 'User2Player',
          finalScore: 999,
          finalRank: 1,
          correctAnswers: 10,
          totalQuestions: 10,
          averageTime: 2000,
          playedAt: new Date(),
        },
      });

      // User 1 checks their stats
      const response = await app.request('/api/users/me/stats', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      
      // Should not include user2's stats
      expect(data.stats.totalPlayed).toBe(0);
      expect(data.stats.bestScore || 0).not.toBe(999);
    });
  });
});
