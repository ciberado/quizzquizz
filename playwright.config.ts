import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api-tests',
      testMatch: '**/api.spec.ts',
    },
    {
      name: 'auth-tests',
      testMatch: '**/auth.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'ui-tests',
      testMatch: '**/player-ui.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'host-tests',
      testMatch: '**/host-analytics.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // Larger viewport for host/projector
      },
    },
    {
      name: 'question-preview-tests',
      testMatch: '**/question-preview.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'bank-browser-tests',
      testMatch: '**/bank-browser.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Start the API server and host/player apps before running tests
  webServer: [
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh && nvm use 22 && npm run dev --workspace=@quizzquizz/api-server"',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh && nvm use 22 && npm run dev --workspace=@quizzquizz/host-app"',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh && nvm use 22 && npm run dev --workspace=@quizzquizz/player-app"',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
