import { defineConfig } from 'vite';

export default defineConfig({
  base: '/flashcard/',
  server: {
    port: 3004,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: { clientPort: 3000, path: '/flashcard/__hmr' },
    proxy: {
      '/api': 'http://localhost:3010',
    },
  },
});
