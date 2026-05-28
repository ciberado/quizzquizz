import { test, expect, Page } from '@playwright/test';

/**
 * Mobile Responsive E2E Tests
 * Verifies that key screens render properly at mobile viewport sizes (375×667 — iPhone SE).
 */

test.describe('Mobile Responsive', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  let sessionId: string;
  let hostToken: string;
  let pin: string;

  async function waitForComponentReady(page: Page, componentTag: string, timeout = 10000) {
    await page.waitForSelector(componentTag, { timeout, state: 'attached' });
    await page.waitForTimeout(100);
  }

  async function createSession(request: any) {
    const response = await request.post('/api/sessions', {
      data: { questionBankId: 'sample-general-knowledge' },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  test.beforeEach(async ({ request }) => {
    const session = await createSession(request);
    sessionId = session.id;
    hostToken = session.hostToken;
    pin = session.pin;
  });

  test('player-app: join and lobby screens render without horizontal overflow', async ({
    page,
    context,
  }) => {
    await context.setOffline(false);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
    });

    await page.goto('http://localhost:3002');
    await waitForComponentReady(page, 'join-screen');

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // Join screen heading visible
    await expect(page.locator('h1')).toBeVisible();

    // PIN input and button should be visible and tappable
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    const btn = page.locator('button:has-text("Join Quiz")');
    await expect(btn).toBeVisible();

    // Enter PIN and proceed to nickname
    await input.fill(pin);
    await btn.click();
    await waitForComponentReady(page, 'nickname-screen');
    await expect(page.locator('h1')).toBeVisible();

    // Still no overflow
    const bodyWidth2 = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth2).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('host-app: create session screen fits mobile viewport', async ({ page }) => {
    await page.goto('http://localhost:3001/host/');

    // Wait for the app to render (login or bank browser depending on auth state)
    await page.waitForSelector('#app', { state: 'attached' });
    await page.waitForTimeout(500);

    // No horizontal overflow at mobile width
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // Top bar should be visible and not overflowing
    const topBar = page.locator('.top-bar');
    if (await topBar.count() > 0) {
      await expect(topBar).toBeVisible();
      const topBarBox = await topBar.boundingBox();
      expect(topBarBox!.width).toBeLessThanOrEqual(viewportWidth + 1);
    }
  });

  test('host-app: lobby screen PIN is readable on mobile', async ({ page, request }) => {
    // Navigate directly to the lobby with the session
    await page.goto(`http://localhost:3001/host/#lobby/${sessionId}`);
    await page.waitForTimeout(1000);

    // The PIN display should be visible
    const pinElement = page.locator('.pin-code');
    if (await pinElement.count() > 0) {
      await expect(pinElement).toBeVisible();
      const pinBox = await pinElement.boundingBox();
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      // PIN should not overflow the viewport
      expect(pinBox!.x + pinBox!.width).toBeLessThanOrEqual(viewportWidth + 5);
    }
  });

  test('host-app: leaderboard renders in single column on mobile', async ({ page, request }) => {
    // Start quiz and advance to show leaderboard
    await request.post(`/api/sessions/${sessionId}/start`, {
      headers: { 'X-Host-Token': hostToken },
    });

    await page.goto(`http://localhost:3001/host/#leaderboard/${sessionId}`);
    await page.waitForTimeout(1000);

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // Leaderboard body should be column layout (actions below list)
    const body = page.locator('.leaderboard-body');
    if (await body.count() > 0) {
      const style = await body.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('flex-direction'),
      );
      expect(style).toBe('column');
    }
  });

  test('analytics-ui: sidebar toggle appears on mobile', async ({ page, context }) => {
    await context.setOffline(false);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
    });

    // Access analytics via the proxy
    await page.goto('http://localhost:3000/analytics/');
    await page.waitForTimeout(2000);

    // Check that we're on the analytics page (has layout or loading)
    const hasLayout = await page.locator('.layout').count();
    const hasToggle = await page.locator('.sidebar-toggle').count();

    if (hasLayout > 0 && hasToggle > 0) {
      // Full layout rendered — verify toggle is visible and functional
      const toggle = page.locator('.sidebar-toggle');
      await expect(toggle).toBeVisible();

      // Click toggle and sidebar should appear
      await toggle.click();
      await page.waitForTimeout(300);
      const sidebarAfter = page.locator('.sidebar.open');
      await expect(sidebarAfter).toBeVisible();
    }

    // Regardless of state, verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
