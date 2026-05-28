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
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
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
    {
      name: 'timer-controls-tests',
      testMatch: '**/timer-controls.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'quiz-upload-tests',
      testMatch: '**/quiz-upload.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'proxy-tests',
      testMatch: '**/proxy.spec.ts',
    },
    {
      name: 'flashcard-tests',
      testMatch: '**/flashcard.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'flashcard-sets-tests',
      testMatch: '**/flashcard-sets.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile-responsive-tests',
      testMatch: '**/mobile-responsive.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'yjs-resilience-tests',
      testMatch: '**/yjs-resilience.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Start the API server and host/player apps before running tests
  webServer: [
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh 2>/dev/null; (nvm use 22 2>/dev/null || true); PORT=3010 npm run dev --workspace=@quizzquizz/api-server"',
      url: 'http://localhost:3010/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh 2>/dev/null; (nvm use 22 2>/dev/null || true); npm run dev --workspace=@quizzquizz/host-app"',
      url: 'http://localhost:3001/host/',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh 2>/dev/null; (nvm use 22 2>/dev/null || true); npm run dev --workspace=@quizzquizz/player-app"',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh 2>/dev/null; (nvm use 22 2>/dev/null || true); npm run dev --workspace=@quizzquizz/flashcard-app"',
      url: 'http://localhost:3004/flashcard/',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bash -c "source /usr/local/share/nvm/nvm.sh 2>/dev/null; (nvm use 22 2>/dev/null || true); npm run dev --workspace=@quizzquizz/analytics-ui"',
      url: 'http://localhost:3003',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'node scripts/dev-proxy.mjs',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
