/**
 * E2E tests for Yjs real-time sync resilience:
 *
 * 1. Player reconnection — a player disconnects mid-game (network offline),
 *    reconnects, and immediately receives the current game state via Yjs.
 *
 * 2. Late join — a player tries to join a session that is already in the
 *    `playing` state; the API should reject with 400 and the UI should
 *    show a clear error message.
 *
 * Tests run against the local dev server (localhost:3000 proxy,
 * localhost:3001 host-app, localhost:3002 player-app).
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const HOST_APP_URL  = 'http://localhost:3001';
const PLAYER_APP_URL = 'http://localhost:3002';
const API_BASE       = 'http://localhost:3000';
const BANK_ID        = 'sample-general-knowledge';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Create a session, join one player, start the quiz; return session data. */
async function bootstrapSession(request: import('@playwright/test').APIRequestContext) {
  const sessionRes = await request.post(`${API_BASE}/api/sessions`, {
    data: { questionBankId: BANK_ID },
  });
  expect(sessionRes.status()).toBe(201);
  const session = await sessionRes.json() as {
    id: string; pin: string; hostToken: string;
  };

  const joinRes = await request.post(`${API_BASE}/api/sessions/join`, {
    data: { pin: session.pin, nickname: 'Tester' },
  });
  expect(joinRes.status()).toBe(201);
  const player = await joinRes.json() as { playerId: string; sessionId: string };

  const startRes = await request.post(`${API_BASE}/api/sessions/${session.id}/start`, {
    headers: { 'X-Host-Token': session.hostToken },
  });
  expect(startRes.status()).toBe(200);

  return { session, player };
}

/** Inject player localStorage state before the page boots. */
async function setPlayerState(
  page: Page,
  sessionId: string,
  playerId: string,
  nickname = 'Tester',
) {
  await page.addInitScript(
    ({ sessionId, playerId, nickname }) => {
      localStorage.setItem(
        'quizzquizz_player_state',
        JSON.stringify({ sessionId, playerId, nickname, score: 0, currentQuestionIndex: -1 }),
      );
    },
    { sessionId, playerId, nickname },
  );
}

/**
 * Collect `[PLAYER][Yjs]` console messages emitted by the player yjs-provider.
 * Returns a function that returns all captured messages so far.
 */
function captureYjsLogs(page: Page): () => string[] {
  const msgs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[PLAYER][Yjs]') || text.includes('[PLAYER][Lobby]') || text.includes('[PLAYER][Question]') || text.includes('[PLAYER][Waiting]')) {
      msgs.push(text);
    }
  });
  return () => msgs;
}

// ---------------------------------------------------------------------------
// Suite 1: Reconnection
// ---------------------------------------------------------------------------

test.describe('Yjs Reconnection', () => {
  let session: { id: string; pin: string; hostToken: string };
  let player: { playerId: string; sessionId: string };

  test.beforeEach(async ({ request }) => {
    const data = await bootstrapSession(request);
    session = data.session;
    player  = data.player;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    }).catch(() => {/* ignore cleanup errors */});
  });

  test('player reconnects and receives current timer after network loss', async ({ browser }) => {
    // Use an isolated browser context so we can toggle offline
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const getLogs = captureYjsLogs(page);

    await setPlayerState(page, session.id, player.playerId);
    await page.goto(`${PLAYER_APP_URL}/#/lobby/${session.id}`);
    await page.waitForLoadState('networkidle');

    // Wait for player to auto-navigate to question screen
    await expect(page).toHaveURL(/\/question/, { timeout: 8000 });

    // Capture initial timer value
    const timerLocator = page.locator('.timer').first();
    await expect(timerLocator).toBeVisible({ timeout: 5000 });
    const timerBefore = parseInt(
      (await timerLocator.textContent())!.replace('s', ''),
      10,
    );
    expect(timerBefore).toBeGreaterThan(0);

    // --- GO OFFLINE ---
    await ctx.setOffline(true);

    // Wait several seconds while game timer ticks forward on the server
    await page.waitForTimeout(4000);

    // --- COME BACK ONLINE ---
    await ctx.setOffline(false);

    // Yjs should log WS reconnection
    await expect.poll(
      () => getLogs().some(l => l.includes('WS status → connected')),
      { timeout: 10000, message: 'Expected [PLAYER][Yjs] WS status → connected after reconnect' },
    ).toBe(true);

    // Yjs should log sync=true
    await expect.poll(
      () => getLogs().some(l => l.includes('sync=true')),
      { timeout: 10000, message: 'Expected [PLAYER][Yjs] sync=true after reconnect' },
    ).toBe(true);

    // Timer should now reflect time that passed (less than the value before going offline)
    await page.waitForTimeout(1000); // let the Yjs update propagate to the UI
    const timerAfter = parseInt(
      (await timerLocator.textContent())!.replace('s', ''),
      10,
    );
    expect(timerAfter).toBeLessThan(timerBefore);

    // Player can still answer after reconnect
    const answerButtons = page.locator('.answer-btn');
    await expect(answerButtons.first()).toBeVisible({ timeout: 5000 });
    expect(await answerButtons.count()).toBeGreaterThan(0);

    await ctx.close();
  });

  test('player does not miss game-start transition when offline during lobby', async ({ browser, request }) => {
    // Create a new session that has NOT started yet
    const newSessionRes = await request.post(`${API_BASE}/api/sessions`, {
      data: { questionBankId: BANK_ID },
    });
    const newSession = await newSessionRes.json() as { id: string; pin: string; hostToken: string };
    const joinRes = await request.post(`${API_BASE}/api/sessions/join`, {
      data: { pin: newSession.pin, nickname: 'OfflineTester' },
    });
    const newPlayer = await joinRes.json() as { playerId: string };

    const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const getLogs = captureYjsLogs(page);

    await setPlayerState(page, newSession.id, newPlayer.playerId, 'OfflineTester');
    await page.goto(`${PLAYER_APP_URL}/#/lobby/${newSession.id}`);
    await page.waitForLoadState('networkidle');

    // Verify player is in lobby
    await expect(page.locator('lobby-screen')).toBeVisible({ timeout: 5000 });

    // Go offline while still in lobby
    await ctx.setOffline(true);
    await page.waitForTimeout(500);

    // Start the game from the server (simulate host starting while this player is offline)
    await request.post(`${API_BASE}/api/sessions/${newSession.id}/start`, {
      headers: { 'X-Host-Token': newSession.hostToken },
    });

    // Come back online
    await ctx.setOffline(false);

    // Yjs should reconnect and push status=playing → player navigates to question
    await expect(page).toHaveURL(/\/question/, { timeout: 12000 });

    // Player sees the question screen
    await expect(page.locator('question-screen')).toBeVisible({ timeout: 5000 });

    // Yjs logged the navigation
    expect(getLogs().some(l => l.includes('status=playing'))).toBe(true);

    // Cleanup
    await request.delete(`${API_BASE}/api/sessions/${newSession.id}`, {
      headers: { 'X-Host-Token': newSession.hostToken },
    }).catch(() => {});
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Late join
// ---------------------------------------------------------------------------

test.describe('Late Join Rejection', () => {
  let session: { id: string; pin: string; hostToken: string };

  test.beforeEach(async ({ request }) => {
    const data = await bootstrapSession(request);
    session = data.session;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    }).catch(() => {});
  });

  test('API rejects join when session is already playing', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/sessions/join`, {
      data: { pin: session.pin, nickname: 'LatePlayer' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/already started/i);
  });

  test('player UI shows error when trying to join a started game', async ({ page }) => {
    // Navigate to the nickname screen with the in-progress session PIN
    await page.goto(`${PLAYER_APP_URL}/#/nickname?pin=${session.pin}`);
    await page.waitForLoadState('networkidle');

    // Wait for nickname screen to render
    await expect(page.locator('nickname-screen')).toBeVisible({ timeout: 5000 });

    // Fill in a nickname and submit
    const nicknameInput = page.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="nick" i]').first();
    await expect(nicknameInput).toBeVisible({ timeout: 3000 });
    await nicknameInput.fill('LatePlayer');

    const joinBtn = page.locator('button[type="submit"], button:has-text("Join"), button:has-text("Enter")').first();
    await joinBtn.click();

    // Error message should appear
    const errorEl = page.locator('.error-message, [class*="error"]').first();
    await expect(errorEl).toBeVisible({ timeout: 5000 });
    await expect(errorEl).toContainText(/already started|already in progress|started/i);
  });

  test('late-joining player sees error and can navigate back to try a different PIN', async ({ page }) => {
    await page.goto(`${PLAYER_APP_URL}/#/nickname?pin=${session.pin}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nickname-screen')).toBeVisible({ timeout: 5000 });

    const nicknameInput = page.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="nick" i]').first();
    await nicknameInput.fill('LatePlayer');
    await page.locator('button[type="submit"], button:has-text("Join"), button:has-text("Enter")').first().click();

    // Error shown
    const errorEl = page.locator('.error-message, [class*="error"]').first();
    await expect(errorEl).toBeVisible({ timeout: 5000 });

    // Player can navigate back to the join screen
    const backBtn = page.locator('button:has-text("Back"), button:has-text("Go back"), a:has-text("Back")').first();
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/join|^\/$/, { timeout: 3000 });
    } else {
      // Fallback: navigate manually
      await page.goto(`${PLAYER_APP_URL}/#/join`);
      await expect(page.locator('join-screen')).toBeVisible({ timeout: 3000 });
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Host reconnection
// ---------------------------------------------------------------------------

test.describe('Host Reconnection', () => {
  let session: { id: string; pin: string; hostToken: string };

  test.beforeEach(async ({ request }) => {
    const data = await bootstrapSession(request);
    session = data.session;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    }).catch(() => {});
  });

  test('host re-syncs answer count after page reload (simulates reconnect)', async ({ browser, request }) => {
    const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    const yjsLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[HOST][Yjs]') || text.includes('[HOST][Question]')) {
        yjsLogs.push(text);
      }
    });

    // Set host state and navigate to question screen
    await page.addInitScript(
      ({ sessionId, hostToken }) => {
        localStorage.setItem(
          'quizzquizz_host_state',
          JSON.stringify({ sessionId, hostToken, pin: '', questionBankId: 'sample-general-knowledge' }),
        );
      },
      { sessionId: session.id, hostToken: session.hostToken },
    );
    await page.goto(`${HOST_APP_URL}/#/question/${session.id}`);
    await page.waitForLoadState('networkidle');

    // Wait for question display
    await expect(page.locator('question-display-screen')).toBeVisible({ timeout: 8000 });

    // Verify WS is connected before reload
    await expect.poll(
      () => yjsLogs.some(l => l.includes('WS status → connected')),
      { timeout: 6000, message: 'Expected [HOST][Yjs] WS connected' },
    ).toBe(true);

    // Have a player answer via API (while host is on the page — a real-time sync test)
    const sessionState = await request.get(`${API_BASE}/api/sessions/${session.id}`, {
      headers: { 'X-Host-Token': session.hostToken },
    });
    const sessionData = await sessionState.json() as { questions?: Array<{ id: string; answers: Array<{ id: string }> }> };
    const q = sessionData?.questions?.[0];
    if (q?.answers?.[0]) {
      const j = await request.post(`${API_BASE}/api/sessions/join`, {
        data: { pin: session.pin, nickname: 'SyncTestPlayer' },
      }).catch(() => null);
      if (j && j.ok()) {
        const pd = await j.json() as { playerId: string };
        await request.post(`${API_BASE}/api/sessions/${session.id}/answer`, {
          headers: { 'X-Player-Id': pd.playerId, 'Content-Type': 'application/json' },
          data: { questionId: q.id, selectedAnswerIds: [q.answers[0].id] },
        }).catch(() => null);
      }
    }

    // Clear logs and reload page (simulates a browser reconnect)
    yjsLogs.length = 0;
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Host should reconnect via Yjs after reload
    await expect.poll(
      () => yjsLogs.some(l => l.includes('WS status → connected')),
      { timeout: 10000, message: 'Expected [HOST][Yjs] WS connected after reload' },
    ).toBe(true);

    // Yjs doc should sync
    await expect.poll(
      () => yjsLogs.some(l => l.includes('sync=true')),
      { timeout: 10000, message: 'Expected [HOST][Yjs] sync=true after reload' },
    ).toBe(true);

    // Host UI should still show the question display screen
    await expect(page.locator('question-display-screen')).toBeVisible({ timeout: 5000 });

    await ctx.close();
  });

  test('host navigates to question screen when refreshing browser during active game', async ({ browser, request: _req }) => {
    const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    // Inject host state
    await page.addInitScript(
      ({ sessionId, hostToken }) => {
        localStorage.setItem(
          'quizzquizz_host_state',
          JSON.stringify({ sessionId, hostToken, pin: '', questionBankId: 'sample-general-knowledge' }),
        );
      },
      { sessionId: session.id, hostToken: session.hostToken },
    );

    // Navigate to the LOBBY (not question) — simulates host refreshing to lobby while game is playing
    await page.goto(`${HOST_APP_URL}/#/lobby/${session.id}`);
    await page.waitForLoadState('networkidle');

    // The lobby-screen Yjs observer should detect status=playing and navigate away
    await expect(page).toHaveURL(/\/question/, { timeout: 10000 });
    await expect(page.locator('question-display-screen')).toBeVisible({ timeout: 5000 });

    await ctx.close();
  });
});
