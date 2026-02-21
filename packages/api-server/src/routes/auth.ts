import { Hono } from 'hono';
import { auth } from '../auth/config.js';

/**
 * Authentication routes
 * Delegates all auth handling to Better Auth
 * 
 * Endpoints provided by Better Auth:
 * - POST /api/auth/sign-up - Create account
 * - POST /api/auth/sign-in/email - Login with email/password
 * - POST /api/auth/sign-out - Logout
 * - GET /api/auth/get-session - Get current session
 * - POST /api/auth/forgot-password - Request password reset (Phase 9F+)
 * - POST /api/auth/reset-password - Reset password (Phase 9F+)
 * - OAuth routes (Phase 9F+):
 *   - GET /api/auth/sign-in/google
 *   - GET /api/auth/callback/google
 *   - GET /api/auth/sign-in/github
 *   - GET /api/auth/callback/github
 */
const authRoutes = new Hono();

// Better Auth handles all routes under /api/auth/*
authRoutes.all('/*', async (c) => {
  return auth.handler(c.req.raw);
});

export default authRoutes;
