import { Context, Next } from 'hono';
import { auth } from './config.js';

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
      c.set('user', session.user);
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
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized - Authentication required' }, 401);
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
