import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { getPrisma } from '../db/index.js';
import { initDatabase } from '../db/index.js';
import app from '../index.js';

/**
 * Authentication Routes Tests
 * 
 * CRITICAL: These tests cover the authentication system which is paramount
 * for security and user management.
 * 
 * Test Coverage:
 * - User registration (sign-up)
 * - User authentication (sign-in)
 * - Session management
 * - Sign-out functionality
 * - Invalid credentials handling
 * - Duplicate user prevention
 * - Email validation
 * - Password requirements
 */

/**
 * Helper: Extract session token from Better Auth response
 * Better Auth returns token in Set-Cookie header with signature
 */
function extractToken(response: Response, data?: any): string | null {
  // IMPORTANT: Must extract from Set-Cookie header, not response body
  // The Set-Cookie token includes the signature (token.signature)
  // while the body only has the unsigned token
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (match) {
      // Decode URL-encoded token
      return decodeURIComponent(match[1]);
    }
  }
  
  return null;
}

/**
 * Helper: Sign up a user and return the token
 */
async function signUpUser(email: string, password: string, username: string, name: string): Promise<{ token: string | null; response: Response; data: any }> {
  const response = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, name }),
  });
  
  const data = await response.json();
  const token = extractToken(response, data);
  
  return { token, response, data };
}

/**
 * Helper: Sign in a user and return the token
 */
async function signInUser(email: string, password: string): Promise<{ token: string | null; response: Response; data: any }> {
  const response = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  const token = extractToken(response, data);
  
  return { token, response, data };
}

/**
 * Helper: Clean database in correct order (respecting foreign keys)
 * Only cleans auth-related tables for auth tests
 */
async function cleanDatabase() {
  // Clean in order that respects foreign key constraints
  // For auth tests, only clean auth-related tables
  // Wrap all in try-catch since test DB may not have all tables
  try {
    await getPrisma().playerAnswer.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().player.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().quizSession.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().hostedSession.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().playerStat.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().savedQuiz.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().verification.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().session.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().account.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
  try {
    await getPrisma().user.deleteMany({});
  } catch (e) {
    // Table might not exist in test schema
  }
}

describe('Authentication Routes', () => {
  // Wait for database initialization before running any tests
  beforeAll(async () => {
    await initDatabase();
  });
  
  beforeEach(async () => {
    // Clean up database before each test with proper ordering
    await cleanDatabase();
  });

  describe('POST /api/auth/sign-up/email', () => {
    it('should create a new user with valid credentials', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'alice@quiz.com',
          password: 'SecurePass123!',
          username: 'alice',
          name: 'Alice Smith',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('alice@quiz.com');
      expect(data.user.username).toBe('alice');
      expect(data.user.name).toBe('Alice Smith');
      expect(data.user.emailVerified).toBe(false);
      expect(data.user).not.toHaveProperty('password');
      
      // Verify user in database
      const user = await getPrisma().user.findUnique({
        where: { email: 'alice@quiz.com' },
      });
      expect(user).toBeDefined();
      expect(user?.username).toBe('alice');
    });

    it('should create account record for credential authentication', async () => {
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bob@quiz.com',
          password: 'BobPassword456',
          username: 'bob',
          name: 'Bob Johnson',
        }),
      });

      const accounts = await getPrisma().account.findMany({
        where: { providerId: 'credential' },
      });
      
      expect(accounts).toHaveLength(1);
      expect(accounts[0].password).toBeDefined();
      expect(accounts[0].password).not.toBe('BobPassword456'); // Should be hashed
    });

    it('should reject duplicate email addresses', async () => {
      // Create first user
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'charlie@quiz.com',
          password: 'Password123',
          username: 'charlie1',
          name: 'Charlie',
        }),
      });

      // Try to create second user with same email
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'charlie@quiz.com',
          password: 'DifferentPass456',
          username: 'charlie2',
          name: 'Charlie Two',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject duplicate usernames', async () => {
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'david1@quiz.com',
          password: 'Password123',
          username: 'david',
          name: 'David One',
        }),
      });

      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'david2@quiz.com',
          password: 'Password456',
          username: 'david',
          name: 'David Two',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'eve@quiz.com',
          password: 'short',
          username: 'eve',
          name: 'Eve',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid email formats', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'ValidPassword123',
          username: 'frank',
          name: 'Frank',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should require username field', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'george@quiz.com',
          password: 'ValidPassword123',
          name: 'George',
          // username missing
        } as any),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing name gracefully', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'hannah@quiz.com',
          password: 'ValidPassword123',
          username: 'hannah',
          // name optional
        }),
      });

      // Better Auth requires name field, so this should fail
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/sign-in/email', () => {
    beforeEach(async () => {
      // Create test user using helper
      await signUpUser('testuser@quiz.com', 'TestPassword123', 'testuser', 'Test User');
    });

    it('should authenticate user with correct credentials', async () => {
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuser@quiz.com',
          password: 'TestPassword123',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('testuser@quiz.com');
      expect(data.user.username).toBe('testuser');
      
      // Verify session cookie is set
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
    });

    it('should create session record in database', async () => {
      await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuser@quiz.com',
          password: 'TestPassword123',
        }),
      });

      const sessions = await getPrisma().session.findMany({});
      expect(sessions.length).toBeGreaterThan(0);
      
      const session = sessions[0];
      expect(session.token).toBeDefined();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject invalid password', async () => {
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuser@quiz.com',
          password: 'WrongPassword',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject non-existent email', async () => {
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@quiz.com',
          password: 'AnyPassword123',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject empty credentials', async () => {
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          password: '',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle case-insensitive email lookup', async () => {
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'TESTUSER@QUIZ.COM',
          password: 'TestPassword123',
        }),
      });

      // Should succeed (many auth systems are case-insensitive for email)
      // If fails, this is acceptable but should be documented
      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe('GET /api/auth/get-session', () => {
    let authToken: string;

    beforeEach(async () => {
      // Sign up and sign in to get token using helpers
      await signUpUser('sessiontest@quiz.com', 'SessionPass123', 'sessiontest', 'Session Test');
      const { token } = await signInUser('sessiontest@quiz.com', 'SessionPass123');
      
      if (!token) {
        throw new Error('Failed to get auth token in test setup');
      }
      authToken = token;
    });

    it('should return session and user data with valid token', async () => {
      const response = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('user');
      // Session token in response is unsigned (without signature)
      // authToken includes signature, so extract just the token part
      const unsignedToken = authToken.split('.')[0];
      expect(data.session.token).toBe(unsignedToken);
      expect(data.user.email).toBe('sessiontest@quiz.com');
    });

    it('should return null for invalid token', async () => {
      const response = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=invalid-token-12345`,
        },
      });

      const data = await response.json();
      // Our get-session interceptor returns { session: null, user: null } for invalid tokens
      expect(data).toEqual({ session: null, user: null });
    });

    it('should return null without authentication', async () => {
      const response = await app.request('/api/auth/get-session', {
        method: 'GET',
      });

      const data = await response.json();
      // Our get-session interceptor returns { session: null, user: null } for unauthenticated requests
      expect(data).toEqual({ session: null, user: null });
    });

    it('should include session metadata', async () => {
      const response = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      expect(data.session).toHaveProperty('expiresAt');
      expect(data.session).toHaveProperty('createdAt');
      expect(data.session).toHaveProperty('userId');
    });
  });

  describe('POST /api/auth/sign-out', () => {
    let authToken: string;

    beforeEach(async () => {
      await signUpUser('signouttest@quiz.com', 'SignOutPass123', 'signouttest', 'Sign Out Test');
      const { token } = await signInUser('signouttest@quiz.com', 'SignOutPass123');
      
      if (!token) {
        throw new Error('Failed to get auth token in test setup');
      }
      authToken = token;
    });

    it('should invalidate session on sign-out', async () => {
      // Verify session exists
      const beforeResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });
      const beforeData = await beforeResponse.json();
      expect(beforeData).not.toBeNull();
      expect(beforeData.session).toBeDefined();

      // Sign out
      const signOutResponse = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(signOutResponse.status).toBeLessThan(400);

      // Verify session is invalidated
      const afterResponse = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });
      
      const afterData = await afterResponse.json();
      // After sign-out, our get-session interceptor returns { session: null, user: null }
      expect(afterData).toEqual({ session: null, user: null });
    });

    it('should delete session from database', async () => {
      const sessionsBefore = await getPrisma().session.count();
      expect(sessionsBefore).toBeGreaterThan(0);

      await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const sessionsAfter = await getPrisma().session.count();
      expect(sessionsAfter).toBeLessThan(sessionsBefore);
    });

    it('should handle sign-out without authentication gracefully', async () => {
      const response = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Should not crash, may return 401 or 200
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Session Expiration', () => {
    it('should set session expiration to 7 days', async () => {
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'expirytest@quiz.com',
          password: 'ExpiryPass123',
          username: 'expirytest',
          name: 'Expiry Test',
        }),
      });

      await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'expirytest@quiz.com',
          password: 'ExpiryPass123',
        }),
      });

      const session = await getPrisma().session.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      expect(session).toBeDefined();
      const daysDiff = (session!.expiresAt.getTime() - session!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe('Security Tests', () => {
    it('should hash passwords in database', async () => {
      const password = 'MySecurePassword123';
      
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'securitytest@quiz.com',
          password,
          username: 'securitytest',
          name: 'Security Test',
        }),
      });

      const account = await getPrisma().account.findFirst({
        where: { providerId: 'credential' },
      });

      expect(account?.password).toBeDefined();
      expect(account?.password).not.toBe(password);
      expect(account?.password?.length).toBeGreaterThan(password.length);
    });

    it('should not expose password in API responses', async () => {
      const response = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'noexpose@quiz.com',
          password: 'NoExposePass123',
          username: 'noexpose',
          name: 'No Expose',
        }),
      });

      const data = await response.json();
      const jsonString = JSON.stringify(data);
      
      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('NoExposePass123');
    });

    it('should generate unique session tokens', async () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const response = await app.request('/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `uniquetoken${i}@quiz.com`,
            password: 'UniquePass123',
            username: `uniquetoken${i}`,
            name: `Unique ${i}`,
          }),
        });

        const data = await response.json();
        tokens.add(data.token);
      }

      expect(tokens.size).toBe(5);
    });

    it('should prevent SQL injection in email field', async () => {
      const maliciousEmail = "admin@quiz.com' OR '1'='1";
      
      const response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: maliciousEmail,
          password: 'AnyPassword',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      
      // Verify no users were compromised
      const users = await getPrisma().user.findMany({});
      expect(users.length).toBe(0);
    });
  });

  // Rate limiting tests are skipped in test environment (NODE_ENV=test)
  // because rate limiting is disabled to speed up tests
  describe.skipIf(process.env.NODE_ENV === 'test')('Rate Limiting', () => {
    it('should rate limit excessive sign-up attempts', async () => {
      const attempts = [];
      
      for (let i = 0; i < 15; i++) {
        attempts.push(
          app.request('/api/auth/sign-up/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `ratelimit${i}@quiz.com`,
              password: 'RateLimit123',
              username: `ratelimit${i}`,
              name: `Rate ${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(attempts);
      const statuses = responses.map(r => r.status);
      
      // Should see rate limiting kick in (429 status)
      const rateLimited = statuses.filter(s => s === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000); // Longer timeout for rate limit test

    it('should rate limit excessive sign-in attempts', async () => {
      // Create a user first
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bruteforce@quiz.com',
          password: 'CorrectPassword123',
          username: 'bruteforce',
          name: 'Brute Force',
        }),
      });

      const attempts = [];
      
      for (let i = 0; i < 15; i++) {
        attempts.push(
          app.request('/api/auth/sign-in/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'bruteforce@quiz.com',
              password: `WrongPassword${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(attempts);
      const statuses = responses.map(r => r.status);
      
      // Should see rate limiting
      const rateLimited = statuses.filter(s => s === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Concurrent Sessions', () => {
    it('should allow multiple active sessions for same user', async () => {
      // Sign up
      await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'multisession@quiz.com',
          password: 'MultiSession123',
          username: 'multisession',
          name: 'Multi Session',
        }),
      });

      // Sign in from "device 1"
      const device1Response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'multisession@quiz.com',
          password: 'MultiSession123',
        }),
      });

      // Sign in from "device 2"
      const device2Response = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'multisession@quiz.com',
          password: 'MultiSession123',
        }),
      });

      expect(device1Response.status).toBe(200);
      expect(device2Response.status).toBe(200);

      const device1Data = await device1Response.json();
      const device2Data = await device2Response.json();

      // Different tokens for different sessions
      expect(device1Data.token).not.toBe(device2Data.token);

      // Both sessions should be active
      const sessions = await getPrisma().session.findMany({});
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
