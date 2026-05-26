import { defineConfig } from 'vite';

export default defineConfig({
  base: '/analytics/',
  server: {
    port: 3003,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: { clientPort: 3000, path: '/analytics/__hmr' },
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
});
