import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { sessions, players } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@quizzquizz/common';

const playerRoutes = new Hono();

// Join session request schema
const JoinSessionSchema = z.object({
  pin: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

// Join a session with PIN
playerRoutes.post('/join', zValidator('json', JoinSessionSchema), async (c) => {
  const { pin, nickname } = c.req.valid('json');

  try {
    // Find session by PIN
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.pin, pin),
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.status !== 'lobby') {
      return c.json({ error: 'Session has already started' }, 400);
    }

    // Check for duplicate nickname in this session
    const existingPlayer = await db.query.players.findFirst({
      where: (players, { and, eq }) =>
        and(eq(players.sessionId, session.id), eq(players.nickname, nickname)),
    });

    if (existingPlayer) {
      return c.json({ error: 'Nickname already taken' }, 400);
    }

    // Create player
    const playerId = generateId();
    await db.insert(players).values({
      id: playerId,
      sessionId: session.id,
      nickname,
      score: 0,
      joinedAt: Date.now(),
    });

    return c.json(
      {
        playerId,
        sessionId: session.id,
        nickname,
      },
      201
    );
  } catch (error) {
    console.error('Error joining session:', error);
    return c.json({ error: 'Failed to join session' }, 500);
  }
});

// List players in a session
playerRoutes.get('/:sessionId/players', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    // Verify session exists
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Get all players
    const sessionPlayers = await db.query.players.findMany({
      where: eq(players.sessionId, sessionId),
      orderBy: (players, { desc }) => [desc(players.score), players.joinedAt],
    });

    return c.json({
      players: sessionPlayers.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing players:', error);
    return c.json({ error: 'Failed to list players' }, 500);
  }
});

export default playerRoutes;
