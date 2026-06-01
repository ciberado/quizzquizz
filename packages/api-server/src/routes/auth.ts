import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ImapFlow } from 'imapflow';
import { auth } from '../auth/config.js';
import { getPrisma } from '../db/index.js';
import { generateId } from '@quizzquizz/common';
import { authMiddleware, requireAuth } from '../auth/middleware.js';

type AuthVars = {
  Variables: {
    user: {
      id: string;
      email: string;
      username: string;
      name?: string;
      isAdmin: boolean;
      mustChangePassword: boolean;
    } | null;
  };
};

const authRoutes = new Hono<AuthVars>();

const IMAP_HOST = process.env.IMAP_HOST ?? '';
const IMAP_PORT = parseInt(process.env.IMAP_PORT ?? '993', 10);
const IMAP_TLS = process.env.IMAP_TLS !== 'false'; // default true

/**
 * GET /api/auth/capabilities
 * Returns which auth methods are available based on server configuration.
 * Used by frontends to conditionally show IMAP login option.
 */
authRoutes.get('/capabilities', (c) => {
  return c.json({ imapEnabled: Boolean(IMAP_HOST) });
});

/**
 * POST /api/auth/imap-sign-in
 * Authenticates a user against the configured IMAP server.
 * On success, finds or creates the user record and creates a session.
 */
authRoutes.post(
  '/imap-sign-in',
  zValidator('json', z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (c) => {
    if (!IMAP_HOST) {
      return c.json({ error: 'IMAP authentication is not configured' }, 400);
    }

    const { email, password } = c.req.valid('json');

    // Validate credentials against IMAP server
    const imapValid = await verifyImapCredentials(email, password);
    if (!imapValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const prisma = getPrisma();

    // Find or create the user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const localPart = email.split('@')[0]!.replace(/[^a-zA-Z0-9_]/g, '_') || 'user';
      let username = localPart;
      // Deduplicate username if taken
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        username = `${localPart}_${generateId().slice(0, 6)}`;
      }
      user = await prisma.user.create({
        data: {
          id: generateId(),
          email,
          emailVerified: true,
          username,
          name: localPart,
        },
      });
      // Create an IMAP account entry (no password stored — auth is always via IMAP)
      await prisma.account.create({
        data: {
          id: generateId(),
          userId: user.id,
          accountId: email,
          providerId: 'imap',
        },
      });
    }

    // Create a session in the DB (same schema as Better Auth sessions)
    const sessionToken = generateId() + generateId(); // ~72 chars of entropy
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.session.create({
      data: {
        id: generateId(),
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
        userAgent: c.req.header('user-agent') ?? null,
      },
    });

    // Set the Better Auth session cookie
    const secure = process.env.PRODUCTION_HTTPS === 'true';
    const cookieName = secure ? '__Secure-better-auth.session_token' : 'better-auth.session_token';
    const cookieFlags = [
      `${cookieName}=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${7 * 24 * 60 * 60}`,
      ...(secure ? ['Secure'] : []),
    ].join('; ');

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          isAdmin: user.isAdmin,
          mustChangePassword: user.mustChangePassword,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieFlags,
        },
      }
    );
  }
);

/**
 * POST /api/auth/change-password
 * Allows an authenticated user to change their own password (especially after
 * a forced reset). Clears mustChangePassword on success.
 * This lives under /api/auth/ so it is exempt from the PASSWORD_RESET_REQUIRED guard.
 */
authRoutes.post(
  '/change-password',
  authMiddleware,
  requireAuth,
  zValidator(
    'json',
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    })
  ),
  async (c) => {
    const user = c.get('user')!;
    const { currentPassword, newPassword } = c.req.valid('json');

    // Use Better Auth's change-password endpoint internally
    const changeReq = new Request(`${process.env.BETTER_AUTH_BASE_URL ?? 'http://localhost:3000'}/api/auth/change-password`, {
      method: 'POST',
      headers: c.req.raw.headers,
      body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }),
    });

    const result = await auth.handler(changeReq);
    if (!result.ok) {
      const body = await result.json().catch(() => ({})) as Record<string, unknown>;
      return c.json({ error: (body as { message?: string }).message ?? 'Failed to change password' }, 400);
    }

    // Clear mustChangePassword flag
    await getPrisma().user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });

    return c.json({ success: true });
  }
);

/**
 * All other /api/auth/* requests are delegated to Better Auth.
 * IMPORTANT: keep this last so custom routes above take precedence.
 */
authRoutes.all('/*', async (c) => {
  return auth.handler(c.req.raw);
});

async function verifyImapCredentials(email: string, password: string): Promise<boolean> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_TLS,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.logout();
    return true;
  } catch {
    return false;
  }
}

export default authRoutes;
