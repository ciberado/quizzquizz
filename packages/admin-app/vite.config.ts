import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin/',
  server: {
    port: 3005,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: { clientPort: 3000, path: '/admin/__hmr' },
    proxy: {
      '/api': 'http://localhost:3010',
    },
  },
});
