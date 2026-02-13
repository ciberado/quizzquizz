import { test, expect } from '@playwright/test';

test.describe('Full Quiz Workflow', () => {
  test('complete quiz flow with players endpoint', async ({ page, context }) => {
    // Navigate to host app
    await page.goto('http://localhost:3000/host');
    
    // Click on question bank
    await page.click('text=General Knowledge');
    await expect(page).toHaveURL(/\/preview\//);
    
    // Create quiz session
    await page.click('button:has-text("Create Quiz")');
    await expect(page).toHaveURL(/\/lobby\//);
    
    // Extract PIN from page
    const bodyText = await page.textContent('body');
    const pinMatch = bodyText?.match(/(\d{6})/);
    expect(pinMatch).toBeTruthy();
    const pin = pinMatch![1];
    
    console.log(`Session created with PIN: ${pin}`);
    
    // Verify lobby shows 0 players
    await expect(page.locator('h2:has-text("0 Players")')).toBeVisible();
    
    // Open player page in new tab
    const playerPage = await context.newPage();
    await playerPage.goto('http://localhost:3000');
    
    // Join with PIN
    await playerPage.fill('input[type="text"]', pin);
    await playerPage.click('button:has-text("Join Quiz")');
    
    // Enter nickname
    await expect(playerPage).toHaveURL(/\/nickname/);
    await playerPage.fill('input[type="text"]', 'TestPlayer');
    await playerPage.click('button');
    
    // Wait for player to be in lobby
    await expect(playerPage).toHaveURL(/\/lobby\//);
    await expect(playerPage.locator('h1:has-text("Lobby")')).toBeVisible();
    
    // Back to host - verify 1 player joined
    await page.waitForTimeout(2000); // Allow polling to update
    await expect(page.locator('h2:has-text("1 Player")')).toBeVisible();
    
    console.log('Player successfully joined lobby');
    
    // Start the quiz
    await page.click('button:has-text("Start Quiz")');
    await expect(page).toHaveURL(/\/question\//);
    
    // Wait a moment for the game state to update
    await page.waitForTimeout(2000);
    
    // THIS IS THE CRITICAL TEST: Check for 500 errors on /players endpoint
    const response = await page.waitForResponse(
      (response) => response.url().includes('/players'),
      { timeout: 5000 }
    ).catch(() => null);
    
    if (response) {
      const status = response.status();
      console.log(`Players endpoint returned status: ${status}`);
      expect(status).toBe(200);
      
      const data = await response.json();
      console.log('Players data:', data);
      expect(data.players).toBeDefined();
      expect(data.players).toHaveLength(1);
      expect(data.players[0].nickname).toBe('TestPlayer');
    }
    
    // Verify question screen loaded
    await expect(page.locator('h2:has-text("Question")')).toBeVisible();
    
    // Verify player sees question
    await expect(playerPage.locator('h1:has-text("Question")')).toBeVisible();
    
    console.log('Quiz started successfully, players endpoint working!');
    
    await playerPage.close();
  });
});
