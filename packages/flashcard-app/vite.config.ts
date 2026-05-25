import { defineConfig } from 'vite';

export default defineConfig({
  base: '/flashcard/',
  server: {
    port: 3004,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
