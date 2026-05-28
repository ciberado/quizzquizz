import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file::memory:?cache=shared',
    },
    // Run tests sequentially to avoid database race conditions with shared in-memory SQLite
    fileParallelism: false,
  },
  // lib0 and y-protocols ship native ESM with binary ArrayBuffer initialization that
  // fails under vite-node's transform pipeline. Exclude them so Node loads them natively.
  ssr: {
    noExternal: [],
    external: ['lib0', 'y-protocols', 'yjs', 'ws'],
  },
});
