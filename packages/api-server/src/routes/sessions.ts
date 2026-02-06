import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateId, generatePin } from '@quizzquizz/common';

const sessionRoutes = new Hono();

// Create session request schema
const CreateSessionSchema = z.object({
  questionBankId: z.string(),
});

// Create a new session
sessionRoutes.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const { questionBankId } = c.req.valid('json');

  // Generate unique PIN (in production, check for collisions)
  const pin = generatePin();
  const sessionId = generateId();
  const hostToken = generateId();

  try {
    await db.insert(sessions).values({
      id: sessionId,
      pin,
      hostToken,
      questionBankId,
      status: 'lobby',
      currentQuestionIndex: -1,
      createdAt: Date.now(),
    });

    return c.json(
      {
        id: sessionId,
        pin,
        hostToken,
        questionBankId,
        status: 'lobby',
      },
      201
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Get session (requires host token)
sessionRoutes.get('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    // Don't send hostToken in response
    const { hostToken: _, ...sessionData } = session;
    return c.json(sessionData);
  } catch (error) {
    console.error('Error fetching session:', error);
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// Delete session (requires host token)
sessionRoutes.delete('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const hostToken = c.req.header('X-Host-Token');

  if (!hostToken) {
    return c.json({ error: 'Host token required' }, 401);
  }

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (session.hostToken !== hostToken) {
      return c.json({ error: 'Invalid host token' }, 403);
    }

    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return c.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

export default sessionRoutes;
