-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quiz_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "host_token" TEXT NOT NULL,
    "user_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'quiz',
    "question_bank_id" TEXT NOT NULL,
    "question_ids" TEXT,
    "random_order" BOOLEAN NOT NULL DEFAULT false,
    "shuffle_answers" BOOLEAN NOT NULL DEFAULT true,
    "automatic_pace" BOOLEAN NOT NULL DEFAULT false,
    "auto_question_time" BOOLEAN NOT NULL DEFAULT false,
    "pace" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "current_question_index" INTEGER NOT NULL DEFAULT -1,
    "question_started_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    CONSTRAINT "quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quiz_sessions" ("auto_question_time", "automatic_pace", "created_at", "current_question_index", "expires_at", "host_token", "id", "pace", "pin", "question_bank_id", "question_ids", "question_started_at", "random_order", "shuffle_answers", "status", "user_id") SELECT "auto_question_time", "automatic_pace", "created_at", "current_question_index", "expires_at", "host_token", "id", "pace", "pin", "question_bank_id", "question_ids", "question_started_at", "random_order", "shuffle_answers", "status", "user_id" FROM "quiz_sessions";
DROP TABLE "quiz_sessions";
ALTER TABLE "new_quiz_sessions" RENAME TO "quiz_sessions";
CREATE UNIQUE INDEX "quiz_sessions_pin_key" ON "quiz_sessions"("pin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
