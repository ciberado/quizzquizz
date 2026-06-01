import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  parseQuestionBank,
  serializeQuestion,
  serializeQuestionEdit,
  updateQuestionInFile,
} from '@quizzquizz/question-bank';
import { QuestionEditSchema, QuestionMarkdownEditSchema } from '@quizzquizz/common';
import { authMiddleware, requireAuth } from '../auth/middleware.js';
import { reloadQuestionBanks } from '../reload-banks.js';
import { withUploadMutex } from '../upload-mutex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type UserContext = {
  id: string;
  email: string;
  username: string;
  name?: string;
  isAdmin: boolean;
};

type Variables = {
  user: UserContext | null;
};

const questionEditRoutes = new Hono<{ Variables: Variables }>();

// Apply auth middleware to all routes
questionEditRoutes.use('*', authMiddleware);

// ─── Config ──────────────────────────────────────────────────────────────────

function getQuestionBanksPath(): string {
  return (
    process.env.QUESTION_BANKS_PATH ||
    join(__dirname, '../../../../question-banks')
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Determine whether the authenticated user may edit the bank at the given id.
 * Returns true if the bank belongs to the user's user-quizzes folder OR if the
 * user is an admin.
 */
function canEditBank(bankId: string, userId: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  // User banks live at user-quizzes/<userId>/...
  return bankId.startsWith(`user-quizzes/${userId}/`) || bankId === `user-quizzes/${userId}`;
}

/**
 * Resolve a bank ID to its absolute file path and verify the path is inside
 * the question-banks root (guards against path traversal).
 * Returns null if the path is unsafe or the file does not exist.
 */
function safeBankFilePath(bankId: string): string | null {
  const qbPath = getQuestionBanksPath();
  const filePath = join(qbPath, `${bankId}.md`);
  const resolved = resolve(filePath);
  const resolvedRoot = resolve(qbPath);
  if (!resolved.startsWith(resolvedRoot + '/')) return null;
  if (!existsSync(resolved)) return null;
  return resolved;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/question-edit/questions?bankId=<bank-id>
 *
 * Returns ALL questions in the bank (including deactivated and deleted) for the
 * question editor.  Requires authentication and ownership or admin.
 */
questionEditRoutes.get('/questions', requireAuth, async (c) => {
  const user = c.get('user')!;
  const bankId = new URL(c.req.url).searchParams.get('bankId');
  if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);

  if (!canEditBank(bankId, user.id, user.isAdmin)) {
    return c.json({ error: 'Forbidden - you do not own this bank' }, 403);
  }

  const filePath = safeBankFilePath(bankId);
  if (!filePath) return c.json({ error: 'Bank not found' }, 404);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const bank = parseQuestionBank(content, bankId, { includeInactive: true });
    return c.json({ questions: bank.questions, bankName: bank.metadata.name });
  } catch (err) {
    console.error('Error loading bank for editing:', err);
    return c.json({ error: 'Failed to load bank' }, 500);
  }
});

/**
 * GET /api/question-edit/questions/:questionId?bankId=<bank-id>
 *
 * Returns a single question (including deactivated/deleted) for the editor.
 */
questionEditRoutes.get('/questions/:questionId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const bankId = new URL(c.req.url).searchParams.get('bankId');
  const questionId = c.req.param('questionId');

  if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);

  if (!canEditBank(bankId, user.id, user.isAdmin)) {
    return c.json({ error: 'Forbidden - you do not own this bank' }, 403);
  }

  const filePath = safeBankFilePath(bankId);
  if (!filePath) return c.json({ error: 'Bank not found' }, 404);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const bank = parseQuestionBank(content, bankId, { includeInactive: true });
    const question = bank.questions.find((q) => q.id === questionId);
    if (!question) return c.json({ error: 'Question not found' }, 404);
    return c.json({ question });
  } catch (err) {
    console.error('Error loading question for editing:', err);
    return c.json({ error: 'Failed to load question' }, 500);
  }
});

/**
 * PUT /api/question-edit/questions/:questionId?bankId=<bank-id>
 *
 * Update a question using either:
 *   - Form mode: body matches QuestionEditSchema
 *   - Raw markdown mode: body matches QuestionMarkdownEditSchema  (include `markdown` field)
 */
const PutQuestionSchema = z.union([
  QuestionEditSchema,
  QuestionMarkdownEditSchema,
]);

questionEditRoutes.put(
  '/questions/:questionId',
  requireAuth,
  zValidator('json', PutQuestionSchema),
  async (c) => {
    const user = c.get('user')!;
    const bankId = new URL(c.req.url).searchParams.get('bankId');
    const questionId = c.req.param('questionId');

    if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);

    if (!canEditBank(bankId, user.id, user.isAdmin)) {
      return c.json({ error: 'Forbidden - you do not own this bank' }, 403);
    }

    const filePath = safeBankFilePath(bankId);
    if (!filePath) return c.json({ error: 'Bank not found' }, 404);

    const body = c.req.valid('json');

    return withUploadMutex(async () => {
      // Load current state to verify the question exists
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        return c.json({ error: 'Failed to read bank file' }, 500);
      }

      const bank = parseQuestionBank(content, bankId, { includeInactive: true });
      const existing = bank.questions.find((q) => q.id === questionId);
      if (!existing) return c.json({ error: 'Question not found' }, 404);

      let newBody: string;

      if ('markdown' in body) {
        // Raw markdown mode — validate that the Markdown is parseable
        const testContent = `# Question Bank: test\n\n## Metadata\n- **Topics**: test\n\n---\n\n## Questions\n\n### ${questionId}\n${body.markdown}\n\n---\n`;
        try {
          const testBank = parseQuestionBank(testContent, 'test', { includeInactive: true });
          if (testBank.questions.length === 0) {
            return c.json({ error: 'Invalid markdown: question could not be parsed' }, 422);
          }
        } catch (e) {
          return c.json({
            error: 'Invalid markdown format',
            details: e instanceof Error ? e.message : String(e),
          }, 422);
        }
        newBody = body.markdown.endsWith('\n') ? body.markdown : body.markdown + '\n';
      } else {
        // Form mode — serialize from structured data
        newBody = serializeQuestionEdit(body, questionId);
      }

      try {
        updateQuestionInFile(filePath, questionId, newBody);
      } catch (err) {
        console.error('Failed to update question in file:', err);
        return c.json({ error: 'Failed to write changes to file' }, 500);
      }

      // Reload banks so the in-memory state reflects the change
      try {
        reloadQuestionBanks(getQuestionBanksPath());
      } catch (err) {
        console.warn('Reload failed after question update (file written OK):', err);
      }

      // Return the updated question
      const updatedContent = readFileSync(filePath, 'utf-8');
      const updatedBank = parseQuestionBank(updatedContent, bankId, { includeInactive: true });
      const updated = updatedBank.questions.find((q) => q.id === questionId);

      return c.json({ success: true, question: updated ?? null });
    });
  },
);

/**
 * PATCH /api/question-edit/questions/:questionId/status?bankId=<bank-id>
 *
 * Change the status of a question.
 * Body: { status: 'active' | 'deactivated' | 'deleted' }
 */
const PatchStatusSchema = z.object({
  status: z.enum(['active', 'deactivated', 'deleted']),
});

questionEditRoutes.patch(
  '/questions/:questionId/status',
  requireAuth,
  zValidator('json', PatchStatusSchema),
  async (c) => {
    const user = c.get('user')!;
    const bankId = new URL(c.req.url).searchParams.get('bankId');
    const questionId = c.req.param('questionId');

    if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);

    if (!canEditBank(bankId, user.id, user.isAdmin)) {
      return c.json({ error: 'Forbidden - you do not own this bank' }, 403);
    }

    const filePath = safeBankFilePath(bankId);
    if (!filePath) return c.json({ error: 'Bank not found' }, 404);

    const { status } = c.req.valid('json');

    return withUploadMutex(async () => {
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        return c.json({ error: 'Failed to read bank file' }, 500);
      }

      const bank = parseQuestionBank(content, bankId, { includeInactive: true });
      const existing = bank.questions.find((q) => q.id === questionId);
      if (!existing) return c.json({ error: 'Question not found' }, 404);

      const updated = { ...existing, status };
      const newBody = serializeQuestion(updated);

      try {
        updateQuestionInFile(filePath, questionId, newBody);
      } catch (err) {
        console.error('Failed to update question status:', err);
        return c.json({ error: 'Failed to write changes to file' }, 500);
      }

      try {
        reloadQuestionBanks(getQuestionBanksPath());
      } catch (err) {
        console.warn('Reload failed after status update:', err);
      }

      return c.json({ success: true, status });
    });
  },
);

/**
 * PATCH /api/question-edit/questions/:questionId/flag?bankId=<bank-id>
 *
 * Set or clear the flag on a question.  Any authenticated user may flag any
 * question; only the owner/admin may clear a flag.
 *
 * Body: { flag: string } — non-empty sets the flag; empty string clears it.
 */
const PatchFlagSchema = z.object({
  flag: z.string(), // empty string = clear flag
});

questionEditRoutes.patch(
  '/questions/:questionId/flag',
  requireAuth,
  zValidator('json', PatchFlagSchema),
  async (c) => {
    const user = c.get('user')!;
    const bankId = new URL(c.req.url).searchParams.get('bankId');
    const questionId = c.req.param('questionId');

    if (!bankId) return c.json({ error: 'Missing required query param: bankId' }, 400);

    const { flag } = c.req.valid('json');
    const isClearing = flag.trim() === '';

    // Only owners/admins may clear a flag; any logged-in user may set one
    if (isClearing && !canEditBank(bankId, user.id, user.isAdmin)) {
      return c.json({ error: 'Forbidden - only the bank owner or an admin can resolve flags' }, 403);
    }

    const filePath = safeBankFilePath(bankId);
    if (!filePath) return c.json({ error: 'Bank not found' }, 404);

    return withUploadMutex(async () => {
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        return c.json({ error: 'Failed to read bank file' }, 500);
      }

      const bank = parseQuestionBank(content, bankId, { includeInactive: true });
      const existing = bank.questions.find((q) => q.id === questionId);
      if (!existing) return c.json({ error: 'Question not found' }, 404);

      const updated = { ...existing, flag: isClearing ? undefined : flag.trim() };
      const newBody = serializeQuestion(updated);

      try {
        updateQuestionInFile(filePath, questionId, newBody);
      } catch (err) {
        console.error('Failed to update question flag:', err);
        return c.json({ error: 'Failed to write changes to file' }, 500);
      }

      try {
        reloadQuestionBanks(getQuestionBanksPath());
      } catch (err) {
        console.warn('Reload failed after flag update:', err);
      }

      return c.json({ success: true, flagged: !isClearing, flag: isClearing ? null : flag.trim() });
    });
  },
);

export default questionEditRoutes;
