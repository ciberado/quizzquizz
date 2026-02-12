import { defineConfig } from 'vite';

export default defineConfig({
  base: '/host/',
  server: {
    port: 3001,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
  },
});
