import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getPrisma } from '../db/index.js';
import { authMiddleware, requireAuth } from '../auth/middleware.js';

// Extend Hono with user context
type Variables = {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  } | null;
};

/**
 * User profile and statistics routes
 */
const userRoutes = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
userRoutes.use('*', authMiddleware);

/**
 * GET /api/users/me
 * Get current user profile with statistics
 */
userRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const prisma = getPrisma();
    
    // Get user profile with counts
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        _count: {
          select: {
            hostedSessions: true,
            playerStats: true,
            savedQuizzes: true,
          },
        },
      },
    });
    
    if (!profile) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Convert Date objects to timestamps for JSON serialization
    const userData = {
      ...profile,
      createdAt: profile.createdAt.getTime(),
      updatedAt: profile.updatedAt.getTime(),
    };

    // Remove internal fields
    const { _count, ...userResponse } = userData;
    
    return c.json({
      user: userResponse,
      stats: {
        totalHosted: profile._count.hostedSessions,
        totalPlayed: profile._count.playerStats,
        totalSaved: profile._count.savedQuizzes,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
});

userRoutes.patch('/me', requireAuth, zValidator('json', UpdateProfileSchema), async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const updates = c.req.valid('json');
  
  try {
    const prisma = getPrisma();
    
    // Check if username is taken (if updating username)
    if (updates.username) {
      const existing = await prisma.user.findUnique({
        where: { username: updates.username },
      });
      
      if (existing && existing.id !== user.id) {
        return c.json({ error: 'Username already taken' }, 400);
      }
    }
    
    // Check if email is taken (if updating email)
    if (updates.email) {
      const existing = await prisma.user.findUnique({
        where: { email: updates.email },
      });
      
      if (existing && existing.id !== user.id) {
        return c.json({ error: 'Email already taken' }, 400);
      }
    }
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...updates,
        // updatedAt uses @updatedAt in schema
      },
    });
    
    return c.json({
      user: {
        ...updated,
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

/**
 * GET /api/users/me/history
 * Get user's quiz history (hosted and played)
 */
userRoutes.get('/me/history', requireAuth, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  
  try {
    const prisma = getPrisma();
    
    // Get hosted sessions
    const hosted = await prisma.hostedSession.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
    });
    
    // Get player stats
    const played = await prisma.playerStat.findMany({
      where: { userId: user.id },
      orderBy: { playedAt: 'desc' },
    });
    
    // Merge and sort by date
    const history = [
      ...hosted.map(h => ({
        type: 'hosted' as const,
        id: h.id,
        sessionId: h.sessionId,
        questionBankId: h.questionBankId,
        questionBankName: h.questionBankName,
        totalPlayers: h.totalPlayers,
        totalQuestions: h.totalQuestions,
        date: h.completedAt.getTime(),
      })),
      ...played.map(p => ({
        type: 'played' as const,
        id: p.id,
        sessionId: p.sessionId,
        nickname: p.nickname,
        finalScore: p.finalScore,
        finalRank: p.finalRank,
        correctAnswers: p.correctAnswers,
        totalQuestions: p.totalQuestions,
        date: p.playedAt.getTime(),
      })),
    ].sort((a, b) => b.date - a.date); // Sort descending by date
    
    // Apply pagination
    const paginatedHistory = history.slice(offset, offset + limit);
    
    return c.json({
      history: paginatedHistory,
      total: history.length,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return c.json({ error: 'Failed to fetch history' }, 500);
  }
});

/**
 * GET /api/users/me/stats
 * Get aggregate statistics for current user
 */
userRoutes.get('/me/stats', requireAuth, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const prisma = getPrisma();
    
    // Get counts
    const counts = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        _count: {
          select: {
            hostedSessions: true,
            playerStats: true,
            savedQuizzes: true,
          },
        },
      },
    });
    
    // Aggregate player statistics
    const playerAgg = await prisma.playerStat.aggregate({
      where: { userId: user.id },
      _avg: {
        finalScore: true,
        correctAnswers: true,
        totalQuestions: true,
      },
      _max: {
        finalScore: true,
        finalRank: true,
      },
      _sum: {
        correctAnswers: true,
        totalQuestions: true,
      },
    });
    
    // Calculate accuracy as decimal (correctAnswers / totalQuestions)
    const averageCorrect = playerAgg._avg.totalQuestions && playerAgg._avg.correctAnswers
      ? playerAgg._avg.correctAnswers / playerAgg._avg.totalQuestions
      : 0;
    
    return c.json({
      stats: {
        totalHosted: counts?._count.hostedSessions || 0,
        totalPlayed: counts?._count.playerStats || 0,
        totalSaved: counts?._count.savedQuizzes || 0,
        averageScore: Math.round(playerAgg._avg.finalScore || 0),
        averageCorrect: Math.round(averageCorrect * 100) / 100, // Round to 2 decimals
        bestScore: playerAgg._max.finalScore || 0,
        bestRank: playerAgg._max.finalRank || 0,
      },
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    return c.json({ error: 'Failed to calculate stats' }, 500);
  }
});

/**
 * GET /api/users/me/question-stats
 * Per-question performance breakdown for the authenticated user.
 * Sorted by accuracy ASC (weakest questions first).
 * Optional ?bankId= to filter to one question bank.
 */
userRoutes.get('/me/question-stats', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const url = new URL(c.req.url);
  const bankId = url.searchParams.get('bankId') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  try {
    const prisma = getPrisma();

    const where = {
      userId: user.id,
      ...(bankId ? { questionBankId: bankId } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.userQuestionStat.count({ where }),
      prisma.userQuestionStat.findMany({
        where,
        orderBy: [
          // Compute accuracy via raw fraction – sort weakest first
          // Prisma doesn't support computed-column ordering, so we fetch all and sort in JS
          { timesAnswered: 'desc' }, // secondary: prefer questions with more attempts
        ],
        skip: offset,
        take: limit,
      }),
    ]);

    // Sort by accuracy ASC (weakest first), then by timesAnswered DESC
    const sorted = rows
      .map((r) => ({
        ...r,
        accuracy: r.timesAnswered > 0 ? r.timesCorrect / r.timesAnswered : 0,
        lastAnsweredAt: r.lastAnsweredAt ? r.lastAnsweredAt.getTime() : null,
      }))
      .sort((a, b) => {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return b.timesAnswered - a.timesAnswered;
      });

    return c.json({ questions: sorted, total });
  } catch (error) {
    console.error('Error fetching question stats:', error);
    return c.json({ error: 'Failed to fetch question stats' }, 500);
  }
});

/**
 * GET /api/users/me/weak-topics
 * Aggregated accuracy by topic/tag across all questions the user has answered.
 * Topics come from the in-memory question bank data.
 */
userRoutes.get('/me/weak-topics', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const prisma = getPrisma();
    const { questionBanks } = await import('../state.js');

    // Fetch all question stats for the user
    const userStats = await prisma.userQuestionStat.findMany({
      where: { userId: user.id },
    });

    if (userStats.length === 0) {
      return c.json({ topics: [] });
    }

    // Build a map from questionId → topics[] using loaded question banks
    const topicAccMap = new Map<string, { timesAnswered: number; timesCorrect: number }>();

    for (const stat of userStats) {
      const bank = questionBanks.get(stat.questionBankId);
      if (!bank) continue;

      const question = bank.questions.find((q) => q.id === stat.questionId);
      if (!question) continue;

      const allTopics = [...(question.topics ?? []), ...(question.tags ?? [])];
      const uniqueTopics = [...new Set(allTopics)];

      for (const topic of uniqueTopics) {
        const existing = topicAccMap.get(topic) ?? { timesAnswered: 0, timesCorrect: 0 };
        topicAccMap.set(topic, {
          timesAnswered: existing.timesAnswered + stat.timesAnswered,
          timesCorrect: existing.timesCorrect + stat.timesCorrect,
        });
      }
    }

    const topics = Array.from(topicAccMap.entries())
      .map(([topic, { timesAnswered, timesCorrect }]) => ({
        topic,
        timesAnswered,
        timesCorrect,
        accuracy: timesAnswered > 0 ? Math.round((timesCorrect / timesAnswered) * 1000) / 1000 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // weakest first

    return c.json({ topics });
  } catch (error) {
    console.error('Error fetching weak topics:', error);
    return c.json({ error: 'Failed to fetch weak topics' }, 500);
  }
});

export default userRoutes;
