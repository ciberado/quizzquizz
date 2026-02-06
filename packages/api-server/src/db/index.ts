import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DB_PATH || './quizzquizz.db';

// Create database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Type for the sqlite connection
export type SqliteConnection = Database.Database;

// Initialize database schema
export function initDatabase() {
  console.log('📦 Initializing database...');
  
  // Create sessions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      pin TEXT NOT NULL UNIQUE,
      host_token TEXT NOT NULL,
      question_bank_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      current_question_index INTEGER NOT NULL DEFAULT -1,
      question_started_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Create players table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);

  // Create player_answers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS player_answers (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      selected_answer_ids TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      score INTEGER NOT NULL DEFAULT 0
    )
  `);

  console.log('✅ Database initialized');
}

// Don't export sqlite directly to avoid type issues
// Export a function to get the raw connection if needed
export function getSqlite(): SqliteConnection {
  return sqlite;
}
