-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "host_token" TEXT NOT NULL,
    "question_bank_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "current_question_index" INTEGER NOT NULL DEFAULT -1,
    "question_started_at" BIGINT,
    "created_at" BIGINT NOT NULL DEFAULT 0,
    "expires_at" BIGINT
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joined_at" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_answer_ids" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "submitted_at" BIGINT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "player_answers_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_pin_key" ON "sessions"("pin");
