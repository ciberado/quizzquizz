import { defineConfig } from 'vite';

export default defineConfig({
  base: '/analytics/',
  server: {
    port: 3003,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
