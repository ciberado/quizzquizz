import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { initDatabase, getPrisma } from '../db/index.js';
import app from '../index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractToken(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function signUpAndGetToken(
  email: string,
  password = 'Password123',
  username = 'uploader',
): Promise<{ token: string; userId: string }> {
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, name: 'Test User' }),
  });
  const token = extractToken(res);
  const data = (await res.json()) as { user?: { id: string } };
  return { token: token!, userId: data.user?.id ?? '' };
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Cookie: `better-auth.session_token=${encodeURIComponent(token)}`,
  };
}

// ─── Minimal valid quiz bank fixture ─────────────────────────────────────────

const VALID_BANK_MD = `# Question Bank: Test Science Quiz

## Metadata
- **Topics**: science
- **Default Time Limit**: 20s
- **Description**: A basic test quiz

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: science
**Tags**: basics

What is the chemical symbol for water?

- [x] H2O
- [ ] CO2
- [ ] O2
- [ ] H2

---
`;

const INVALID_MD = `This is not a valid quiz bank at all.`;

const EMPTY_QUESTIONS_MD = `# Question Bank: Empty Quiz

## Metadata
- **Topics**: test
- **Default Time Limit**: 20s
- **Description**: No questions

---

## Questions
`;

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('User Banks Routes', () => {
  let authToken: string;
  let userId: string;
  let tmpDir: string;
  let originalQbPath: string | undefined;

  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    // Clean auth tables
    try { await getPrisma().account.deleteMany({}); } catch {}
    try { await getPrisma().session.deleteMany({}); } catch {}
    try { await getPrisma().user.deleteMany({}); } catch {}

    // Create fresh user
    const result = await signUpAndGetToken('upload@test.com');
    authToken = result.token;
    userId = result.userId;

    // Isolated temp file-system for each test
    tmpDir = mkdtempSync(join(tmpdir(), 'qz-upload-test-'));
    originalQbPath = process.env.QUESTION_BANKS_PATH;
    process.env.QUESTION_BANKS_PATH = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    if (originalQbPath !== undefined) {
      process.env.QUESTION_BANKS_PATH = originalQbPath;
    } else {
      delete process.env.QUESTION_BANKS_PATH;
    }
  });

  // ─── POST /api/user-banks/upload ───────────────────────────────────────────

  describe('POST /api/user-banks/upload', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'science', filename: 'test', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 201 and bank details for a valid upload', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'science', filename: 'water-quiz', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.bank.name).toBe('Test Science Quiz');
      expect(data.bank.questionCount).toBe(1);
      expect(data.bank.path).toContain('water-quiz.md');
    });

    it('writes the file to the expected path on disk', async () => {
      await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'myfolder', filename: 'myquiz', content: VALID_BANK_MD }),
      });
      const expectedPath = join(tmpDir, 'user-quizzes', userId, 'myfolder', 'myquiz.md');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('makes the uploaded bank available via GET /api/question-banks after reload', async () => {
      await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'science', filename: 'water-quiz', content: VALID_BANK_MD }),
      });

      const bankId = `user-quizzes/${userId}/science/water-quiz`;
      const res = await app.request(`/api/question-banks/bank?id=${encodeURIComponent(bankId)}`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.metadata.name).toBe('Test Science Quiz');
    });

    it('returns 409 when uploading the same filename twice', async () => {
      const body = JSON.stringify({ folder: 'science', filename: 'dup', content: VALID_BANK_MD });
      const headers = authHeaders(authToken);
      await app.request('/api/user-banks/upload', { method: 'POST', headers, body });
      const res = await app.request('/api/user-banks/upload', { method: 'POST', headers, body });
      expect(res.status).toBe(409);
    });

    it('returns 422 for invalid markdown', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'bad', filename: 'broken', content: INVALID_MD }),
      });
      expect(res.status).toBe(422);
      const data = (await res.json()) as any;
      expect(data.errors).toBeDefined();
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('returns 422 when the bank has zero questions', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'empty', filename: 'no-q', content: EMPTY_QUESTIONS_MD }),
      });
      expect(res.status).toBe(422);
      const data = (await res.json()) as any;
      expect(data.errors).toBeDefined();
    });

    it('returns 400 for a folder name with path traversal characters', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: '../../../etc', filename: 'passwd', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for a folder name with slashes', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'a/b/c', filename: 'nested', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for an empty folder name after sanitisation (leading dot)', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: '.hidden', filename: 'quiz', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 413 when content exceeds size limit', async () => {
      const oversized = 'x'.repeat(501 * 1024); // 501 KB
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'science', filename: 'huge', content: oversized }),
      });
      expect(res.status).toBe(413);
    });

    it('returns 422 for a valid 400 body (missing required fields) — zod validation', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'science' }), // missing filename + content
      });
      expect(res.status).toBe(400);
    });

    it('accepts folder names with hyphens and underscores', async () => {
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'my-folder_01', filename: 'my_quiz-01', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(201);
    });

    it('different users get isolated directories', async () => {
      // Create second user
      const second = await signUpAndGetToken('second@test.com', 'Password123', 'second');

      await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'shared', filename: 'quiz', content: VALID_BANK_MD }),
      });

      // Second user should be able to upload to the same folder+filename without 409
      const res = await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(second.token),
        body: JSON.stringify({ folder: 'shared', filename: 'quiz', content: VALID_BANK_MD }),
      });
      expect(res.status).toBe(201);
    });
  });

  // ─── GET /api/user-banks/mine ──────────────────────────────────────────────

  describe('GET /api/user-banks/mine', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request('/api/user-banks/mine');
      expect(res.status).toBe(401);
    });

    it('returns empty folder when user has no uploads', async () => {
      const res = await app.request('/api/user-banks/mine', {
        headers: { Cookie: `better-auth.session_token=${encodeURIComponent(authToken)}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.userId).toBe(userId);
      expect(data.folder.banks).toHaveLength(0);
    });

    it('returns uploaded banks after a successful upload', async () => {
      await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ folder: 'science', filename: 'water-quiz', content: VALID_BANK_MD }),
      });

      const res = await app.request('/api/user-banks/mine', {
        headers: { Cookie: `better-auth.session_token=${encodeURIComponent(authToken)}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.folder.folders.length + data.folder.banks.length).toBeGreaterThan(0);
    });

    it('does not include other users banks in the response', async () => {
      const second = await signUpAndGetToken('second2@test.com', 'Password123', 'second2');

      // Second user uploads
      await app.request('/api/user-banks/upload', {
        method: 'POST',
        headers: authHeaders(second.token),
        body: JSON.stringify({ folder: 'science', filename: 'other-quiz', content: VALID_BANK_MD }),
      });

      // First user /mine should be empty
      const res = await app.request('/api/user-banks/mine', {
        headers: { Cookie: `better-auth.session_token=${encodeURIComponent(authToken)}` },
      });
      const data = (await res.json()) as any;
      // Verify no banks from second user appear
      function allBankIds(folder: any): string[] {
        const ids = folder.banks.map((b: any) => b.id);
        for (const sub of folder.folders) ids.push(...allBankIds(sub));
        return ids;
      }
      const ids = allBankIds(data.folder);
      expect(ids.some((id: string) => id.includes(second.userId))).toBe(false);
    });
  });
});
