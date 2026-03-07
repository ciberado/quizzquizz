import { test, expect } from '@playwright/test';

/**
 * Bank Browser E2E Tests
 *
 * Covers:
 *  1. Hidden directories (e.g. .git) are excluded from the API tree and the UI.
 *  2. Folder drill-down navigation pushes browser history entries so the Back
 *     button returns to the previous folder level.
 */

const HOST = 'http://localhost:3001';
const API  = 'http://localhost:3000';

// ─── API-level: hidden directory exclusion ────────────────────────────────────

test.describe('API — hidden directories excluded from question bank tree', () => {
  test('GET /api/question-banks does not include folder entries starting with "."', async ({ request }) => {
    const res = await request.get(`${API}/api/question-banks`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    // The root tree is returned under the "tree" key
    const tree = body.tree;
    expect(tree).toBeDefined();

    // Walk the folder tree recursively and collect all folder names.
    function collectFolderNames(node: { name: string; folders: typeof node[] }): string[] {
      const names: string[] = [];
      for (const f of node.folders) {
        names.push(f.name);
        names.push(...collectFolderNames(f));
      }
      return names;
    }

    const folderNames = collectFolderNames(tree);
    const hiddenFolders = folderNames.filter((n: string) => n.startsWith('.'));
    expect(hiddenFolders).toHaveLength(0);
  });

  test('GET /api/question-banks does not list banks from hidden directories', async ({ request }) => {
    const res = await request.get(`${API}/api/question-banks`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const bankIds: string[] = (body.questionBanks ?? []).map((b: { id: string }) => b.id);

    // No bank ID should start with a dot or contain a path segment starting with a dot.
    for (const id of bankIds) {
      const segments = id.split('/');
      for (const seg of segments) {
        expect(seg.startsWith('.')).toBe(false);
      }
    }
  });
});

// ─── UI-level: folder navigation and browser history ─────────────────────────

test.describe('Host UI — bank browser folder navigation', () => {
  test('folder cards are rendered and clicking one descends into the folder', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);

    // Wait for the bank browser to finish loading
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 10000 });

    // If there are sub-folders, at least one folder card should be present.
    const folderCards = page.locator('.bank-browser-folder-card');
    const folderCount = await folderCards.count();

    if (folderCount === 0) {
      // Flat layout — no folders to navigate, skip folder-specific assertions.
      test.skip();
      return;
    }

    // Click the first folder card.
    const firstFolder = folderCards.first();
    const folderName = await firstFolder.locator('h3').textContent();
    await firstFolder.click();

    // The URL hash should now contain a ?folder= param.
    await expect(page).toHaveURL(/\?folder=/, { timeout: 5000 });

    // The breadcrumb should show the folder name.
    await expect(page.locator('.breadcrumb-current')).toHaveText(folderName?.trim() ?? '');
  });

  test('.git folder is NOT shown as a card in the browser', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 10000 });

    // No card should display ".git" as its heading.
    const allCardHeadings = page.locator('.question-bank-card h3');
    const headings = await allCardHeadings.allTextContents();
    expect(headings.some((h) => h.trim() === '.git')).toBe(false);
  });

  test('browser Back button returns to the parent folder after drilling down', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 10000 });

    const folderCards = page.locator('.bank-browser-folder-card');
    const folderCount = await folderCards.count();

    if (folderCount === 0) {
      test.skip();
      return;
    }

    // Record the URL before descending.
    const urlBefore = page.url();

    // Descend into the first folder.
    await folderCards.first().click();
    await expect(page).toHaveURL(/\?folder=/, { timeout: 5000 });

    // Press the browser Back button.
    await page.goBack();

    // Should be back at the URL before descending.
    await expect(page).toHaveURL(urlBefore, { timeout: 5000 });

    // The breadcrumb should no longer be at a child level —
    // "All Banks" should be the current (non-link) segment.
    await expect(page.locator('.breadcrumb-current')).toHaveText('All Banks');
  });

  test('breadcrumb link navigates back up and updates the URL', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 10000 });

    const folderCards = page.locator('.bank-browser-folder-card');
    if (await folderCards.count() === 0) { test.skip(); return; }

    // Descend into the first folder.
    await folderCards.first().click();
    await expect(page).toHaveURL(/\?folder=/, { timeout: 5000 });

    // Click the "All Banks" breadcrumb link to go back to root.
    await page.locator('.breadcrumb-link').first().click();

    // URL should no longer have the folder param.
    await expect(page).not.toHaveURL(/\?folder=/, { timeout: 5000 });
  });

  test('navigating back from question preview returns to the correct folder', async ({ page }) => {
    await page.goto(`${HOST}/#/create`);
    await expect(page.locator('.question-banks-grid')).toBeVisible({ timeout: 10000 });

    const folderCards = page.locator('.bank-browser-folder-card');
    const folderCount = await folderCards.count();

    if (folderCount === 0) {
      // Flat layout — click any bank card directly and then go back.
      const bankCards = page.locator('[data-bank-id]');
      if (await bankCards.count() === 0) { test.skip(); return; }

      await bankCards.first().click();
      await expect(page).toHaveURL(/\/preview\//, { timeout: 5000 });

      await page.goBack();
      await expect(page).toHaveURL(`${HOST}/#/create`, { timeout: 5000 });
      return;
    }

    // Descend into the first folder, then click any bank card inside.
    const folderNameEl = folderCards.first().locator('h3');
    const folderName = (await folderNameEl.textContent())?.trim() ?? '';
    await folderCards.first().click();
    await expect(page).toHaveURL(/\?folder=/, { timeout: 5000 });

    const bankCards = page.locator('[data-bank-id]');
    if (await bankCards.count() === 0) { test.skip(); return; }

    await bankCards.first().click();
    await expect(page).toHaveURL(/\/preview\//, { timeout: 5000 });

    // Go back — should land back in the same folder.
    await page.goBack();
    await expect(page).toHaveURL(/\?folder=/, { timeout: 5000 });
    await expect(page.locator('.breadcrumb-current')).toHaveText(folderName);
  });
});
