import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireAuth } from './middleware.js';
import { getPrisma } from '../db/index.js';
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
 * Authentication Middleware Tests
 * 
 * CRITICAL: Tests the auth middleware that protects routes and
 * injects user context into request handlers.
 * 
 * Test Coverage:
 * - User context injection
 * - Protected route access control
 * - Unauthenticated request handling
 * - Invalid token handling
 * - Expired session handling
 */

describe('Auth Middleware', () => {
  let testApp: Hono;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Clean database
    await getPrisma().account.deleteMany({});
    await getPrisma().session.deleteMany({});
    await getPrisma().user.deleteMany({});

    // Create test user using Better Auth sign-up (proper way to get signed tokens)
    const signUpResponse = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'middleware@test.com',
        password: 'TestPass123',
        username: 'middlewaretest',
        name: 'Middleware Test',
      }),
    });
    
    const signUpData = await signUpResponse.json();
    userId = signUpData.user.id;
    authToken = extractToken(signUpResponse)!;

    // Setup test app
    testApp = new Hono();
    
    // Apply middleware to all routes
    testApp.use('*', authMiddleware);
    
    // Public route (no requireAuth)
    testApp.get('/public', (c) => {
      const user = c.get('user');
      return c.json({ 
        message: 'public route',
        authenticated: !!user,
        userId: user?.id || null,
      });
    });
    
    // Protected route (with requireAuth)
    testApp.get('/protected', requireAuth, (c) => {
      const user = c.get('user');
      return c.json({ 
        message: 'protected route',
        userId: user?.id,
        username: user?.username,
      });
    });

    // Route using user context
    testApp.get('/profile', (c) => {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'Not authenticated' }, 401);
      }
      return c.json({ 
        userId: user.id,
        email: user.email,
      });
    });
  });

  describe('authMiddleware', () => {
    it('should inject user context for authenticated requests', async () => {
      const response = await testApp.request('/public', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.authenticated).toBe(true);
      expect(data.userId).toBe(userId);
    });

    it('should handle unauthenticated requests gracefully', async () => {
      const response = await testApp.request('/public', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.authenticated).toBe(false);
      expect(data.userId).toBeNull();
    });

    it('should set user to null for invalid tokens', async () => {
      const response = await testApp.request('/public', {
        method: 'GET',
        headers: {
          Cookie: 'better-auth.session_token=invalid-token-xyz',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.authenticated).toBe(false);
      expect(data.userId).toBeNull();
    });

    it('should handle expired sessions', async () => {
      // Sign out to invalidate the session
      await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      // Try to use the now-invalid session
      const response = await testApp.request('/public', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const data = await response.json();
      expect(data.authenticated).toBe(false);
    });

    it('should work with multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        testApp.request('/public', {
          method: 'GET',
          headers: {
            Cookie: `better-auth.session_token=${authToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);
      
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.authenticated).toBe(true);
      }
    });
  });

  describe('requireAuth', () => {
    it('should allow access to authenticated users', async () => {
      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.message).toBe('protected route');
      expect(data.userId).toBe(userId);
      expect(data.username).toBe('middlewaretest');
    });

    it('should block unauthenticated requests', async () => {
      const response = await testApp.request('/protected', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should block requests with invalid tokens', async () => {
      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          Cookie: 'better-auth.session_token=invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should provide detailed error messages', async () => {
      const response = await testApp.request('/protected', {
        method: 'GET',
      });

      const data = await response.json();
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('User Context', () => {
    it('should include all necessary user fields', async () => {
      const response = await testApp.request('/profile', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('email');
      expect(data.email).toBe('middleware@test.com');
    });

    it('should not include sensitive fields like password', async () => {
      const response = await testApp.request('/public', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}`,
        },
      });

      const jsonString = JSON.stringify(await response.json());
      expect(jsonString).not.toContain('password');
      expect(jsonString).not.toContain('hashed');
    });
  });

  describe('Session Validation', () => {
    it('should handle database errors gracefully', async () => {
      // Use malformed token that might cause DB issues
      const response = await testApp.request('/public', {
        method: 'GET',
        headers: {
          Cookie: 'better-auth.session_token=' + 'x'.repeat(1000),
        },
      });

      // Should not crash, should handle gracefully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Cookie Parsing', () => {
    it('should parse session token from cookie header', async () => {
      const response = await testApp.request('/profile', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${authToken}; other_cookie=value`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe(userId);
    });

    it('should handle multiple cookies correctly', async () => {
      const response = await testApp.request('/profile', {
        method: 'GET',
        headers: {
          Cookie: `first=value1; better-auth.session_token=${authToken}; last=value3`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should handle missing cookie header', async () => {
      const response = await testApp.request('/public', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authenticated).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency authentication checks efficiently', async () => {
      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await testApp.request('/public', {
          method: 'GET',
          headers: {
            Cookie: `better-auth.session_token=${authToken}`,
          },
        });
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      // Each auth check should be fast (< 50ms average)
      expect(avgTime).toBeLessThan(50);
    }, 30000);
  });
});
