import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Docker deployment testing
 * This config DOES NOT start dev servers - it assumes Docker Compose is already running
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'docker-routing',
      testMatch: '**/docker-routing.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'full-workflow',
      testMatch: '**/full-workflow.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // No webServer - Docker Compose should be running separately
});
