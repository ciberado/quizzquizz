import { Context, Next } from 'hono';
import { auth } from './config.js';
import { getPrisma } from '../db/index.js';

/**
 * Extended context with user information
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
    image?: string;
    isAdmin: boolean;
    mustChangePassword: boolean;
  } | null;
}

/**
 * Authentication middleware
 * Adds user information to context if authenticated
 * Sets c.get('user') to user object or null
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    
    if (session?.user) {
      // Fetch isAdmin and mustChangePassword from the database
      // (Better Auth session doesn't include custom fields)
      let isAdmin = false;
      let mustChangePassword = false;
      try {
        const dbUser = await getPrisma().user.findUnique({
          where: { id: session.user.id },
          select: { isAdmin: true, mustChangePassword: true },
        });
        isAdmin = dbUser?.isAdmin ?? false;
        mustChangePassword = dbUser?.mustChangePassword ?? false;
      } catch {
        // Non-fatal: if we can't fetch custom fields, treat as non-admin
      }
      c.set('user', { ...session.user, isAdmin, mustChangePassword });
    } else {
      c.set('user', null);
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    c.set('user', null);
  }
  
  await next();
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated.
 * Returns 403 PASSWORD_RESET_REQUIRED if the user must change their password
 * (allows /api/auth/* and /api/admin/change-password to pass through).
 */
export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized - Authentication required' }, 401);
  }

  if (user.mustChangePassword) {
    const path = new URL(c.req.url).pathname;
    if (!path.startsWith('/api/auth/')) {
      return c.json({ error: 'PASSWORD_RESET_REQUIRED' }, 403);
    }
  }
  
  await next();
}

/**
 * Optional authentication middleware
 * Does not block if user is not authenticated
 * Use this for endpoints that work for both authenticated and anonymous users
 */
export async function optionalAuth(c: Context, next: Next) {
  await authMiddleware(c, next);
}

/**
 * Require admin middleware
 * Returns 401 if not authenticated, 403 if authenticated but not admin
 */
export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized - Authentication required' }, 401);
  }

  if (!user.isAdmin) {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}
