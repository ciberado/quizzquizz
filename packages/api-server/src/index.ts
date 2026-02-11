import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { initDatabase } from './db';
import { loadQuestionBanks } from '@quizzquizz/question-bank';
import { questionBanks } from './state';
import sessionRoutes from './routes/sessions';
import playerRoutes from './routes/players';
import gameRoutes from './routes/game';
import questionBankRoutes from './routes/question-banks';
import { startCleanupJob } from './session-cleanup';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

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
