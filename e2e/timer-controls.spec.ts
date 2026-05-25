/**
 * E2E tests for host-app timer control buttons:
 *   - +5s / -5s adjust the countdown on the question screen
 *   - "Jump to Scoreboard" skips remaining time and navigates to the leaderboard
 *   - "End Quiz" button is absent on the question screen
 *   - "End Quiz Now" button is present on the leaderboard screen
 */

import { test, expect } from '@playwright/test';

const HOST_APP_URL = 'http://localhost:3001';
const API_BASE    = 'http://localhost:3000';
// Well-known bank that is always loaded in dev (10 questions, ≥20s timer per question)
const BANK_ID = 'sample-general-knowledge';

/** Set host-app localStorage state so the component picks it up on next load. */
async function setHostState(
  page: import('@playwright/test').Page,
  sessionId: string,
  hostToken: string,
) {
  await page.evaluate(
    ({ sessionId, hostToken }) => {
      localStorage.setItem(
        'quizzquizz_host_state',
        JSON.stringify({ sessionId, hostToken, pin: '', questionBankId: '' }),
      );
    },
    { sessionId, hostToken },
  );
}

/** Create a session, join one player, start the quiz, and return the session object. */
async function bootstrapSession(request: import('@playwright/test').APIRequestContext) {
  const sessionRes = await request.post(`${API_BASE}/api/sessions`, {
    data: { questionBankId: BANK_ID },
  });
  expect(sessionRes.status()).toBe(201);
  const session = await sessionRes.json() as { id: string; pin: string; hostToken: string };

  await request.post(`${API_BASE}/api/sessions/join`, {
    data: { pin: session.pin, nickname: 'TimerTester' },
  });

  const startRes = await request.post(`${API_BASE}/api/sessions/${session.id}/start`, {
    headers: { 'X-Host-Token': session.hostToken },
  });
  expect(startRes.ok()).toBeTruthy();

  return session;
}

/** Navigate host app to the question screen with state pre-loaded. */
async function navigateToQuestionScreen(
  page: import('@playwright/test').Page,
  session: { id: string; hostToken: string },
) {
  await page.goto(`${HOST_APP_URL}/#/lobby/${session.id}`);
  await setHostState(page, session.id, session.hostToken);
  await page.reload();
  await page.goto(`${HOST_APP_URL}/#/question/${session.id}`);
  await page.waitForLoadState('networkidle');
}

test.describe('Host timer controls on question screen', () => {
  test('shows +5s, -5s and Jump to Scoreboard; no End Quiz button', async ({
    page,
    request,
  }) => {
    const session = await bootstrapSession(request);
    await navigateToQuestionScreen(page, session);

    // Wait for the question to load
    await expect(page.locator('.timer-value')).toBeVisible({ timeout: 8000 });

    // Timer-adjustment and jump buttons must be visible
    await expect(page.locator('#plus-5-button')).toBeVisible();
    await expect(page.locator('#minus-5-button')).toBeVisible();
    await expect(page.locator('#jump-button')).toBeVisible();

    // End Quiz must NOT appear on the question screen
    await expect(page.locator('#end-button')).toHaveCount(0);

    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });

  test('+5s button increases the timer display by 5 seconds', async ({
    page,
    request,
  }) => {
    const session = await bootstrapSession(request);
    await navigateToQuestionScreen(page, session);

    const timerLocator = page.locator('.timer-value');
    await expect(timerLocator).toBeVisible({ timeout: 8000 });

    const before = parseInt((await timerLocator.textContent())?.trim() ?? '0', 10);
    expect(before).toBeGreaterThan(0);

    await page.locator('#plus-5-button').click();

    const after = parseInt((await timerLocator.textContent())?.trim() ?? '0', 10);
    // Allow ±1s tolerance for in-flight timer tick between read and click
    expect(after).toBeGreaterThanOrEqual(before + 4);

    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });

  test('-5s button decreases the timer display by 5 seconds', async ({
    page,
    request,
  }) => {
    const session = await bootstrapSession(request);
    await navigateToQuestionScreen(page, session);

    const timerLocator = page.locator('.timer-value');
    await expect(timerLocator).toBeVisible({ timeout: 8000 });

    const before = parseInt((await timerLocator.textContent())?.trim() ?? '0', 10);
    expect(before).toBeGreaterThan(5); // need room to subtract

    await page.locator('#minus-5-button').click();

    const after = parseInt((await timerLocator.textContent())?.trim() ?? '0', 10);
    // Allow ±1s tolerance
    expect(after).toBeLessThanOrEqual(before - 4);

    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });

  test('Jump to Scoreboard navigates to the leaderboard', async ({
    page,
    request,
  }) => {
    const session = await bootstrapSession(request);
    await navigateToQuestionScreen(page, session);

    await expect(page.locator('.timer-value')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#jump-button')).toBeVisible();

    await page.locator('#jump-button').click();

    // Should land on leaderboard (hash contains /leaderboard)
    await expect(page).toHaveURL(/leaderboard/, { timeout: 5000 });

    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });

  test('End Quiz Now button is visible on the leaderboard screen', async ({
    page,
    request,
  }) => {
    const session = await bootstrapSession(request);

    // Pre-load state then navigate to the leaderboard route (no session ID in hash)
    await page.goto(`${HOST_APP_URL}/#/lobby/${session.id}`);
    await setHostState(page, session.id, session.hostToken);
    await page.reload();
    await page.goto(`${HOST_APP_URL}/#/leaderboard`);
    await page.waitForLoadState('networkidle');

    // Leaderboard renders "End Quiz Now"
    await expect(page.locator('[data-action="end"]')).toBeVisible({ timeout: 8000 });

    // Timer adjustment buttons must NOT appear on the leaderboard
    await expect(page.locator('#plus-5-button')).toHaveCount(0);
    await expect(page.locator('#minus-5-button')).toHaveCount(0);

    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
  });
});
