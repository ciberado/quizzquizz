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
  },

  projects: [
    {
      name: 'api-tests',
      testMatch: '**/*.spec.ts',
    },
  ],

  // Start the API server before running tests
  webServer: {
    command: 'bash -c "source /usr/local/share/nvm/nvm.sh && nvm use 22 && npm run dev --workspace=@quizzquizz/api-server"',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
