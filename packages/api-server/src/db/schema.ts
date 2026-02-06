import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  pin: text('pin').notNull().unique(),
  hostToken: text('host_token').notNull(),
  questionBankId: text('question_bank_id').notNull(),
  status: text('status').notNull().default('lobby'), // 'lobby' | 'playing' | 'finished'
  currentQuestionIndex: integer('current_question_index').notNull().default(-1),
  questionStartedAt: integer('question_started_at'), // timestamp in ms
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

// Players table
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  score: integer('score').notNull().default(0),
  joinedAt: integer('joined_at').notNull().default(sql`(unixepoch() * 1000)`),
});

// Player answers table
export const playerAnswers = sqliteTable('player_answers', {
  id: text('id').primaryKey(),
  playerId: text('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull(),
  selectedAnswerIds: text('selected_answer_ids').notNull(), // JSON array
  submittedAt: integer('submitted_at').notNull(),
  score: integer('score').notNull().default(0),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

export type PlayerAnswer = typeof playerAnswers.$inferSelect;
export type InsertPlayerAnswer = typeof playerAnswers.$inferInsert;
