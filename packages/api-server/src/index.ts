import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { initDatabase } from './db/index.js';
import { loadQuestionBankTree } from '@quizzquizz/question-bank';
import { questionBanks, setBankTree } from './state.js';
import sessionRoutes from './routes/sessions.js';
import playerRoutes from './routes/players.js';
import gameRoutes from './routes/game.js';
import questionBankRoutes from './routes/question-banks.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import userBankRoutes from './routes/user-banks.js';
import flashcardProgressRoutes from './routes/flashcard-progress.js';
import { startCleanupJob } from './session-cleanup.js';
import { createWsServer } from './ws-handler.js';
import { updateDoc, getActiveSessionIds } from './session-doc-manager.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { readFileSync } from 'fs';
const { version: APP_VERSION } = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

const app = new Hono();

// Middleware
app.use('*', logger());

// CORS configuration - allow development origins and optional custom origin
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://quizzquizz.snow-burbot.ts.net',
];

// Add custom origin from environment (e.g., Tailscale domain)
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
  console.log(`✓ Added custom CORS origin: ${process.env.CORS_ORIGIN}`);
}

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: APP_VERSION,
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    nodeVersion: process.version,
    timestamp: Date.now(),
  });
});

// API routes
// AUTH ROUTES: Mount first to handle /api/auth/* before anything else
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);

// GAME ROUTES: Mount before sessionRoutes to ensure specific routes match first
// IMPORTANT: Mount gameRoutes first to ensure specific routes like
// /:sessionId/players/:playerId/review match before catch-all /:id in sessionRoutes
app.route('/api/sessions', gameRoutes); // Game routes use /api/sessions/:id/state, /answer, and /players/:id/review patterns
app.route('/api/sessions', flashcardProgressRoutes); // Flashcard progress: /:id/flashcard-answer, /:id/flashcard-progress
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', playerRoutes); // Player routes use /api/sessions/join pattern
app.route('/api/question-banks', questionBankRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/user-banks', userBankRoutes);

// In production, static files are served by Caddy reverse proxy
// This simplifies the Node.js server - no need for static file serving
if (process.env.NODE_ENV === 'production') {
  console.log('📦 Production mode: Static files served by Caddy');
} else {
  console.log('🔧 Development mode: Frontend apps run on separate ports (3001, 3002)');
}

// Initialize on startup
async function initialize() {
  console.log([
    '',
    '  ╔═══════════════════════════════════════════════╗',
    '  ║   ___  _   _ ___ _________ ___  _   _ ___ ___ ║',
    '  ║  / _ \| | | |_ )__|_  /_  )_  )| | | |_ )_  )║',
    '  ║ | (_) | |_| |/ /  / /  / / / / | |_| |/ / / / ║',
    '  ║  \__\_\\___/|_/  /_/  /_/ |_|   \___/|_/ |_|  ║',
    `  ║            🎯  Real-time quiz  v${APP_VERSION.padEnd(11)}║`,
    '  ╚═══════════════════════════════════════════════╝',
    '',
  ].join('\n'));
  console.log('🎯 Initializing QuizzQuizz API Server...');
  
  // Initialize database (await to ensure tables exist before cleanup job starts)
  await initDatabase();
  
  // Load question banks
  const questionBanksPath = process.env.QUESTION_BANKS_PATH || 
    join(__dirname, '../../../question-banks');
  
  console.log(`📚 Loading question banks from: ${questionBanksPath}`);
  const { tree, banks } = loadQuestionBankTree(questionBanksPath);
  setBankTree(tree);
  
  for (const [id, bank] of banks) {
    questionBanks.set(id, bank);
    console.log(`   ✓ Loaded: ${bank.metadata.name} [${id}] (${bank.questions.length} questions)`);
  }
  
  console.log(`✅ Loaded ${banks.size} question bank(s)`);
  
  // Start session cleanup job (runs every 60 minutes by default)
  const cleanupIntervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10);
  startCleanupJob(cleanupIntervalMinutes);
}

// Initialize before starting (async initialization)
// Skip binding to a port during tests — test files use app.request() directly.
if (process.env.NODE_ENV !== 'test') {
  initialize().then(() => {
    const port = parseInt(process.env.PORT || '3000', 10);
    const hostname = process.env.HOST || '0.0.0.0';

    console.log(`🚀 QuizzQuizz API Server starting on http://${hostname}:${port}...`);

    const httpServer = serve({
      fetch: app.fetch,
      port,
      hostname,
    });

    // -- Yjs WebSocket server --
    const wss = createWsServer();

    httpServer.on('upgrade', (req, socket, head) => {
      const url = req.url ?? '';
      if (url.startsWith('/ws/')) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    // -- Heartbeat: update serverTime in every active session doc every 5 s --
    setInterval(() => {
      const now = Date.now();
      for (const sessionId of getActiveSessionIds()) {
        updateDoc(sessionId, { serverTime: now });
      }
    }, 5000);
  }).catch(error => {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  });
} else {
  // In test mode: still initialize DB and question banks, but don't bind a port.
  initialize().catch(error => {
    console.error('❌ Failed to initialize in test mode:', error);
  });
}

// Export app for testing
export default app;
