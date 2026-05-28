-- AlterTable
ALTER TABLE "quiz_sessions" ADD COLUMN "time_limit_override" INTEGER;
ALTER TABLE "quiz_sessions" ADD COLUMN "timer_paused_at" DATETIME;
