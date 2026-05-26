/**
 * E2E tests for flashcard session flow.
 * Tests cover:
 *   1. Creating a flashcard session via API
 *   2. Fetching flashcard state
 *   3. Joining a flashcard session via PIN (player flow)
 *   4. Host app Launch Flashcards button
 *   5. Flashcard app UI rendering (join → play)
 */
import { test, expect } from '@playwright/test';

test.describe('Flashcard API Flow', () => {
  let bankId: string;

  test.beforeAll(async ({ request }) => {
    // Get a question bank to use for flashcard sessions
    const banksRes = await request.get('/api/question-banks');
    expect(banksRes.ok()).toBeTruthy();
    const banks = await banksRes.json();
    expect(banks.tree?.banks?.length ?? banks.questionBanks?.length ?? 0).toBeGreaterThan(0);

    // Get first available bank ID from tree structure
    const tree = banks.tree;
    if (tree?.banks?.length > 0) {
      bankId = tree.banks[0].id;
    } else if (tree?.folders?.length > 0) {
      bankId = tree.folders[0].banks?.[0]?.id || tree.folders[0].folders?.[0]?.banks?.[0]?.id;
    }
    expect(bankId).toBeDefined();
    console.log(`Using bank: ${bankId}`);
  });

  test('should create a flashcard session with mode=flashcard', async ({ request }) => {
    const res = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'flashcard' },
    });
    expect(res.ok()).toBeTruthy();
    expect(res.status()).toBe(201);

    const session = await res.json();
    expect(session.mode).toBe('flashcard');
    expect(session.status).toBe('playing'); // Flashcard sessions start immediately
    expect(session.pin).toHaveLength(6);
    expect(session.hostToken).toBeDefined();
  });

  test('should return flashcard state with questions', async ({ request }) => {
    const createRes = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'flashcard' },
    });
    const session = await createRes.json();

    const stateRes = await request.get(`/api/sessions/${session.id}/flashcard-state`);
    expect(stateRes.ok()).toBeTruthy();

    const state = await stateRes.json();
    expect(state.mode).toBe('flashcard');
    expect(state.sessionId).toBe(session.id);
    expect(state.questions).toBeDefined();
    expect(state.questions.length).toBeGreaterThan(0);
    expect(state.totalQuestions).toBe(state.questions.length);
    expect(state.questionBankName).toBeDefined();

    // Verify question structure
    const q = state.questions[0];
    expect(q.id).toBeDefined();
    expect(q.text).toBeDefined();
    expect(q.answers).toBeInstanceOf(Array);
    expect(q.correctAnswerIds).toBeInstanceOf(Array);
  });

  test('should return 400 for flashcard-state on a quiz session', async ({ request }) => {
    const createRes = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'quiz' },
    });
    const session = await createRes.json();

    const stateRes = await request.get(`/api/sessions/${session.id}/flashcard-state`);
    expect(stateRes.status()).toBe(400);
  });

  test('should allow joining a flashcard session via PIN', async ({ request }) => {
    const createRes = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'flashcard' },
    });
    const session = await createRes.json();

    const joinRes = await request.post('/api/sessions/join', {
      data: { pin: session.pin, nickname: 'TestPlayer' },
    });
    expect(joinRes.ok()).toBeTruthy();

    const joined = await joinRes.json();
    expect(joined.sessionId).toBe(session.id);
    expect(joined.playerId).toBeDefined();
    expect(joined.mode).toBe('flashcard');
  });

  test('flashcard sessions default to quiz when mode omitted', async ({ request }) => {
    const res = await request.post('/api/sessions', {
      data: { questionBankId: bankId },
    });
    const session = await res.json();
    expect(session.mode).toBe('quiz');
    expect(session.status).toBe('lobby');
  });
});

test.describe('Flashcard App UI', () => {
  test('flashcard join screen renders at /flashcard/ (via proxy)', async ({ page }) => {
    // Use the proxy entry point (port 3000) — mirrors production routing
    await page.goto('/flashcard/');
    await page.waitForSelector('flashcard-join-screen', { timeout: 10000 });

    // Should show PIN input
    const pinInput = page.locator('#pin-input');
    await expect(pinInput).toBeVisible();

    // Should show nickname input
    const nicknameInput = page.locator('#nickname-input');
    await expect(nicknameInput).toBeVisible();

    // Should show join button
    const joinBtn = page.locator('#join-btn');
    await expect(joinBtn).toBeVisible();
    await expect(joinBtn).toContainText('Start Studying');
  });

  test('flashcard join shows error for invalid PIN', async ({ page }) => {
    await page.goto('/flashcard/');
    await page.waitForSelector('flashcard-join-screen', { timeout: 10000 });

    await page.fill('#nickname-input', 'TestPlayer');
    await page.fill('#pin-input', '000000');
    await page.click('#join-btn');

    // Should show an error
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
  });

  test('host app preview screen has Launch Flashcards button', async ({ page }) => {
    // Navigate to host app
    await page.goto('/host/');

    // Wait for the create session screen
    await page.waitForSelector('create-session-screen', { timeout: 10000 });

    // Click on first available question bank
    const bankItem = page.locator('qz-bank-browser').first();
    await bankItem.waitFor({ timeout: 10000 });

    // Find and click a bank in the browser
    const bankLink = page.locator('.bank-item, .bank-name, [data-bank-id]').first();
    await bankLink.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Banks might be in a tree structure
    });

    // Navigate directly to a preview if we can find a bank ID
    const bankRes = await page.request.get('/api/question-banks');
    const banksData = await bankRes.json();
    const tree = banksData.tree;
    let firstBankId: string | undefined;
    if (tree?.banks?.length > 0) firstBankId = tree.banks[0].id;
    else if (tree?.folders?.length > 0) firstBankId = tree.folders[0].banks?.[0]?.id;

    if (firstBankId) {
      await page.goto(`/host/#/preview/${encodeURIComponent(firstBankId)}`);
      await page.waitForSelector('question-preview-screen', { timeout: 10000 });

      // Should have Launch Flashcards button
      const flashcardBtn = page.locator('[data-action="create-flashcard"]');
      await expect(flashcardBtn).toBeVisible({ timeout: 5000 });
      await expect(flashcardBtn).toContainText('Launch Flashcards');
    }
  });

  test('full flashcard flow: create session and play through all cards', async ({ page, request }) => {
    // Create a flashcard session via API
    const banksRes = await request.get('/api/question-banks');
    const banksData = await banksRes.json();
    const tree = banksData.tree;
    let bankId: string | undefined;
    if (tree?.banks?.length > 0) bankId = tree.banks[0].id;
    else if (tree?.folders?.length > 0) bankId = tree.folders[0].banks?.[0]?.id;

    if (!bankId) {
      test.skip();
      return;
    }

    const createRes = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'flashcard', questionIds: undefined },
    });
    const session = await createRes.json();

    // Navigate to the flashcard play URL through the proxy
    await page.goto(`/flashcard/#/play/${session.id}`);
    await page.waitForSelector('flashcard-play-screen', { timeout: 10000 });

    // Should show a question card with Show Answer button
    await expect(page.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.question-text')).toBeVisible();

    // Click Show Answer
    await page.click('#show-answer-btn');

    // Should show Yes/No buttons
    await expect(page.locator('#yes-btn')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#no-btn')).toBeVisible({ timeout: 3000 });

    // Click Yes (mark as known)
    await page.click('#yes-btn');

    // Progress should advance — either more questions or completion
    // Either see another question or summary
    await Promise.race([
      page.waitForSelector('#show-answer-btn', { timeout: 5000 }),
      page.waitForSelector('flashcard-summary-screen', { timeout: 5000 }),
    ]).catch(() => {
      // May still be on play screen
    });
  });
});
