-- AlterTable
ALTER TABLE "players" ADD COLUMN "user_id" TEXT;

-- CreateTable
CREATE TABLE "user_question_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_bank_id" TEXT NOT NULL,
    "times_answered" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "average_response_ms" INTEGER NOT NULL DEFAULT 0,
    "last_answered_at" DATETIME,
    "last_was_correct" BOOLEAN NOT NULL DEFAULT false,
    "practice_weight" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "user_question_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "question_global_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question_id" TEXT NOT NULL,
    "question_bank_id" TEXT NOT NULL,
    "times_appeared" INTEGER NOT NULL DEFAULT 0,
    "times_answered" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "average_response_ms" INTEGER NOT NULL DEFAULT 0,
    "average_score" INTEGER NOT NULL DEFAULT 0,
    "answer_selections" TEXT NOT NULL DEFAULT '{}',
    "empirical_difficulty" REAL,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_player_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_answer_ids" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "submitted_at" DATETIME NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "response_time_ms" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "player_answers_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_player_answers" ("id", "is_correct", "player_id", "question_id", "score", "selected_answer_ids", "submitted_at") SELECT "id", "is_correct", "player_id", "question_id", "score", "selected_answer_ids", "submitted_at" FROM "player_answers";
DROP TABLE "player_answers";
ALTER TABLE "new_player_answers" RENAME TO "player_answers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "user_question_stats_user_id_question_bank_id_idx" ON "user_question_stats"("user_id", "question_bank_id");

-- CreateIndex
CREATE INDEX "user_question_stats_user_id_last_answered_at_idx" ON "user_question_stats"("user_id", "last_answered_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_question_stats_user_id_question_id_key" ON "user_question_stats"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_global_stats_question_id_key" ON "question_global_stats"("question_id");

-- CreateIndex
CREATE INDEX "question_global_stats_question_bank_id_idx" ON "question_global_stats"("question_bank_id");

-- CreateIndex
CREATE INDEX "players_user_id_idx" ON "players"("user_id");
