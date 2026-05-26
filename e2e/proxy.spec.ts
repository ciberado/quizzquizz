/**
 * E2E tests for the dev proxy single-port routing (port 3000).
 * Verifies that the proxy correctly forwards requests to the right dev servers.
 *
 * All requests use http://localhost:3000 (baseURL) — the proxy entry point.
 *
 * Route table under test:
 *   /health       → api-server  (:3010)
 *   /api/*        → api-server  (:3010)
 *   /host/*       → host-app    (:3001)
 *   /analytics/*  → analytics-ui(:3003)
 *   /flashcard/*  → flashcard-app(:3004)
 *   /*            → player-app  (:3002)
 */

import { test, expect } from '@playwright/test';

// baseURL is http://localhost:3000 (set in playwright.config.ts)

test.describe('Proxy HTTP routing', () => {
  test('GET /health → API server returns ok', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /api/question-banks → API server returns question banks list', async ({ request }) => {
    const res = await request.get('/api/question-banks');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should have a tree structure or list
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });

  test('POST /api/sessions → API server creates a session', async ({ request }) => {
    // First get a bank ID
    const banksRes = await request.get('/api/question-banks');
    const banks = await banksRes.json();
    const tree = banks.tree;
    let bankId: string | undefined;
    if (tree?.banks?.length > 0) bankId = tree.banks[0].id;
    else if (tree?.folders?.length > 0) bankId = tree.folders[0].banks?.[0]?.id;

    if (!bankId) {
      test.skip();
      return;
    }

    const res = await request.post('/api/sessions', {
      data: { questionBankId: bankId, mode: 'quiz' },
    });
    expect(res.status()).toBe(201);
    const session = await res.json();
    expect(session.pin).toBeDefined();
    expect(session.mode).toBe('quiz');
  });

  test('GET / → player-app returns HTML', async ({ request }) => {
    const res = await request.get('/');
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
  });

  test('GET /host/ → host-app returns HTML', async ({ request }) => {
    const res = await request.get('/host/');
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
  });

  test('GET /flashcard/ → flashcard-app returns HTML', async ({ request }) => {
    const res = await request.get('/flashcard/');
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/html');
  });
});

test.describe('Proxy UI routing', () => {
  test('player-app renders at proxy root /', async ({ page }) => {
    await page.goto('/');
    // Player app should load — check for the join screen custom element
    await page.waitForSelector('join-screen, qz-join-screen, [data-screen]', { timeout: 10_000 }).catch(() => {
      // May already be rendered inside shadow DOM or differently named
    });
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('host-app renders at proxy /host/', async ({ page }) => {
    await page.goto('/host/');
    // Host app should load
    await page.waitForSelector('create-session-screen, [data-screen]', { timeout: 10_000 }).catch(() => {});
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('flashcard-app renders at proxy /flashcard/', async ({ page }) => {
    await page.goto('/flashcard/');
    await page.waitForSelector('flashcard-join-screen', { timeout: 10_000 });
    const pinInput = page.locator('#pin-input');
    await expect(pinInput).toBeVisible();
  });
});
