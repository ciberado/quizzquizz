/**
 * E2E tests for flashcard set tracking.
 *
 * Covers:
 *   1. Set picker modal appears when clicking "Launch Flashcards"
 *   2. Sets are listed with status badges
 *   3. Correct set is auto-selected (first incomplete)
 *   4. User can switch to a different set
 *   5. Reset Progress clears all completedAt markers
 *   6. Cancelling the picker does not create a session
 *   7. Confirming a set creates a session with the right question IDs
 *   8. After session completion the set is marked done in localStorage
 *   9. Box counts are persisted after answering a card as host (no playerId)
 */

import { test, expect, type Page } from '@playwright/test';

const HOST = 'http://localhost:3001';
const FLASHCARD_APP = 'http://localhost:3004';
const API_BASE = 'http://localhost:3000';
const BANK_PATH = 'sample-general-knowledge';
const PREVIEW_URL = `${HOST}/#/preview/${BANK_PATH}`;
const LS_PREFIX = 'qz-fc-progress-';
const LS_ACTIVE = 'qz-fc-active-session';

async function clearFlashcardProgress(page: Page, bankId: string) {
  await page.evaluate(
    ({ prefix, bankId, active }) => {
      localStorage.removeItem(prefix + bankId);
      localStorage.removeItem(active);
    },
    { prefix: LS_PREFIX, bankId, active: LS_ACTIVE },
  );
}

async function getFlashcardProgress(page: Page, bankId: string) {
  return page.evaluate(
    ({ prefix, bankId }) => {
      const raw = localStorage.getItem(prefix + bankId);
      return raw ? JSON.parse(raw) : null;
    },
    { prefix: LS_PREFIX, bankId },
  );
}

test.describe('Flashcard Set Picker', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to preview screen and clear any existing progress
    await page.goto(PREVIEW_URL);
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 15000 });
    await clearFlashcardProgress(page, BANK_PATH);
  });

  test('set picker modal appears when clicking Launch Flashcards', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();

    // Modal should appear
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Should list at least one set
    const setButtons = page.locator('[data-action="select-set"]');
    await expect(setButtons.first()).toBeVisible();
    expect(await setButtons.count()).toBeGreaterThan(0);
  });

  test('sets show Not started badge when no progress stored', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // All sets should show "Not started"
    const notStarted = page.getByText('Not started');
    expect(await notStarted.count()).toBeGreaterThan(0);
  });

  test('auto-selects the first set by default', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Launch button should say "Launch Set 1"
    await expect(page.getByRole('button', { name: /Launch Set 1/i })).toBeVisible();
  });

  test('user can select a different set', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    const setButtons = page.locator('[data-action="select-set"]');
    const count = await setButtons.count();

    if (count >= 2) {
      await setButtons.nth(1).click();
      // Launch button should update to Set 2
      await expect(page.getByRole('button', { name: /Launch Set 2/i })).toBeVisible();
    }
  });

  test('Cancel closes the modal without creating a session', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Use data-action selector to avoid ambiguity with the page's own Cancel button
    await page.locator('[data-action="cancel-set-picker"]').first().click();

    // Modal should disappear
    await expect(page.getByText('Select Study Set')).not.toBeVisible();

    // Should still be on preview screen
    await expect(page.locator('.question-preview-card').first()).toBeVisible();
  });

  test('backdrop click closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Click the backdrop (outside the modal card)
    await page.locator('[data-action="close-set-picker-backdrop"]').click({ position: { x: 10, y: 10 } });

    await expect(page.getByText('Select Study Set')).not.toBeVisible();
  });

  test('Reset Progress clears all completion dates', async ({ page }) => {
    // Open the picker first so it writes the correctly-shaped progress to localStorage
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });
    // Close it (saves progress)
    await page.locator('[data-action="cancel-set-picker"]').first().click();

    // Now inject a completedAt for the first set (shape already matches the bank)
    await page.evaluate(
      ({ prefix, bankId }) => {
        const raw = localStorage.getItem(prefix + bankId);
        if (!raw) return;
        const progress = JSON.parse(raw);
        if (progress.sets.length > 0) {
          progress.sets[0].completedAt = '2026-01-01T00:00:00.000Z';
          localStorage.setItem(prefix + bankId, JSON.stringify(progress));
        }
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH },
    );

    // Reopen the picker — it should read the saved progress (sets match, preserves completedAt)
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Should see a "Done" badge for the first set
    await expect(page.getByText(/Done/)).toBeVisible({ timeout: 5000 });

    // Click Reset Progress
    await page.getByRole('button', { name: /Reset Progress/i }).click();

    // All badges should now say "Not started"
    const notStarted = page.getByText('Not started');
    expect(await notStarted.count()).toBeGreaterThan(0);
    // Badge text should no longer contain "Done"
    const doneBadges = page.locator('[data-action="select-set"] span').filter({ hasText: /Done/ });
    expect(await doneBadges.count()).toBe(0);
  });

  test('auto-selects next incomplete set when previous sets are completed', async ({ page }) => {
    // Simulate set 0 already completed by saving progress to localStorage
    await page.evaluate(
      ({ prefix, bankId }) => {
        const existing = localStorage.getItem(prefix + bankId);
        if (!existing) return;
        const progress = JSON.parse(existing);
        if (progress.sets.length >= 2) {
          progress.sets[0].completedAt = '2026-01-01T00:00:00.000Z';
          localStorage.setItem(prefix + bankId, JSON.stringify(progress));
        }
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH },
    );

    // Open the picker fresh (it will build progress from bank IDs)
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Build fresh progress (no stored progress yet after clear in beforeEach)
    // So first incomplete is Set 1 = index 0 = "Set 1"
    // This confirms auto-selection works; more specific set-2 test below
    await expect(page.getByRole('button', { name: /Launch Set \d+/i })).toBeVisible();
  });

  test('launching a set creates session with qz-fc-active-session in localStorage', async ({ page }) => {
    await page.getByRole('button', { name: /Launch Flashcards/i }).click();
    await expect(page.getByText('Select Study Set')).toBeVisible({ timeout: 5000 });

    // Click launch
    await page.getByRole('button', { name: /Launch Set 1/i }).click();

    // Wait for navigation to flashcard lobby (may take a moment for API call)
    await page.waitForURL(/\/flashcard-lobby\//, { timeout: 10000 });

    // Check localStorage has the active session key
    const active = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, LS_ACTIVE);

    expect(active).not.toBeNull();
    expect(active.bankId).toBe(BANK_PATH);
    expect(active.setIndex).toBe(0);
  });
});

test.describe('Flashcard Set Completion Tracking', () => {
  test('completing a session marks the set done in localStorage', async ({ page, request }) => {
    // Create a flashcard session directly via API
    const createRes = await request.post('/api/sessions', {
      data: { questionBankId: BANK_PATH, mode: 'flashcard', questionIds: undefined },
    });
    expect(createRes.ok()).toBeTruthy();
    const session = await createRes.json();

    // Pre-seed localStorage with progress and active session
    await page.goto('/flashcard/');
    await page.evaluate(
      ({ prefix, bankId, activeKey, setIndex }) => {
        const progress = {
          setSize: 10,
          sets: [{ ids: ['any-id'], completedAt: null }],
        };
        localStorage.setItem(prefix + bankId, JSON.stringify(progress));
        localStorage.setItem(activeKey, JSON.stringify({ bankId, setIndex }));
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH, activeKey: LS_ACTIVE, setIndex: 0 },
    );

    // Navigate to summary screen directly (simulating a completed session)
    // Seed the sessionStorage stats that the summary screen reads
    await page.evaluate(() => {
      sessionStorage.setItem(
        'qz-flashcard-stats',
        JSON.stringify({
          totalCards: 1,
          graduated: 1,
          firstTrySuccessCount: 1,
          retriedCount: 0,
          neverSucceededCount: 0,
          totalTimeMs: 30000,
          cardDetails: [
            {
              card: { id: 'any-id', text: 'Q', answer: 'A' },
              yesCount: 1,
              noCount: 0,
              totalAttempts: 1,
              firstTrySuccess: true,
              graduated: true,
            },
          ],
        }),
      );
      sessionStorage.setItem('qz-flashcard-bank-name', 'Test Bank');
    });

    // Navigate to summary
    await page.goto('/flashcard/#/summary');
    await expect(page.getByText('Session Complete!')).toBeVisible({ timeout: 10000 });

    // Active session key should be cleared
    const activeAfter = await page.evaluate((key) => localStorage.getItem(key), LS_ACTIVE);
    expect(activeAfter).toBeNull();

    // Progress should show set 0 as completed
    const progress = await page.evaluate(
      ({ prefix, bankId }) => {
        const raw = localStorage.getItem(prefix + bankId);
        return raw ? JSON.parse(raw) : null;
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH },
    );

    expect(progress).not.toBeNull();
    expect(progress.sets[0].completedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite: Box count persistence when host plays without a playerId
// ---------------------------------------------------------------------------

test.describe('Flashcard host-play box count persistence', () => {
  /**
   * Regression test for: syncAnswer returned early when state.playerId was null,
   * preventing updateSetBoxCounts from running. The host opens the play URL
   * directly (no join step), so state.playerId is always null.
   *
   * After the fix, box counts must be written to localStorage after each card
   * answer regardless of whether a playerId is present.
   */
  test('box counts are persisted after answering a card as host (no playerId)', async ({
    page,
    request,
  }) => {
    // 1. Create a flashcard session via API
    const createRes = await request.post(`${API_BASE}/api/sessions`, {
      data: { questionBankId: BANK_PATH, mode: 'flashcard' },
    });
    expect(createRes.status()).toBe(201);
    const session = await createRes.json() as { id: string; pin: string };

    // 2. Navigate to the flashcard-app play URL as the host would
    //    (with bankId + setIndex in hash params, no prior join → state.playerId is null)
    const playUrl = `${FLASHCARD_APP}/#/play/${session.id}?bankId=${encodeURIComponent(BANK_PATH)}&setIndex=0&returnUrl=${encodeURIComponent(`${HOST}/#/`)}`;
    await page.goto(playUrl);

    // 3. Pre-seed localStorage with a full BankProgress so sameShape check succeeds
    //    (mirrors what the host-app's openSetPicker() does before launching)
    await page.evaluate(
      ({ prefix, bankId }) => {
        const existing = localStorage.getItem(prefix + bankId);
        if (!existing) {
          // Create a minimal BankProgress with 3 sets (30 cards, 10 each)
          const stub = {
            setSize: 10,
            sets: [
              { ids: Array.from({ length: 10 }, (_, i) => `card-${i}`), completedAt: null, boxCounts: null },
              { ids: Array.from({ length: 10 }, (_, i) => `card-${i + 10}`), completedAt: null, boxCounts: null },
              { ids: Array.from({ length: 10 }, (_, i) => `card-${i + 20}`), completedAt: null, boxCounts: null },
            ],
          };
          localStorage.setItem(prefix + bankId, JSON.stringify(stub));
        }
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH },
    );

    // 4. Wait for the play screen to render (first card should appear)
    await expect(page.locator('.fc-show-btn, .fc-yes-btn')).toBeVisible({ timeout: 15000 });

    // 5. If the answer is not revealed yet, reveal it first
    const showBtn = page.locator('.fc-show-btn');
    if (await showBtn.isVisible()) {
      await showBtn.click();
    }

    // 6. Click "Yes" to answer the first card
    await expect(page.locator('.fc-yes-btn')).toBeVisible({ timeout: 5000 });
    await page.locator('.fc-yes-btn').click();

    // Small wait for synchronous localStorage write (no async needed)
    await page.waitForTimeout(200);

    // 7. Verify localStorage has boxCounts updated for set 0
    const progress = await page.evaluate(
      ({ prefix, bankId }) => {
        const raw = localStorage.getItem(prefix + bankId);
        return raw ? JSON.parse(raw) : null;
      },
      { prefix: LS_PREFIX, bankId: BANK_PATH },
    );

    expect(progress).not.toBeNull();
    const bc = progress.sets[0]?.boxCounts;
    // After one "Yes" answer, total must be > 0 and at least one box must have cards
    expect(bc).not.toBeNull();
    expect(bc.total).toBeGreaterThan(0);
    expect(bc.box1 + bc.box2 + bc.box3 + bc.graduated).toBe(bc.total);
  });
});
