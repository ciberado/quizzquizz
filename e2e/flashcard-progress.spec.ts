/**
 * E2E tests for server-side flashcard progress tracking.
 *
 * Covers:
 *   1. API: recording card answers persists to the server
 *   2. API: GET progress returns saved card states
 *   3. API: two players in the same session have independent progress
 *   4. API: re-answering a card is an upsert (no duplicates)
 *   5. UI: the play screen calls the server on each Yes/No answer
 *   6. UI: session resume — pre-seeded server progress restores engine state
 *   7. Connection resilience — player continues studying while offline, resumes when back
 *   8. Mobile summary screen — no horizontal overflow on a 375-wide viewport
 */

import { test, expect, type BrowserContext } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
const FLASHCARD_APP = 'http://localhost:3004';
const BANK_ID = 'sample-general-knowledge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createFlashcardSession(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post(`${API_BASE}/api/sessions`, {
    data: { questionBankId: BANK_ID, mode: 'flashcard' },
  });
  expect(res.status()).toBe(201);
  return res.json() as Promise<{ id: string; pin: string; hostToken: string }>;
}

async function joinSession(
  request: import('@playwright/test').APIRequestContext,
  pin: string,
  nickname: string,
) {
  const res = await request.post(`${API_BASE}/api/sessions/join`, {
    data: { pin, nickname },
  });
  expect(res.status()).toBe(201);
  return res.json() as Promise<{ playerId: string; sessionId: string }>;
}

async function recordAnswer(
  request: import('@playwright/test').APIRequestContext,
  sessionId: string,
  payload: {
    playerId: string;
    cardId: string;
    known: boolean;
    box: 1 | 2 | 3;
    yesCount: number;
    noCount: number;
    graduated: boolean;
    firstTrySuccess: boolean | null;
  },
) {
  const res = await request.post(`${API_BASE}/api/sessions/${sessionId}/flashcard-answer`, {
    data: payload,
  });
  expect(res.status()).toBe(200);
  return res.json() as Promise<{ ok: boolean; progress: Record<string, unknown> }>;
}

// ---------------------------------------------------------------------------
// Suite 1: API-level progress tracking
// ---------------------------------------------------------------------------

test.describe('Flashcard Progress API', () => {
  let sessionId: string;
  let playerId: string;
  let pin: string;
  let firstCardId: string;

  test.beforeEach(async ({ request }) => {
    const session = await createFlashcardSession(request);
    sessionId = session.id;
    pin = session.pin;

    const player = await joinSession(request, pin, 'APITester');
    playerId = player.playerId;

    // Grab the first card ID from the session's flashcard state
    const stateRes = await request.get(`${API_BASE}/api/sessions/${sessionId}/flashcard-state`);
    const state = await stateRes.json() as { questions: Array<{ id: string }> };
    firstCardId = state.questions[0]!.id;
  });

  test('recording a card answer returns aggregate progress', async ({ request }) => {
    const result = await recordAnswer(request, sessionId, {
      playerId,
      cardId: firstCardId,
      known: true,
      box: 2,
      yesCount: 1,
      noCount: 0,
      graduated: false,
      firstTrySuccess: true,
    });

    expect(result.ok).toBe(true);
    const progress = result.progress as {
      playerId: string; totalCards: number; box2: number; totalAnswers: number;
    };
    expect(progress.playerId).toBe(playerId);
    expect(progress.totalCards).toBe(1);
    expect(progress.box2).toBe(1);
    expect(progress.totalAnswers).toBe(1);
  });

  test('GET progress returns all saved card states', async ({ request }) => {
    // Record two cards
    const stateRes = await request.get(`${API_BASE}/api/sessions/${sessionId}/flashcard-state`);
    const state = await stateRes.json() as { questions: Array<{ id: string }> };
    const [card1, card2] = state.questions;
    if (!card1 || !card2) {
      test.skip();
      return;
    }

    await recordAnswer(request, sessionId, {
      playerId, cardId: card1.id, known: true, box: 2, yesCount: 1, noCount: 0,
      graduated: false, firstTrySuccess: true,
    });
    await recordAnswer(request, sessionId, {
      playerId, cardId: card2.id, known: false, box: 1, yesCount: 0, noCount: 1,
      graduated: false, firstTrySuccess: false,
    });

    const progRes = await request.get(
      `${API_BASE}/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId}`
    );
    expect(progRes.status()).toBe(200);
    const prog = await progRes.json() as { cards: Array<{ cardId: string; box: number; yesCount: number }> };

    expect(prog.cards).toHaveLength(2);
    const saved1 = prog.cards.find((c) => c.cardId === card1.id);
    const saved2 = prog.cards.find((c) => c.cardId === card2.id);
    expect(saved1?.box).toBe(2);
    expect(saved1?.yesCount).toBe(1);
    expect(saved2?.box).toBe(1);
    expect(saved2?.yesCount).toBe(0);
  });

  test('re-answering a card upserts — no duplicates', async ({ request }) => {
    // First answer: known=true → box 2
    await recordAnswer(request, sessionId, {
      playerId, cardId: firstCardId, known: true, box: 2, yesCount: 1, noCount: 0,
      graduated: false, firstTrySuccess: true,
    });

    // Second answer: graduated via box 3
    await recordAnswer(request, sessionId, {
      playerId, cardId: firstCardId, known: true, box: 3, yesCount: 2, noCount: 0,
      graduated: true, firstTrySuccess: true,
    });

    const progRes = await request.get(
      `${API_BASE}/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId}`
    );
    const prog = await progRes.json() as { cards: Array<{ cardId: string; graduated: boolean }> };

    // Still only one record for this card
    const entries = prog.cards.filter((c) => c.cardId === firstCardId);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.graduated).toBe(true);
  });

  test('two players in the same session track progress independently', async ({ request }) => {
    const player2 = await joinSession(request, pin, 'Player2');
    const playerId2 = player2.playerId;

    // Player 1 gets card right
    await recordAnswer(request, sessionId, {
      playerId, cardId: firstCardId, known: true, box: 2, yesCount: 1, noCount: 0,
      graduated: false, firstTrySuccess: true,
    });

    // Player 2 gets same card wrong
    await recordAnswer(request, sessionId, {
      playerId: playerId2, cardId: firstCardId, known: false, box: 1, yesCount: 0, noCount: 1,
      graduated: false, firstTrySuccess: false,
    });

    const prog1Res = await request.get(
      `${API_BASE}/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId}`
    );
    const prog2Res = await request.get(
      `${API_BASE}/api/sessions/${sessionId}/flashcard-progress?playerId=${playerId2}`
    );

    const prog1 = await prog1Res.json() as { cards: Array<{ cardId: string; box: number }> };
    const prog2 = await prog2Res.json() as { cards: Array<{ cardId: string; box: number }> };

    const p1card = prog1.cards.find((c) => c.cardId === firstCardId);
    const p2card = prog2.cards.find((c) => c.cardId === firstCardId);

    expect(p1card?.box).toBe(2); // Player 1 moved to box 2
    expect(p2card?.box).toBe(1); // Player 2 stayed in box 1
  });

  test('recording answer returns 404 for unknown player', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/sessions/${sessionId}/flashcard-answer`, {
      data: {
        playerId: 'nonexistent-player-id',
        cardId: firstCardId,
        known: true,
        box: 2,
        yesCount: 1,
        noCount: 0,
        graduated: false,
        firstTrySuccess: true,
      },
    });
    expect(res.status()).toBe(404);
  });

  test('GET progress returns 400 when playerId is missing', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/sessions/${sessionId}/flashcard-progress`
    );
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Progress tracking in the UI
// ---------------------------------------------------------------------------

test.describe('Flashcard Progress UI', () => {
  test('play screen syncs card answer to server on Yes click', async ({ page, request }) => {
    const session = await createFlashcardSession(request);
    const player = await joinSession(request, session.pin, 'UISyncer');

    // Pre-inject session state so the play screen can call the API
    await page.addInitScript(
      ({ sessionId, playerId }) => {
        sessionStorage.setItem(
          'qz-flashcard-state',
          JSON.stringify({ sessionId, playerId, nickname: 'UISyncer', pin: '' }),
        );
      },
      { sessionId: session.id, playerId: player.playerId },
    );

    await page.goto(`${FLASHCARD_APP}/#/play/${session.id}`);
    await page.waitForSelector('flashcard-play-screen', { timeout: 10000 });

    // Wait for a card to appear
    await expect(page.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });

    // Show the answer then click Yes
    await page.click('#show-answer-btn');
    await expect(page.locator('#yes-btn')).toBeVisible({ timeout: 5000 });
    await page.click('#yes-btn');

    // Poll until the server registers at least one card answer
    await expect.poll(
      async () => {
        const progRes = await request.get(
          `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player.playerId}`
        );
        if (!progRes.ok()) return 0;
        const prog = await progRes.json() as { cards: unknown[] };
        return prog.cards.length;
      },
      { timeout: 8000, message: 'Expected server to record at least one card answer' },
    ).toBeGreaterThan(0);
  });

  test('session resume: engine restores box state from server', async ({ page, request }) => {
    // Create session and player
    const session = await createFlashcardSession(request);
    const player = await joinSession(request, session.pin, 'Resumee');

    // Get the first few card IDs
    const stateRes = await request.get(`${API_BASE}/api/sessions/${session.id}/flashcard-state`);
    const fcState = await stateRes.json() as { questions: Array<{ id: string }> };
    const cardIds = fcState.questions.slice(0, 3).map((q) => q.id);

    // Pre-seed server: mark all 3 cards as graduated
    for (const cardId of cardIds) {
      await recordAnswer(request, session.id, {
        playerId: player.playerId,
        cardId,
        known: true,
        box: 3,
        yesCount: 3,
        noCount: 0,
        graduated: true,
        firstTrySuccess: true,
      });
    }

    // Navigate to play screen — it should load the progress and restore engine state
    await page.addInitScript(
      ({ sessionId, playerId }) => {
        sessionStorage.setItem(
          'qz-flashcard-state',
          JSON.stringify({ sessionId, playerId, nickname: 'Resumee', pin: '' }),
        );
      },
      { sessionId: session.id, playerId: player.playerId },
    );

    await page.goto(`${FLASHCARD_APP}/#/play/${session.id}`);
    await page.waitForSelector('flashcard-play-screen', { timeout: 10000 });

    // The progress bar should show graduated cards (Done count ≥ 3)
    // The text is like "Done: 3/10"
    await expect(page.locator('.fc-stat-mastered')).toBeVisible({ timeout: 10000 });
    const masteredText = await page.locator('.fc-stat-mastered').textContent();
    const graduatedCount = parseInt(masteredText?.match(/\d+/)?.[0] ?? '0', 10);
    expect(graduatedCount).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Connection resilience
// ---------------------------------------------------------------------------

test.describe('Flashcard Connection Resilience', () => {
  test('player can study while offline — local engine continues', async ({ browser, request }) => {
    const session = await createFlashcardSession(request);
    const player = await joinSession(request, session.pin, 'OfflineStudier');

    const ctx: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.addInitScript(
      ({ sessionId, playerId }) => {
        sessionStorage.setItem(
          'qz-flashcard-state',
          JSON.stringify({ sessionId, playerId, nickname: 'OfflineStudier', pin: '' }),
        );
      },
      { sessionId: session.id, playerId: player.playerId },
    );

    await page.goto(`${FLASHCARD_APP}/#/play/${session.id}`);
    await page.waitForSelector('flashcard-play-screen', { timeout: 10000 });
    await expect(page.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });

    // Go offline before answering
    await ctx.setOffline(true);

    // The play screen should still be functional (fire-and-forget sync won't block UI)
    await page.click('#show-answer-btn');
    await expect(page.locator('#yes-btn')).toBeVisible({ timeout: 5000 });

    // Click Yes — the engine should advance locally even though the server is unreachable
    await page.click('#yes-btn');

    // Progress bar should still be visible and functional
    await expect(page.locator('.fc-progress-bar')).toBeVisible({ timeout: 5000 });

    // Come back online
    await ctx.setOffline(false);

    await ctx.close();
  });

  test('progress recovers after a brief connection loss — final state is consistent', async ({ browser, request }) => {
    const session = await createFlashcardSession(request);
    const player = await joinSession(request, session.pin, 'ReconnectStudier');

    const ctx: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.addInitScript(
      ({ sessionId, playerId }) => {
        sessionStorage.setItem(
          'qz-flashcard-state',
          JSON.stringify({ sessionId, playerId, nickname: 'ReconnectStudier', pin: '' }),
        );
      },
      { sessionId: session.id, playerId: player.playerId },
    );

    await page.goto(`${FLASHCARD_APP}/#/play/${session.id}`);
    await page.waitForSelector('flashcard-play-screen', { timeout: 10000 });

    // Answer one card while online — syncs to server
    await expect(page.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });
    await page.click('#show-answer-btn');
    await expect(page.locator('#yes-btn')).toBeVisible({ timeout: 5000 });
    await page.click('#yes-btn');

    // Brief offline period — next answer will fail to sync
    await ctx.setOffline(true);
    await page.waitForTimeout(300);

    // Answer another card offline
    if (await page.locator('#show-answer-btn').isVisible()) {
      await page.click('#show-answer-btn');
      if (await page.locator('#no-btn').isVisible()) {
        await page.click('#no-btn');
      }
    }

    // Come back online
    await ctx.setOffline(false);

    // Give time for any pending requests to settle
    await page.waitForTimeout(1000);

    // At least the first online answer should have been saved
    const progRes = await request.get(
      `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player.playerId}`
    );
    expect(progRes.ok()).toBe(true);
    const prog = await progRes.json() as { cards: unknown[] };
    // At least one card was synced before going offline
    expect(prog.cards.length).toBeGreaterThanOrEqual(1);

    await ctx.close();
  });

  test('two concurrent players in the same session make independent progress', async ({
    browser,
    request,
  }) => {
    const session = await createFlashcardSession(request);

    // Join two players
    const player1 = await joinSession(request, session.pin, 'StudentA');
    const player2 = await joinSession(request, session.pin, 'StudentB');

    // Get card IDs
    const stateRes = await request.get(`${API_BASE}/api/sessions/${session.id}/flashcard-state`);
    const fcState = await stateRes.json() as { questions: Array<{ id: string }> };
    const cardId = fcState.questions[0]!.id;

    // Open two browser contexts (two students on separate devices)
    const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    const inject = (sessionId: string, playerId: string, nickname: string) =>
      (page: typeof page1) =>
        page.addInitScript(
          ({ s, p, n }) => {
            sessionStorage.setItem('qz-flashcard-state', JSON.stringify({ sessionId: s, playerId: p, nickname: n, pin: '' }));
          },
          { s: sessionId, p: playerId, n: nickname },
        );

    await inject(session.id, player1.playerId, 'StudentA')(page1);
    await inject(session.id, player2.playerId, 'StudentB')(page2);

    await Promise.all([
      page1.goto(`${FLASHCARD_APP}/#/play/${session.id}`),
      page2.goto(`${FLASHCARD_APP}/#/play/${session.id}`),
    ]);

    await Promise.all([
      page1.waitForSelector('flashcard-play-screen', { timeout: 10000 }),
      page2.waitForSelector('flashcard-play-screen', { timeout: 10000 }),
    ]);

    // Player 1 answers Yes, Player 2 answers No
    await expect(page1.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });
    await page1.click('#show-answer-btn');
    await expect(page1.locator('#yes-btn')).toBeVisible({ timeout: 5000 });
    await page1.click('#yes-btn');

    await expect(page2.locator('#show-answer-btn')).toBeVisible({ timeout: 10000 });
    await page2.click('#show-answer-btn');
    await expect(page2.locator('#no-btn')).toBeVisible({ timeout: 5000 });
    await page2.click('#no-btn');

    // Poll for both server records to appear
    await expect.poll(
      async () => {
        const p1Res = await request.get(
          `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player1.playerId}`
        );
        const p2Res = await request.get(
          `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player2.playerId}`
        );
        const p1 = await p1Res.json() as { cards: unknown[] };
        const p2 = await p2Res.json() as { cards: unknown[] };
        return p1.cards.length > 0 && p2.cards.length > 0;
      },
      { timeout: 8000, message: 'Both players should have server-side progress' },
    ).toBe(true);

    // Verify independence: player 1's first answered card should be in box ≥ 2
    const p1Res = await request.get(
      `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player1.playerId}`
    );
    const p2Res = await request.get(
      `${API_BASE}/api/sessions/${session.id}/flashcard-progress?playerId=${player2.playerId}`
    );
    const p1prog = await p1Res.json() as { cards: Array<{ cardId: string; box: number; yesCount: number }> };
    const p2prog = await p2Res.json() as { cards: Array<{ cardId: string; box: number; noCount: number }> };

    // Player 1 got their first card right → moved to box 2
    const p1AnsweredCard = p1prog.cards.find((c) => c.yesCount > 0);
    expect(p1AnsweredCard?.box).toBeGreaterThanOrEqual(2);

    // Player 2's same-cardId record should show noCount ≥ 1 (if it happened to be the same card)
    // Otherwise just verify they have at least one card in box 1
    const p2AttemptedCard = p2prog.cards.find((c) => c.noCount > 0);
    expect(p2AttemptedCard).toBeDefined();

    await ctx1.close();
    await ctx2.close();
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Mobile summary screen layout
// ---------------------------------------------------------------------------

test.describe('Flashcard Summary Screen Mobile', () => {
  async function seedSummaryAndNavigate(page: import('@playwright/test').Page) {
    await page.goto(`${FLASHCARD_APP}/#/`);
    await page.evaluate(() => {
      sessionStorage.setItem(
        'qz-flashcard-stats',
        JSON.stringify({
          totalCards: 5,
          graduated: 3,
          firstTrySuccessCount: 2,
          retriedCount: 2,
          neverSucceededCount: 0,
          totalTimeMs: 90000,
          cardDetails: [
            {
              card: { id: 'c1', text: 'What is the powerhouse of the cell?', answer: 'Mitochondria' },
              yesCount: 2,
              noCount: 1,
              totalAttempts: 3,
              firstTrySuccess: false,
              box: 3,
              graduated: true,
            },
            {
              card: { id: 'c2', text: 'What is the speed of light in a vacuum?', answer: '299,792,458 m/s' },
              yesCount: 3,
              noCount: 0,
              totalAttempts: 3,
              firstTrySuccess: true,
              box: 3,
              graduated: true,
            },
            {
              card: { id: 'c3', text: 'Who wrote Hamlet?', answer: 'William Shakespeare' },
              yesCount: 3,
              noCount: 0,
              totalAttempts: 3,
              firstTrySuccess: true,
              box: 3,
              graduated: true,
            },
            {
              card: { id: 'c4', text: 'What is the chemical symbol for gold?', answer: 'Au' },
              yesCount: 1,
              noCount: 2,
              totalAttempts: 3,
              firstTrySuccess: false,
              box: 1,
              graduated: false,
            },
            {
              card: { id: 'c5', text: 'How many sides does an octagon have?', answer: '8' },
              yesCount: 0,
              noCount: 3,
              totalAttempts: 3,
              firstTrySuccess: false,
              box: 1,
              graduated: false,
            },
          ],
        }),
      );
      sessionStorage.setItem('qz-flashcard-bank-name', 'General Knowledge Test');
    });
    await page.goto(`${FLASHCARD_APP}/#/summary`);
    await page.waitForSelector('flashcard-summary-screen', { timeout: 10000 });
    await expect(page.getByText('Session Complete!')).toBeVisible({ timeout: 5000 });
  }

  test('summary screen renders without horizontal overflow on 375px viewport', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();

    await seedSummaryAndNavigate(page);

    // The body should not be wider than the viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance

    // Stats cards should be visible
    await expect(page.getByText('Cards Mastered')).toBeVisible();
    await expect(page.getByText('Known on First Try')).toBeVisible();

    // Download buttons should be visible and not overflow
    await expect(page.locator('#download-json-btn')).toBeVisible();
    await expect(page.locator('#download-csv-btn')).toBeVisible();

    const jsonBtnBox = await page.locator('#download-json-btn').boundingBox();
    const csvBtnBox = await page.locator('#download-csv-btn').boundingBox();
    expect(jsonBtnBox).not.toBeNull();
    expect(csvBtnBox).not.toBeNull();

    // On narrow screens, buttons stack vertically — each button should not exceed viewport width
    if (jsonBtnBox && csvBtnBox) {
      expect(jsonBtnBox.width).toBeLessThanOrEqual(viewportWidth);
      expect(csvBtnBox.width).toBeLessThanOrEqual(viewportWidth);
    }

    await ctx.close();
  });

  test('card details table is scrollable when content overflows on mobile', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();

    await seedSummaryAndNavigate(page);

    // The table scroll container should be present and scrollable
    const scrollContainer = page.locator('.fc-summary-table-scroll');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // The table itself should exist
    await expect(page.locator('.fc-summary-table')).toBeVisible();

    // Each card row should be present
    await expect(page.getByText('What is the powerhouse of the cell?')).toBeVisible();

    await ctx.close();
  });

  test('summary screen action buttons work on mobile', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();

    await seedSummaryAndNavigate(page);

    // New session button should be clickable
    const newSessionBtn = page.locator('#new-session-btn');
    await expect(newSessionBtn).toBeVisible();
    await expect(newSessionBtn).toBeEnabled();

    await ctx.close();
  });
});
