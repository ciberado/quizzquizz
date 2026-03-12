import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parseQuestionBank } from '@quizzquizz/question-bank';
import { authMiddleware, requireAuth } from '../auth/middleware.js';
import { reloadQuestionBanks } from '../reload-banks.js';
import { withUploadMutex } from '../upload-mutex.js';
import { getBankTree } from '../state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Variables = {
  user: {
    id: string;
    email: string;
    username: string;
    name?: string;
  } | null;
};

const userBankRoutes = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
userBankRoutes.use('*', authMiddleware);

// ─── Config ──────────────────────────────────────────────────────────────────

function getQuestionBanksPath(): string {
  return (
    process.env.QUESTION_BANKS_PATH ||
    join(__dirname, '../../../../question-banks')
  );
}

const MAX_UPLOAD_BYTES = () =>
  parseInt(process.env.MAX_UPLOAD_KB ?? '500', 10) * 1024;

// ─── Sanitise a user-supplied folder or filename segment ──────────────────────

/**
 * Allow alphanumeric, hyphens, underscores, dots, and spaces.
 * Spaces are replaced with hyphens. Result is lowercased.
 * Returns empty string if the result would be invalid.
 */
function sanitizeSegment(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, '-');
  // Only allow safe characters
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(raw.trim())) return '';
  // Reject leading dot (hidden file/dir)
  if (cleaned.startsWith('.')) return '';
  return cleaned.slice(0, 80);
}

// ─── Request schema ───────────────────────────────────────────────────────────

const UploadSchema = z.object({
  folder: z.string().max(80).optional(),   // empty / absent → upload to user root
  filename: z.string().min(1).max(80),
  content: z.string().min(1),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/user-banks/upload
 *
 * Upload a new quiz bank (Markdown). Must be authenticated.
 *
 *   Body: { folder: string, filename: string, content: string }
 *   201 { success, bank: { id, name, questionCount, path } }
 *   400 Invalid folder/filename name, path traversal attempt
 *   401 Not authenticated
 *   409 File already exists
 *   413 Content too large
 *   422 Format errors in the Markdown
 *   500 Filesystem or reload failure
 */
userBankRoutes.post(
  '/upload',
  requireAuth,
  zValidator('json', UploadSchema),
  async (c) => {
    const user = c.get('user')!;
    const { folder, filename, content } = c.req.valid('json');

    // ── Size check ──────────────────────────────────────────────────────────
    if (content.length > MAX_UPLOAD_BYTES()) {
      return c.json({ error: 'Content too large' }, 413);
    }

    // ── Sanitise names ──────────────────────────────────────────────────────
    const rawFolder = (folder ?? '').trim();
    const safeFolder = rawFolder ? sanitizeSegment(rawFolder) : '';
    const safeFilename = sanitizeSegment(filename);

    if (rawFolder && !safeFolder) {
      return c.json({ error: 'Invalid group name. Use letters, numbers, hyphens, underscores, or dots.' }, 400);
    }
    if (!safeFilename) {
      return c.json({ error: 'Invalid filename. Use letters, numbers, hyphens, underscores, or dots.' }, 400);
    }

    // ── Build paths ─────────────────────────────────────────────────────────
    const qbPath = getQuestionBanksPath();
    const userDir = join(qbPath, 'user-quizzes', user.id);
    // If no group supplied the file goes directly under the user root dir
    const targetDir = safeFolder ? join(userDir, safeFolder) : userDir;
    const targetFile = join(targetDir, `${safeFilename}.md`);

    // ── Path traversal guard ────────────────────────────────────────────────
    const resolvedFile = resolve(targetFile);
    const resolvedUserDir = resolve(userDir);
    if (!resolvedFile.startsWith(resolvedUserDir + '/')) {
      return c.json({ error: 'Invalid path' }, 400);
    }

    // ── Validate Markdown ───────────────────────────────────────────────────
    const virtualId = safeFolder
      ? `user-quizzes/${user.id}/${safeFolder}/${safeFilename}`
      : `user-quizzes/${user.id}/${safeFilename}`;
    let bank;
    try {
      bank = parseQuestionBank(content, virtualId);
    } catch (e) {
      return c.json(
        {
          error: 'Invalid question bank format',
          errors: [{ line: null, message: e instanceof Error ? e.message : String(e) }],
        },
        422,
      );
    }

    if (bank.questions.length === 0) {
      return c.json(
        {
          error: 'Question bank must have at least one question',
          errors: [{ line: null, message: 'No valid questions found in the uploaded file' }],
        },
        422,
      );
    }

    // ── Serialised write + reload ────────────────────────────────────────────
    return withUploadMutex(async () => {
      // Duplicate check inside the mutex (file could have been created by a
      // concurrent upload that acquired the mutex just before us)
      if (existsSync(targetFile)) {
        return c.json(
          { error: 'A quiz with this name already exists in this folder. Choose a different filename.' },
          409,
        );
      }

      try {
        mkdirSync(targetDir, { recursive: true });
        writeFileSync(targetFile, content, 'utf-8');
      } catch (err) {
        console.error('Failed to write uploaded quiz file:', err);
        return c.json({ error: 'Failed to save the file' }, 500);
      }

      try {
        reloadQuestionBanks(qbPath);
      } catch (err) {
        // File was written; reload failure is non-fatal — server will pick it up on next reload
        console.error('Reload failed after upload (file written OK):', err);
      }

      return c.json(
        {
          success: true,
          bank: {
            id: bank.id,
            name: bank.metadata.name,
            questionCount: bank.questions.length,
            path: safeFolder
              ? `user-quizzes/${user.id}/${safeFolder}/${safeFilename}.md`
              : `user-quizzes/${user.id}/${safeFilename}.md`,
          },
        },
        201,
      );
    });
  },
);

/**
 * GET /api/user-banks/mine
 *
 * Returns the bank folder subtree that belongs to the authenticated user.
 * Delegates to the live bank tree so it always reflects the latest reload.
 */
userBankRoutes.get('/mine', requireAuth, (c) => {
  const user = c.get('user')!;
  const tree = getBankTree();

  const userQuizzesFolder = tree.folders.find((f) => f.name === 'user-quizzes');
  const userFolder = userQuizzesFolder?.folders.find((f) => f.name === user.id) ?? null;

  return c.json({
    userId: user.id,
    folder: userFolder ?? {
      name: user.id,
      path: `user-quizzes/${user.id}`,
      folders: [],
      banks: [],
    },
  });
});

export default userBankRoutes;
