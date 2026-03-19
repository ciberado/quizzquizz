-- AlterTable: Add pace field to quiz_sessions
ALTER TABLE "quiz_sessions" ADD COLUMN "pace" TEXT NOT NULL DEFAULT 'normal';
