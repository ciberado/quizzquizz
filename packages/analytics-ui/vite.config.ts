import { defineConfig } from 'vite';

export default defineConfig({
  base: '/analytics/',
  server: {
    port: 3003,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
    hmr: { clientPort: 3003 },
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
});
