import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'file::memory:?cache=shared',
    },
    // Run tests sequentially to avoid database race conditions with shared in-memory SQLite
    fileParallelism: false,
  },
});
