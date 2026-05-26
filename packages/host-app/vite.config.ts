import { defineConfig } from 'vite';

export default defineConfig({
  base: '/host/',
  define: {
    // __FLASHCARD_ORIGIN__ resolves to '' so the lobby screen uses window.location.origin.
    // With the dev proxy on port 3000, all apps share the same origin automatically.
    __FLASHCARD_ORIGIN__: JSON.stringify(''),
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
    hmr: { clientPort: 3001 },
    proxy: {
      '/api': 'http://localhost:3010',
    },
  },
});
