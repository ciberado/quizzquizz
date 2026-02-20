import { PrismaClient } from '@prisma/client';

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
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS sessions`);
    
    // Create tables for in-memory SQLite with correct BIGINT types
    await client.$executeRawUnsafe(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        pin TEXT NOT NULL UNIQUE,
        host_token TEXT NOT NULL,
        question_bank_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby',
        current_question_index INTEGER NOT NULL DEFAULT -1,
        question_started_at BIGINT,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT 0,
        question_ids TEXT,
        random_order INTEGER NOT NULL DEFAULT 0,
        shuffle_answers INTEGER NOT NULL DEFAULT 1,
        automatic_pace INTEGER NOT NULL DEFAULT 0,
        auto_question_time INTEGER NOT NULL DEFAULT 0,
        time_limit INTEGER NOT NULL DEFAULT 25
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        joined_at BIGINT NOT NULL DEFAULT 0
      )
    `);
    
    await client.$executeRawUnsafe(`
      CREATE TABLE player_answers (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        selected_answer_ids TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        score INTEGER NOT NULL,
        submitted_at BIGINT NOT NULL DEFAULT 0
      )
    `);
  } else {
    // For file-based databases, run migrations automatically on startup
    console.log('🔄 Running database migrations...');
    const { execSync } = await import('child_process');
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

