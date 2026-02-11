-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "host_token" TEXT NOT NULL,
    "question_bank_id" TEXT NOT NULL,
    "question_ids" TEXT,
    "random_order" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "current_question_index" INTEGER NOT NULL DEFAULT -1,
    "question_started_at" BIGINT,
    "created_at" BIGINT NOT NULL DEFAULT 0,
    "expires_at" BIGINT
);
INSERT INTO "new_sessions" ("created_at", "current_question_index", "expires_at", "host_token", "id", "pin", "question_bank_id", "question_started_at", "status") SELECT "created_at", "current_question_index", "expires_at", "host_token", "id", "pin", "question_bank_id", "question_started_at", "status" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE UNIQUE INDEX "sessions_pin_key" ON "sessions"("pin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
