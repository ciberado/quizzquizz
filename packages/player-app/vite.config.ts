import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3002,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: { clientPort: 3000, path: '/__hmr' },
  },
});
