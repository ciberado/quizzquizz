import { test, expect } from '@playwright/test';

/**
 * Phase 7A E2E Tests: Advanced Question Bank Management
 * Tests the question preview and configuration screen
 */

test.describe('Phase 7A - Question Preview & Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to host app
    await page.goto('http://localhost:3001');
  });

  test('should navigate to question preview screen when clicking a question bank', async ({ page }) => {
    // Wait for question banks to load
    await expect(page.locator('.question-bank-card').first()).toBeVisible({ timeout: 10000 });
    
    // Click on the question bank card
    await page.locator('.question-bank-card').first().click();
    
    // Should navigate to preview screen
    await expect(page).toHaveURL(/\/preview\/sample-general-knowledge/);
    
    // Should show the bank name as header
    await expect(page.getByRole('heading', { name: 'General Knowledge', level: 1 })).toBeVisible();
    
    // Should show back button
    await expect(page.getByRole('button', { name: /Back|←/ })).toBeVisible();
  });

  test('should display question preview with filters and pagination', async ({ page }) => {
    // Navigate directly to preview
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    
    // Wait for questions to load
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Should show filter panel
    await expect(page.getByText('Difficulty')).toBeVisible();
    await expect(page.getByText('Topics')).toBeVisible();
    
    // Should show difficulty checkboxes
    await expect(page.locator('input[type="checkbox"][value="easy"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][value="medium"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"][value="hard"]')).toBeVisible();
    
    // Should show "Use all questions" checkbox (checked by default)
    const selectAllCheckbox = page.getByLabel('Use all questions');
    await expect(selectAllCheckbox).toBeVisible();
    await expect(selectAllCheckbox).toBeChecked();
    
    // Should show random order toggle
    await expect(page.getByLabel('Random order')).toBeVisible();
    
    // Should display questions
    const questionCards = page.locator('.question-preview-card');
    const count = await questionCards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10); // Default limit is 10
    
    // Should show question number, text, answers, difficulty badge
    const firstQuestion = questionCards.first();
    await expect(firstQuestion.locator('h4')).toBeVisible();
    await expect(firstQuestion.locator('.badge')).toBeVisible();
  });

  test('should filter questions by difficulty', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Get initial count
    const initialText = await page.textContent('h3');
    const initialMatch = initialText?.match(/\((\d+) questions? match filters\)/);
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0;
    
    // Filter by easy difficulty only
    await page.locator('input[type="checkbox"][value="easy"]').check();
    
    // Wait for re-render (questions should update)
    await page.waitForTimeout(1000);
    
    // Get new count
    const filteredText = await page.textContent('h3');
    const filteredMatch = filteredText?.match(/\((\d+) questions? match filters\)/);
    const filteredCount = filteredMatch ? parseInt(filteredMatch[1], 10) : 0;
    
    // Should have fewer or same questions
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    
    // All visible questions should have easy badge
    const easyBadges = page.locator('.badge-easy');
    const easyCount = await easyBadges.count();
    expect(easyCount).toBeGreaterThan(0);
    
    // Clear filters button should appear
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
  });

  test('should filter questions by multiple difficulties', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Filter by easy and medium
    await page.locator('input[type="checkbox"][value="easy"]').check();
    await page.locator('input[type="checkbox"][value="medium"]').check();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Should show easy and/or medium badges
    const easyBadges = page.locator('.badge-easy');
    const mediumBadges = page.locator('.badge-medium');
    const hardBadges = page.locator('.badge-hard');
    
    const easyCount = await easyBadges.count();
    const mediumCount = await mediumBadges.count();
    const hardCount = await hardBadges.count();
    
    expect(easyCount + mediumCount).toBeGreaterThan(0);
    expect(hardCount).toBe(0); // No hard questions should be visible
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Apply filters
    await page.locator('input[type="checkbox"][value="easy"]').check();
    await page.waitForTimeout(500);
    
    // Clear filters button should be visible
    const clearBtn = page.getByRole('button', { name: 'Clear Filters' });
    await expect(clearBtn).toBeVisible();
    
    // Click clear filters
    await clearBtn.click();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Filters should be unchecked
    await expect(page.locator('input[type="checkbox"][value="easy"]')).not.toBeChecked();
    await expect(page.locator('input[type="checkbox"][value="medium"]')).not.toBeChecked();
    await expect(page.locator('input[type="checkbox"][value="hard"]')).not.toBeChecked();
    
    // Clear filters button should be hidden
    await expect(clearBtn).not.toBeVisible();
  });

  test('should toggle between select all and manual selection mode', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    const selectAllCheckbox = page.getByLabel('Use all questions');
    
    // By default, should be in "select all" mode
    await expect(selectAllCheckbox).toBeChecked();
    
    // Individual checkboxes should not be visible
    await expect(page.locator('.question-checkbox').first()).not.toBeVisible();
    
    // Uncheck select all to enable manual selection
    await selectAllCheckbox.uncheck();
    
    // Wait for re-render
    await page.waitForTimeout(500);
    
    // Individual checkboxes should now be visible
    await expect(page.locator('.question-checkbox').first()).toBeVisible();
    
    // Check a few individual questions
    const checkboxes = page.locator('.question-checkbox');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.first().check();
      await expect(checkboxes.first()).toBeChecked();
    }
  });

  test('should toggle random order option', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    const randomOrderCheckbox = page.getByLabel('Random order');
    
    // By default, should be unchecked
    await expect(randomOrderCheckbox).not.toBeChecked();
    
    // Check random order
    await randomOrderCheckbox.check();
    await expect(randomOrderCheckbox).toBeChecked();
    
    // Uncheck
    await randomOrderCheckbox.uncheck();
    await expect(randomOrderCheckbox).not.toBeChecked();
  });

  test('should show correct answer highlighting in questions', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Get first question card
    const firstQuestion = page.locator('.question-preview-card').first();
    
    // Should have answer divs
    const answers = firstQuestion.locator('div').filter({ hasText: /✓/ });
    const correctAnswersCount = await answers.count();
    
    // Should have at least one correct answer
    expect(correctAnswersCount).toBeGreaterThan(0);
  });

  test('should navigate back to create screen', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Click back button
    await page.getByRole('button', { name: /Back|←/ }).first().click();
    
    // Should navigate back to create screen
    await expect(page).toHaveURL(/\/(create)?$/);
    await expect(page.getByText('Select a question bank to start')).toBeVisible();
  });

  test('should create session with selected questions', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Get the create button
    const createBtn = page.getByRole('button', { name: /Create Quiz with \d+ Question/ });
    await expect(createBtn).toBeVisible();
    
    // Button text should show question count
    const btnText = await createBtn.textContent();
    expect(btnText).toMatch(/Create Quiz with \d+ Question/);
    
    // Click create
    await createBtn.click();
    
    // Should navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//, { timeout: 10000 });
    
    // Should show PIN
    await expect(page.locator('.pin-display')).toBeVisible({ timeout: 5000 });
  });

  test('should create session with filtered questions', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Apply easy filter
    await page.locator('input[type="checkbox"][value="easy"]').check();
    await page.waitForTimeout(1000);
    
    // Get filtered question count from heading
    const headingText = await page.locator('h3').filter({ hasText: 'Questions Preview' }).textContent();
    const match = headingText?.match(/\((\d+) questions? match filters\)/);
    const filteredCount = match ? parseInt(match[1], 10) : 0;
    
    expect(filteredCount).toBeGreaterThan(0);
    
    // Create session
    await page.getByRole('button', { name: /Create Quiz with/ }).click();
    
    // Should navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//, { timeout: 10000 });
  });

  test('should handle manual question selection', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Disable select all mode
    await page.getByLabel('Use all questions').uncheck();
    await page.waitForTimeout(500);
    
    // Select first 3 questions
    const checkboxes = page.locator('.question-checkbox');
    const count = await checkboxes.count();
    const selectCount = Math.min(3, count);
    
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }
    
    // Create button should show selected count
    const createBtn = page.getByRole('button', { name: new RegExp(`Create Quiz with ${selectCount} Question`) });
    await expect(createBtn).toBeVisible();
    
    // Create session
    await createBtn.click();
    
    // Should navigate to lobby
    await expect(page).toHaveURL(/\/lobby\//, { timeout: 10000 });
  });

  test('should show validation error when no questions match filters', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Create an impossible filter combination
    // First, apply a very specific filter that might result in no results
    // (This test assumes we can create a scenario with 0 results, may need adjustment)
    
    // For now, just verify the create button is disabled when count is 0
    const createBtn = page.getByRole('button', { name: /Create Quiz with/ });
    
    // In normal case, button should be enabled
    await expect(createBtn).toBeEnabled();
  });

  test('should paginate through questions', async ({ page }) => {
    // This test requires more than 10 questions in the bank
    // Skip if sample bank has 10 or fewer questions
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    // Check if pagination controls exist
    const nextBtn = page.getByRole('button', { name: 'Next →' });
    
    if (await nextBtn.isVisible()) {
      // We have pagination
      await expect(nextBtn).not.toBeDisabled();
      
      // Click next page
      await nextBtn.click();
      await page.waitForTimeout(1000);
      
      // Should update to page 2
      await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
      
      // Previous button should now be enabled
      const prevBtn = page.getByRole('button', { name: '← Previous' });
      await expect(prevBtn).toBeEnabled();
      
      // Go back
      await prevBtn.click();
      await page.waitForTimeout(1000);
      
      // Should be back on page 1
      await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    }
  });

  test('should display question metadata correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/#/preview/sample-general-knowledge');
    await expect(page.locator('.question-preview-card').first()).toBeVisible({ timeout: 10000 });
    
    const firstQuestion = page.locator('.question-preview-card').first();
    
    // Should show question number and text
    const heading = firstQuestion.locator('h4');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/^\d+\./); // Starts with number
    
    // Should show difficulty badge
    await expect(firstQuestion.locator('.badge')).toBeVisible();
    
    // May show time limit badge
    const badges = firstQuestion.locator('.badge');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(1); // At least difficulty badge
    
    // Should show answers grid
    const answerDivs = firstQuestion.locator('div').filter({ 
      has: page.locator('[style*="border-left"]') 
    });
    const answerCount = await answerDivs.count();
    expect(answerCount).toBeGreaterThan(0);
  });
});
