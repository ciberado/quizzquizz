import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import { initDatabase } from './db/index.js';
import { loadQuestionBanks } from '@quizzquizz/question-bank';
import { questionBanks } from './state.js';
import sessionRoutes from './routes/sessions.js';
import playerRoutes from './routes/players.js';
import gameRoutes from './routes/game.js';
import questionBankRoutes from './routes/question-banks.js';
import { startCleanupJob } from './session-cleanup.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://quizzquizz.snow-burbot.ts.net',
  ],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
// IMPORTANT: Mount gameRoutes first to ensure specific routes like
// /:sessionId/players/:playerId/review match before catch-all /:id in sessionRoutes
app.route('/api/sessions', gameRoutes); // Game routes use /api/sessions/:id/state, /answer, and /players/:id/review patterns
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', playerRoutes); // Player routes use /api/sessions/join pattern
app.route('/api/question-banks', questionBankRoutes);

// Static file serving for production deployment
// In production, frontend apps are built and served from the API server
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const hostAppPath = join(__dirname, '../../host-app/dist');
  const playerAppPath = join(__dirname, '../../player-app/dist');
  
  console.log('📦 Setting up static file serving...');
  
  // Check if frontend dist directories exist
  const hostAppExists = existsSync(hostAppPath);
  const playerAppExists = existsSync(playerAppPath);
  
  if (hostAppExists) {
    console.log(`   ✓ Host app: ${hostAppPath}`);
    
    // Serve host app static assets
    app.use('/host/assets/*', serveStatic({ root: hostAppPath }));
    
    // Serve host app index.html for all /host routes
    app.get('/host*', serveStatic({ 
      path: './index.html',
      root: hostAppPath 
    }));
  } else {
    console.warn(`   ⚠ Host app dist not found: ${hostAppPath}`);
  }
  
  if (playerAppExists) {
    console.log(`   ✓ Player app: ${playerAppPath}`);
    
    // Serve player app static assets
    app.use('/assets/*', serveStatic({ root: playerAppPath }));
    
    // Serve player app index.html for root and all non-API routes
    app.get('/', serveStatic({ 
      path: './index.html',
      root: playerAppPath 
    }));
    
    // Fallback to player app for client-side routing
    app.get('*', serveStatic({ 
      path: './index.html',
      root: playerAppPath 
    }));
  } else {
    console.warn(`   ⚠ Player app dist not found: ${playerAppPath}`);
  }
} else {
  console.log('🔧 Running in development mode - frontend apps served separately');
}

// Initialize on startup
function initialize() {
  console.log('🎯 Initializing QuizzQuizz API Server...');
  
  // Initialize database
  initDatabase();
  
  // Load question banks
  const questionBanksPath = process.env.QUESTION_BANKS_PATH || 
    join(__dirname, '../../../question-banks');
  
  console.log(`📚 Loading question banks from: ${questionBanksPath}`);
  const banks = loadQuestionBanks(questionBanksPath);
  
  for (const bank of banks) {
    questionBanks.set(bank.id, bank);
    console.log(`   ✓ Loaded: ${bank.metadata.name} (${bank.questions.length} questions)`);
  }
  
  console.log(`✅ Loaded ${banks.length} question bank(s)`);
  
  // Start session cleanup job (runs every 60 minutes by default)
  const cleanupIntervalMinutes = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10);
  startCleanupJob(cleanupIntervalMinutes);
}

// Initialize before starting
initialize();

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOST || '0.0.0.0';

console.log(`🚀 QuizzQuizz API Server starting on http://${hostname}:${port}...`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
