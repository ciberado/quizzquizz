import { test, expect } from '@playwright/test';

/**
 * Docker Deployment Routing Tests
 * 
 * These tests verify that the Docker deployment with Caddy reverse proxy
 * correctly routes to the appropriate apps and APIs.
 */

test.describe('Docker Deployment Routing', () => {
  
  test('root route (/) should serve player app', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check title
    await expect(page).toHaveTitle(/QuizzQuizz - Player/);
    
    // Check that it's the player app by looking for player-specific content
    // The player app should have a join session form
    const content = await page.content();
    expect(content).toContain('QuizzQuizz - Player');
    
    // Should NOT be the host app
    expect(content).not.toContain('QuizzQuizz - Host');
  });

  test('/host route should serve host app', async ({ page }) => {
    await page.goto('http://localhost:3000/host');
    
    // Check title
    await expect(page).toHaveTitle(/QuizzQuizz - Host/);
    
    // Check that it's the host app
    const content = await page.content();
    expect(content).toContain('QuizzQuizz - Host');
    
    // Should NOT be the player app
    expect(content).not.toContain('QuizzQuizz - Player');
  });

  test('/host/ (with trailing slash) should serve host app', async ({ page }) => {
    await page.goto('http://localhost:3000/host/');
    
    await expect(page).toHaveTitle(/QuizzQuizz - Host/);
    
    const content = await page.content();
    expect(content).toContain('QuizzQuizz - Host');
  });

  test('/health should return JSON health check', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/health');
    
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('application/json');
    
    const body = await response?.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
  });

  test('/api/question-banks should return JSON', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/api/question-banks');
    
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('application/json');
    
    const body = await response?.json();
    expect(body).toHaveProperty('questionBanks');
    expect(Array.isArray(body.questionBanks)).toBe(true);
  });

  test('/api should NOT serve player app', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/api');
    
    // Should either return 404 or redirect, but NOT serve HTML
    const contentType = response?.headers()['content-type'] || '';
    
    // If it returns content, it should NOT be HTML
    if (response?.status() === 200) {
      expect(contentType).not.toContain('text/html');
    }
  });

  test('player app assets should load correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Wait for app to load
    await page.waitForSelector('#app', { timeout: 5000 });
    
    // Check that assets loaded (no 404s)
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/assets/')) {
        errors.push(`404: ${response.url()}`);
      }
    });
    
    // Wait a bit for all assets to load
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });

  test('host app assets should load correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/host');
    
    // Wait for app to load
    await page.waitForSelector('#app', { timeout: 5000 });
    
    // Check that assets loaded (no 404s)
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && (response.url().includes('/assets/') || response.url().includes('/host/assets/'))) {
        errors.push(`404: ${response.url()}`);
      }
    });
    
    // Wait a bit for all assets to load
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });
});
