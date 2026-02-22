import { test, expect, Page } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests user authentication flows for both host and player apps
 */

test.describe('Authentication - Host App', () => {
  let testEmail: string;
  let testUsername: string;

  test.beforeEach(() => {
    // Generate unique test credentials for each test
    const timestamp = Date.now();
    testEmail = `host-test-${timestamp}@example.com`;
    testUsername = `hostuser${timestamp}`;
  });

  test('should display auth header with login button when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3001/host/');
    
    // Wait for auth header to load
    await page.waitForSelector('auth-header');
    
    // Should see login button
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText('Login / Sign Up');
    
    console.log('✓ Auth header displays login button for unauthenticated user');
  });

  test('should navigate to login screen when clicking login button', async ({ page }) => {
    await page.goto('http://localhost:3001/host/');
    
    // Click login button
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await loginButton.click();
    
    // Should navigate to login screen
    await page.waitForSelector('login-screen');
    await expect(page.locator('login-screen h1')).toHaveText('Welcome Back');
    
    console.log('✓ Navigates to login screen');
  });

  test('should allow user to sign up with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3001/host/#/login');
    
    // Wait for login screen
    await page.waitForSelector('login-screen');
    
    // Toggle to signup mode
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    // Should show signup form
    await expect(page.locator('login-screen h1')).toHaveText('Create Account');
    
    // Fill in signup form
    await page.locator('input[name="name"]').fill('Test Host User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    
    // Submit form
    await page.locator('login-screen button[type="submit"]').click();
    
    // Should redirect to home and show user info
    await page.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
    
    // Auth header should show user info
    const userInfo = page.locator('auth-header span:has-text("Test Host User")');
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Successfully signed up and authenticated');
  });

  test('should allow user to sign in with existing credentials', async ({ page }) => {
    // First, sign up
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    await page.locator('input[name="name"]').fill('Test Host User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    await page.locator('login-screen button[type="submit"]').click();
    
    await page.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
    
    // Log out
    const logoutButton = page.locator('auth-header button.auth-logout-btn');
    await logoutButton.click();
    
    // Wait for redirect
    await page.waitForTimeout(1000);
    
    // Go back to login
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    // Should be in login mode by default
    await expect(page.locator('login-screen h1')).toHaveText('Welcome Back');
    
    // Fill in login form
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    
    // Submit form
    await page.locator('login-screen button[type="submit"]').click();
    
    // Should redirect to home and show user info
    await page.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
    
    const userInfo = page.locator('auth-header span:has-text("Test Host User")');
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Successfully signed in with existing credentials');
  });

  test('should allow user to log out', async ({ page }) => {
    // Sign up first
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    await page.locator('input[name="name"]').fill('Test Host User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    await page.locator('login-screen button[type="submit"]').click();
    
    await page.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
    
    // Verify logged in
    const userInfo = page.locator('auth-header span:has-text("Test Host User")');
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    // Log out
    const logoutButton = page.locator('auth-header button.auth-logout-btn');
    await logoutButton.click();
    
    // Should show login button again
    await page.waitForTimeout(1000);
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await expect(loginButton).toBeVisible();
    
    console.log('✓ Successfully logged out');
  });

  test('should allow skipping authentication', async ({ page }) => {
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    // Click skip button
    const skipButton = page.locator('login-screen button.skip-btn');
    await skipButton.click();
    
    // Should navigate to home without authentication
    await page.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
    
    // Should still show login button (not authenticated)
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await expect(loginButton).toBeVisible();
    
    console.log('✓ Successfully skipped authentication');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    // Try to login with non-existent account
    await page.locator('input[name="email"]').fill('nonexistent@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.locator('login-screen button[type="submit"]').click();
    
    // Should show error message
    const errorDiv = page.locator('login-screen div[style*="background: #ff4444"]');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Shows error for invalid credentials');
  });

  test('should validate password length', async ({ page }) => {
    await page.goto('http://localhost:3001/host/#/login');
    await page.waitForSelector('login-screen');
    
    // Toggle to signup
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    // Try short password
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('short');
    
    // Form should prevent submission due to minlength attribute
    const submitButton = page.locator('login-screen button[type="submit"]');
    await submitButton.click();
    
    // Should still be on login page (form validation prevented submission)
    await expect(page.locator('login-screen')).toBeVisible();
    
    console.log('✓ Validates password length');
  });
});

test.describe('Authentication - Player App', () => {
  let testEmail: string;
  let testUsername: string;

  test.beforeEach(() => {
    // Generate unique test credentials for each test
    const timestamp = Date.now();
    testEmail = `player-test-${timestamp}@example.com`;
    testUsername = `playeruser${timestamp}`;
  });

  test('should display auth header with login button when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Wait for auth header to load
    await page.waitForSelector('auth-header');
    
    // Should see login button
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText('Login / Sign Up');
    
    console.log('✓ Player app auth header displays login button');
  });

  test('should navigate to login screen when clicking login button', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Click login button
    const loginButton = page.locator('auth-header button.auth-login-btn');
    await loginButton.click();
    
    // Should navigate to login screen
    await page.waitForSelector('login-screen');
    await expect(page.locator('login-screen h1')).toHaveText('Welcome Back');
    
    console.log('✓ Player app navigates to login screen');
  });

  test('should allow player to sign up', async ({ page }) => {
    await page.goto('http://localhost:3002/#/login');
    
    // Wait for login screen
    await page.waitForSelector('login-screen');
    
    // Toggle to signup mode
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    // Fill in signup form
    await page.locator('input[name="name"]').fill('Test Player User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    
    // Submit form
    await page.locator('login-screen button[type="submit"]').click();
    
    // Should redirect to home and show user info
    await page.waitForURL('http://localhost:3002/#/', { timeout: 5000 });
    
    // Auth header should show user info
    const userInfo = page.locator('auth-header span:has-text("Test Player User")');
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Player successfully signed up');
  });

  test('should allow player to sign in and log out', async ({ page }) => {
    // Sign up first
    await page.goto('http://localhost:3002/#/login');
    await page.waitForSelector('login-screen');
    
    const toggleButton = page.locator('login-screen button.toggle-mode-btn');
    await toggleButton.click();
    
    await page.locator('input[name="name"]').fill('Test Player User');
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    await page.locator('login-screen button[type="submit"]').click();
    
    await page.waitForURL('http://localhost:3002/#/', { timeout: 5000 });
    
    // Log out
    const logoutButton = page.locator('auth-header button.auth-logout-btn');
    await logoutButton.click();
    
    await page.waitForTimeout(1000);
    
    // Log back in
    await page.goto('http://localhost:3002/#/login');
    await page.waitForSelector('login-screen');
    
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('testpass123');
    await page.locator('login-screen button[type="submit"]').click();
    
    await page.waitForURL('http://localhost:3002/#/', { timeout: 5000 });
    
    const userInfo = page.locator('auth-header span:has-text("Test Player User")');
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Player successfully signed in and out');
  });

  test('should allow player to skip authentication and join quiz anonymously', async ({ page, request }) => {
    // Create a session first
    const sessionResponse = await request.post('http://localhost:3000/api/sessions', {
      data: {
        questionBankId: 'sample-general-knowledge',
      },
    });
    const session = await sessionResponse.json();
    
    await page.goto('http://localhost:3002/#/login');
    await page.waitForSelector('login-screen');
    
    // Skip authentication
    const skipButton = page.locator('login-screen button.skip-btn');
    await skipButton.click();
    
    await page.waitForURL('http://localhost:3002/#/', { timeout: 5000 });
    
    // Wait for join screen to be ready
    await page.waitForSelector('join-screen', { timeout: 5000 });
    
    // Should be able to join quiz anonymously
    await page.locator('#pin-input').fill(session.pin);
    await page.locator('button:has-text("Join Quiz")').click();
    
    // Should proceed to nickname screen
    await page.waitForSelector('nickname-screen', { timeout: 5000 });
    
    console.log('✓ Player can skip auth and join quiz anonymously');
  });
});

test.describe('Authentication - Cross-App Compatibility', () => {
  let testEmail: string;
  let testUsername: string;

  test.beforeEach(() => {
    const timestamp = Date.now();
    testEmail = `crossapp-test-${timestamp}@example.com`;
    testUsername = `crossuser${timestamp}`;
  });

  test('should share authentication between host and player apps', async ({ browser }) => {
    // Create two contexts to simulate host and player
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();
    
    try {
      // Sign up on host app
      await hostPage.goto('http://localhost:3001/host/#/login');
      await hostPage.waitForSelector('login-screen');
      
      const toggleButton = hostPage.locator('login-screen button.toggle-mode-btn');
      await toggleButton.click();
      
      await hostPage.locator('input[name="name"]').fill('Cross App User');
      await hostPage.locator('input[name="username"]').fill(testUsername);
      await hostPage.locator('input[name="email"]').fill(testEmail);
      await hostPage.locator('input[name="password"]').fill('testpass123');
      await hostPage.locator('login-screen button[type="submit"]').click();
      
      await hostPage.waitForURL('http://localhost:3001/host/#/', { timeout: 5000 });
      
      // Verify authenticated on host
      const hostUserInfo = hostPage.locator('auth-header span:has-text("Cross App User")');
      await expect(hostUserInfo).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Signed up on host app');
      
      // Now try to sign in on player app with same credentials
      await playerPage.goto('http://localhost:3002/#/login');
      await playerPage.waitForSelector('login-screen');
      
      await playerPage.locator('input[name="email"]').fill(testEmail);
      await playerPage.locator('input[name="password"]').fill('testpass123');
      await playerPage.locator('login-screen button[type="submit"]').click();
      
      await playerPage.waitForURL('http://localhost:3002/#/', { timeout: 5000 });
      
      // Verify authenticated on player
      const playerUserInfo = playerPage.locator('auth-header span:has-text("Cross App User")');
      await expect(playerUserInfo).toBeVisible({ timeout: 5000 });
      
      console.log('✓ Same account works on both apps');
    } finally {
      await hostPage.close();
      await playerPage.close();
      await hostContext.close();
      await playerContext.close();
    }
  });
});
