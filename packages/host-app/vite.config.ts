import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: '/host/',
  define: {
    // In dev the flashcard app runs on its own Vite port (3004).
    // In production builds Caddy serves everything through one origin.
    __FLASHCARD_ORIGIN__: JSON.stringify(command === 'serve' ? 'http://localhost:3004' : ''),
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    allowedHosts: ['quizzquizz', 'quizzquizz.mininube.com'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}));
