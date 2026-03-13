import { test, expect, request as apiRequest } from '@playwright/test';

/**
 * Quiz Upload E2E Tests
 *
 * Covers the full upload flow: API contract, UI button visibility,
 * modal interactions (paste, file pick, Claude prompt, validation, success).
 *
 * Requires:
 *   - API server running on http://localhost:3000
 *   - Host app running on http://localhost:3001
 */

const HOST = 'http://localhost:3001';
const API = 'http://localhost:3000';

const VALID_BANK_MD = `# Question Bank: E2E Upload Quiz

## Metadata
- **Topics**: testing
- **Default Time Limit**: 20s
- **Description**: Quiz for E2E upload tests

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: testing
**Tags**: e2e

Which file format are QuizzQuizz banks stored in?

- [x] Markdown
- [ ] JSON
- [ ] YAML
- [ ] XML

---
`;

const INVALID_MD = `This is not a valid quiz bank.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sign up a new user; returns just the session token (for existing tests). */
async function signUp(email: string, password = 'Password123'): Promise<string> {
  return (await signUpFull(email, password)).token;
}

/** Sign up a new user; returns token + username (for tests that need both). */
async function signUpFull(email: string, password = 'Password123'): Promise<{ token: string; username: string }> {
  // Use a unique username derived from the email to avoid username-uniqueness conflicts
  const username = `u_${email.replace(/[^a-z0-9]/gi, '').slice(0, 20)}_${Date.now()}`;
  const ctx = await apiRequest.newContext({ baseURL: API });
  const res = await ctx.post('/api/auth/sign-up/email', {
    data: { email, password, username, name: 'E2E User' },
  });
  const cookie = res.headers()['set-cookie'] ?? '';
  const match = cookie.match(/better-auth\.session_token=([^;]+)/);
  await ctx.dispose();
  if (!match) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`signUp failed for ${email}: ${JSON.stringify(body)}`);
  }
  return { token: decodeURIComponent(match[1]), username };
}



// ─── API-level tests ──────────────────────────────────────────────────────────

test.describe('API — POST /api/user-banks/upload', () => {
  test('returns 401 when not authenticated', async ({ request }) => {
    const res = await request.post(`${API}/api/user-banks/upload`, {
      data: { folder: 'science', filename: 'test', content: VALID_BANK_MD },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 201 for a valid authenticated upload', async ({ request }) => {
    const token = await signUp(`upload-api-${Date.now()}@e2e.test`);

    const res = await request.post(`${API}/api/user-banks/upload`, {
      headers: { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` },
      data: { folder: 'e2e-science', filename: `water-${Date.now()}`, content: VALID_BANK_MD },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bank.name).toBe('E2E Upload Quiz');
    expect(body.bank.questionCount).toBe(1);
  });

  test('returns 422 for invalid Markdown', async ({ request }) => {
    const token = await signUp(`upload-invalid-${Date.now()}@e2e.test`);
    const res = await request.post(`${API}/api/user-banks/upload`, {
      headers: { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` },
      data: { folder: 'bad', filename: 'broken', content: INVALID_MD },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  test('returns 409 for duplicate upload', async ({ request }) => {
    const token = await signUp(`upload-dup-${Date.now()}@e2e.test`);
    const payload = { folder: 'dup-folder', filename: 'dup-quiz', content: VALID_BANK_MD };
    const headers = { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` };

    const first = await request.post(`${API}/api/user-banks/upload`, { headers, data: payload });
    expect(first.status()).toBe(201);

    const second = await request.post(`${API}/api/user-banks/upload`, { headers, data: payload });
    expect(second.status()).toBe(409);
  });

  test('returns 400 for path traversal in folder name', async ({ request }) => {
    const token = await signUp(`upload-traversal-${Date.now()}@e2e.test`);
    const res = await request.post(`${API}/api/user-banks/upload`, {
      headers: { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` },
      data: { folder: '../../../etc', filename: 'passwd', content: VALID_BANK_MD },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/user-banks/mine returns empty folder when user has no uploads', async ({ request }) => {
    const token = await signUp(`mine-empty-${Date.now()}@e2e.test`);
    const res = await request.get(`${API}/api/user-banks/mine`, {
      headers: { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.folder).toBeDefined();
    expect(body.folder.banks).toHaveLength(0);
  });
});

// ─── UI-level tests ───────────────────────────────────────────────────────────

test.describe('Host UI — Quiz Upload', () => {
  test('Upload Quiz button is NOT visible when logged out', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid', { timeout: 10000 });
    // The upload button should be absent when anonymous
    await expect(page.locator('.upload-quiz-btn')).not.toBeVisible();
  });

  test('Upload Quiz button IS visible when logged in', async ({ page }) => {
    // Sign up via the API first, then set cookie in the browser context
    const token = await signUp(`ui-upload-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    // Wait for bank browser to load
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    // Give auth check time to resolve
    await page.waitForTimeout(2000);
    await expect(page.locator('.upload-quiz-btn')).toBeVisible({ timeout: 5000 });
  });

  test('clicking Upload Quiz opens the upload modal', async ({ page }) => {
    const token = await signUp(`ui-modal-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });
  });

  test('Copy Claude Prompt button copies text to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const token = await signUp(`ui-prompt-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });

    await page.locator('.copy-prompt-btn').click();
    // Verify the button shows confirmation feedback
    await expect(page.locator('.copy-prompt-btn')).toHaveText(/Copied!/i, { timeout: 3000 });

    // Verify clipboard content contains key phrases
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Question Bank:');
    expect(clipboardText).toContain('[x]');
  });

  test('validation error is shown for invalid Markdown on submit', async ({ page }) => {
    const token = await signUp(`ui-validation-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });

    await page.locator('.upload-folder-input').fill('e2e-test');
    await page.locator('.upload-filename-input').fill('bad-quiz');
    await page.locator('.upload-content-textarea').fill(INVALID_MD);
    await page.locator('.upload-submit-btn').click();

    // Error area should appear with a message
    await expect(page.locator('.upload-error-area')).toBeVisible({ timeout: 5000 });
  });

  test('successful upload closes modal and refreshes bank browser', async ({ page }) => {
    const token = await signUp(`ui-success-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });

    const uniqueName = `e2e-quiz-${Date.now()}`;
    await page.locator('.upload-folder-input').fill('e2e-folder');
    await page.locator('.upload-filename-input').fill(uniqueName);
    await page.locator('.upload-content-textarea').fill(VALID_BANK_MD);
    await page.locator('.upload-submit-btn').click();

    // Modal should close on success
    await expect(page.locator('.upload-modal-box')).not.toBeVisible({ timeout: 8000 });

    // Bank browser should refresh (grid still visible)
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 5000 });
  });

  test('modal closes when Cancel is clicked', async ({ page }) => {
    const token = await signUp(`ui-cancel-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });

    await page.locator('.modal-cancel-btn').click();
    await expect(page.locator('.upload-modal-box')).not.toBeVisible({ timeout: 2000 });
  });

  test('file picker populates the textarea content', async ({ page }) => {
    const token = await signUp(`ui-filepick-${Date.now()}@e2e.test`);
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto(`${HOST}/#/create`);
    await page.waitForSelector('.question-banks-grid, qz-bank-browser', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.locator('.upload-quiz-btn').click();
    await expect(page.locator('.upload-modal-box')).toBeVisible({ timeout: 3000 });

    // Use setInputFiles to simulate a file pick
    const fileInput = page.locator('.file-pick-input');
    await fileInput.setInputFiles({
      name: 'my-quiz.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(VALID_BANK_MD),
    });

    // Textarea should be populated with the file content
    await expect(page.locator('.upload-content-textarea')).toHaveValue(VALID_BANK_MD, { timeout: 3000 });
    // Filename should be auto-filled from the file stem
    await expect(page.locator('.upload-filename-input')).toHaveValue('my-quiz');
  });
});

// ─── User folder display tests ────────────────────────────────────────────────

test.describe('Bank Browser — user folder display', () => {
  /** Upload a bank via API and return the user's ID from the session. */
  async function uploadAndGetUserId(token: string): Promise<string> {
    const ctx = await apiRequest.newContext({ baseURL: API });
    const cookieHeader = { Cookie: `better-auth.session_token=${encodeURIComponent(token)}` };

    // Upload a bank so the user directory is created on disk
    const uploadRes = await ctx.post('/api/user-banks/upload', {
      headers: cookieHeader,
      data: { folder: '', filename: `display-test-${Date.now()}`, content: VALID_BANK_MD },
    });
    expect(uploadRes.status()).toBe(201);

    // Fetch userId from session
    const sessionRes = await ctx.get('/api/auth/get-session', { headers: cookieHeader });
    const sessionData = await sessionRes.json();
    await ctx.dispose();
    return sessionData.user.id as string;
  }

  async function navigateToUserQuizzes(page: import('@playwright/test').Page, token: string): Promise<void> {
    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);
    await page.goto(`${HOST}/#/create?folder=user-quizzes`);
    await page.waitForSelector('.question-banks-grid', { timeout: 10000 });
    await page.waitForTimeout(800);
  }

  test('own folder card shows username instead of user ID', async ({ page }) => {
    const { token, username } = await signUpFull(`disp-name-${Date.now()}@e2e.test`);
    await uploadAndGetUserId(token);

    await navigateToUserQuizzes(page, token);

    // The first card heading should contain username, not the raw ID
    const firstCard = page.locator('.bank-browser-folder-card').first();
    const h3Text = await firstCard.locator('h3').textContent();
    expect(h3Text).toContain(username);
  });

  test('own folder card appears first in the list', async ({ page }) => {
    const { token, username } = await signUpFull(`disp-first-${Date.now()}@e2e.test`);
    await uploadAndGetUserId(token);

    await navigateToUserQuizzes(page, token);

    // First folder card heading must contain our username
    const firstH3 = page.locator('.bank-browser-folder-card').first().locator('h3');
    await expect(firstH3).toContainText(username, { timeout: 5000 });
  });

  test('own folder card shows "you" badge', async ({ page }) => {
    const { token } = await signUpFull(`disp-badge-${Date.now()}@e2e.test`);
    await uploadAndGetUserId(token);

    await navigateToUserQuizzes(page, token);

    const firstCard = page.locator('.bank-browser-folder-card').first();
    await expect(firstCard.locator('text=you')).toBeVisible({ timeout: 5000 });
  });

  test('own folder card has distinct background styling', async ({ page }) => {
    const { token } = await signUpFull(`disp-bg-${Date.now()}@e2e.test`);
    await uploadAndGetUserId(token);

    await navigateToUserQuizzes(page, token);

    // The own-user card has an inline background style; verify it differs from the default
    const firstCard = page.locator('.bank-browser-folder-card').first();
    const bg = await firstCard.evaluate((el) => (el as HTMLElement).style.background);
    expect(bg).toBeTruthy(); // non-empty → custom background applied
  });

  test('breadcrumb shows username when navigating into own folder', async ({ page }) => {
    const { token, username } = await signUpFull(`disp-crumb-${Date.now()}@e2e.test`);
    const userId = await uploadAndGetUserId(token);

    await page.context().addCookies([{
      name: 'better-auth.session_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    // Navigate directly into the user's directory via its real ID in the URL
    await page.goto(`${HOST}/#/create?folder=user-quizzes/${userId}`);
    await page.waitForSelector('.bank-browser-breadcrumb', { timeout: 10000 });
    await page.waitForTimeout(800);

    const breadcrumb = page.locator('.bank-browser-breadcrumb');
    // Breadcrumb should display the username, not the raw userId
    await expect(breadcrumb).toContainText(username, { timeout: 5000 });
    await expect(breadcrumb).not.toContainText(userId);
  });
});
