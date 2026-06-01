import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { authMiddleware, requireAdmin } from '../auth/middleware.js';
import { hashPassword } from 'better-auth/crypto';

type AdminVars = {
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

const adminRoutes = new Hono<AdminVars>();

adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', requireAdmin);

/**
 * GET /api/admin/users
 * List all users with optional search and pagination.
 */
adminRoutes.get('/users', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10)));
  const search = c.req.query('search') ?? '';

  const prisma = getPrisma();
  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          { name: { contains: search } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isAdmin: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return c.json({
    users: users.map((u) => ({ ...u, createdAt: u.createdAt.getTime() })),
    total,
    page,
    limit,
  });
});

/**
 * PATCH /api/admin/users/:id
 * Update a user's profile or admin status.
 */
const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(30).optional(),
  isAdmin: z.boolean().optional(),
});

adminRoutes.patch('/users/:id', zValidator('json', UpdateUserSchema), async (c) => {
  const targetId = c.req.param('id');
  const data = c.req.valid('json');
  const prisma = getPrisma();

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return c.json({ error: 'User not found' }, 404);

  // Prevent demoting the last admin
  if (data.isAdmin === false && target.isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return c.json({ error: 'Cannot remove admin from the last admin user' }, 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      isAdmin: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return c.json({ user: { ...updated, createdAt: updated.createdAt.getTime() } });
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user. Prevents self-deletion.
 */
adminRoutes.delete('/users/:id', async (c) => {
  const actor = c.get('user')!;
  const targetId = c.req.param('id');

  if (actor.id === targetId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return c.json({ error: 'User not found' }, 404);

  // Prevent deleting the last admin
  if (target.isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return c.json({ error: 'Cannot delete the last admin user' }, 400);
    }
  }

  await prisma.user.delete({ where: { id: targetId } });
  return c.json({ success: true });
});

/**
 * POST /api/admin/users/:id/reset-password
 * Generates a temporary password, updates it in the DB, and sets
 * mustChangePassword=true. Returns the temporary password to the admin.
 */
adminRoutes.post('/users/:id/reset-password', async (c) => {
  const targetId = c.req.param('id');
  const prisma = getPrisma();

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return c.json({ error: 'User not found' }, 404);

  const tempPassword = generateTempPassword();
  const hashed = await hashPassword(tempPassword);

  await prisma.account.updateMany({
    where: { userId: targetId, providerId: 'credential' },
    data: { password: hashed },
  });

  await prisma.user.update({
    where: { id: targetId },
    data: { mustChangePassword: true },
  });

  return c.json({ tempPassword, message: 'Password reset. User must change it on next login.' });
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export default adminRoutes;
