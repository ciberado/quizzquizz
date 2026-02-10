/**
 * Session cleanup utilities
 * Handles expiration and deletion of old sessions
 */

import { getPrisma } from './db';

/**
 * Delete expired sessions and their associated data
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = BigInt(Date.now());

  try {
    const expiredSessions = await getPrisma().session.findMany({
      where: {
        expiresAt: {
          not: null,
          lte: now,
        },
      },
      select: { id: true },
    });

    if (expiredSessions.length === 0) {
      return 0;
    }

    // Delete expired sessions (cascade will delete players and answers)
    const result = await getPrisma().session.deleteMany({
      where: {
        id: {
          in: expiredSessions.map((s) => s.id),
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired session(s)`);
    return result.count;
  } catch (error) {
    console.error('❌ Error during session cleanup:', error);
    return 0;
  }
}

/**
 * Mark abandoned sessions (in lobby for >1 hour without starting)
 * @returns Number of sessions marked as abandoned
 */
export async function markAbandonedSessions(): Promise<number> {
  const oneHourAgo = BigInt(Date.now() - 60 * 60 * 1000);

  try {
    // Find sessions still in lobby that are over 1 hour old
    const result = await getPrisma().session.updateMany({
      where: {
        status: 'lobby',
        createdAt: {
          lt: oneHourAgo,
        },
      },
      data: {
        status: 'abandoned',
      },
    });

    if (result.count > 0) {
      console.log(`⚠️  Marked ${result.count} session(s) as abandoned`);
    }
    return result.count;
  } catch (error) {
    console.error('❌ Error marking abandoned sessions:', error);
    return 0;
  }
}

/**
 * Start background cleanup job
 * Runs cleanup every specified interval (default: 1 hour)
 */
export function startCleanupJob(intervalMinutes: number = 60): NodeJS.Timeout {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`⏰ Starting session cleanup job (runs every ${intervalMinutes} minutes)`);

  // Run cleanup immediately on startup
  (async () => {
    await markAbandonedSessions();
    await cleanupExpiredSessions();
  })();

  // Then run periodically
  return setInterval(async () => {
    await markAbandonedSessions();
    await cleanupExpiredSessions();
  }, intervalMs);
}
