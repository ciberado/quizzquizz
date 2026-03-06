import { PrismaClient } from '../generated/prisma/index.js';

// Prisma Client instance - lazily initialized
let prismaInstance: PrismaClient | null = null;

// Track database initialization state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Getter to always access current instance (creates on first access)
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
}

// Force recreate Prisma instance (useful for tests that change DATABASE_URL)
export async function resetPrismaInstance() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  isInitialized = false;
  initializationPromise = null;
}

// Export lazy getters for compatibility
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_, prop) => getPrisma()[prop as keyof PrismaClient],
});

// Legacy export name for compatibility during migration  
export const db = prisma;

// Initialize database connection
export async function initDatabase() {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    console.log('📦 Initializing database...');
    
    // Get or create Prisma instance (will use current DATABASE_URL)
  const client = getPrisma();
  
  // With Prisma, schema is managed via `prisma db push` or migrations
  // For testing with in-memory database, we need to create tables manually
  if (process.env.DATABASE_URL?.includes(':memory:')) {
    // Enable foreign key constraints
    await client.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
    
    // Drop existing tables to ensure clean schema (important with shared cache)
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS player_answers`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS players`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS quiz_sessions`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS user_question_stats`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS question_global_stats`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS hosted_sessions`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS player_stats`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS saved_quizzes`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS sessions`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS accounts`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS verifications`);
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS users`);
    
    // Create auth tables (DateTime maps to BIGINT in SQLite - milliseconds since epoch)
    await client.$executeRawUnsafe(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        expires_at BIGINT,
        password TEXT,
        scope TEXT,
        access_token_expires_at BIGINT,
        refresh_token_expires_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE verifications (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at BIGINT,
        updated_at BIGINT
      )
    `);
    
    // Create quiz tables (renamed to quiz_sessions to avoid collision)
    await client.$executeRawUnsafe(`
      CREATE TABLE quiz_sessions (
        id TEXT PRIMARY KEY,
        pin TEXT NOT NULL UNIQUE,
        host_token TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        question_bank_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby',
        current_question_index INTEGER NOT NULL DEFAULT -1,
        question_started_at BIGINT,
        expires_at BIGINT,
        created_at BIGINT NOT NULL,
        question_ids TEXT,
        random_order INTEGER NOT NULL DEFAULT 0,
        shuffle_answers INTEGER NOT NULL DEFAULT 1,
        automatic_pace INTEGER NOT NULL DEFAULT 0,
        auto_question_time INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        nickname TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        joined_at BIGINT NOT NULL
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE player_answers (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        selected_answer_ids TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        score INTEGER NOT NULL,
        submitted_at BIGINT NOT NULL,
        response_time_ms INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Create user feature tables
    await client.$executeRawUnsafe(`
      CREATE TABLE hosted_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        question_bank_id TEXT NOT NULL,
        question_bank_name TEXT NOT NULL,
        total_players INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        completed_at BIGINT NOT NULL
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE player_stats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        final_score INTEGER NOT NULL,
        final_rank INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        average_time INTEGER NOT NULL,
        played_at BIGINT NOT NULL
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE user_question_stats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        question_bank_id TEXT NOT NULL,
        times_answered INTEGER NOT NULL DEFAULT 0,
        times_correct INTEGER NOT NULL DEFAULT 0,
        average_response_ms INTEGER NOT NULL DEFAULT 0,
        last_answered_at BIGINT,
        last_was_correct INTEGER NOT NULL DEFAULT 0,
        practice_weight REAL NOT NULL DEFAULT 1.0,
        UNIQUE(user_id, question_bank_id, question_id)
      )
    `);

    await client.$executeRawUnsafe(`
      CREATE TABLE question_global_stats (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        question_bank_id TEXT NOT NULL,
        times_appeared INTEGER NOT NULL DEFAULT 0,
        times_answered INTEGER NOT NULL DEFAULT 0,
        times_correct INTEGER NOT NULL DEFAULT 0,
        average_response_ms INTEGER NOT NULL DEFAULT 0,
        average_score INTEGER NOT NULL DEFAULT 0,
        answer_selections TEXT NOT NULL DEFAULT '{}',
        empirical_difficulty REAL,
        updated_at BIGINT NOT NULL DEFAULT (unixepoch() * 1000),
        UNIQUE(question_bank_id, question_id)
      )
    `);

    await client.$executeRawUnsafe(`
      CREATE TABLE saved_quizzes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        question_bank_id TEXT NOT NULL,
        question_ids TEXT,
        random_order INTEGER NOT NULL DEFAULT 0,
        shuffle_answers INTEGER NOT NULL DEFAULT 1,
        automatic_pace INTEGER NOT NULL DEFAULT 0,
        auto_question_time INTEGER NOT NULL DEFAULT 0,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `);
  } else {
    // For file-based databases in production, run migrations automatically on startup
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Running database migrations...');
      const { execSync } = await import('child_process');
      const { mkdirSync } = await import('fs');

      // Ensure the data directory exists before attempting migrations
      const dbUrl = process.env.DATABASE_URL ?? '';
      const dbPathMatch = dbUrl.match(/^file:(.+)$/);
      if (dbPathMatch?.[1]) {
        const { dirname } = await import('path');
        const dataDir = dirname(dbPathMatch[1]);
        try {
          mkdirSync(dataDir, { recursive: true });
          console.log(`📁 Ensured data directory exists: ${dataDir}`);
        } catch (err) {
          console.warn(`⚠️  Could not create data directory ${dataDir}:`, err);
        }
      }

      try {
        // Run migrations in production
        execSync('npx prisma migrate deploy', {
          cwd: '/app/packages/api-server',
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log('✅ Database migrations completed');
      } catch (error) {
        console.error('❌ Failed to run migrations:', error);
        throw error;
      }
    } else {
      // In development, migrations should be run manually via: npx prisma migrate dev
      console.log('📝 Development mode: Run migrations manually if needed (npx prisma migrate dev)');
    }
  }
    console.log('✅ Database initialized (using Prisma)');
    isInitialized = true;
  })();
  
  await initializationPromise;
}

// Cleanup function for graceful shutdown
export async function disconnectDatabase() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
}

