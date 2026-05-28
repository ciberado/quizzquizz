-- CreateTable
CREATE TABLE "flashcard_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 1,
    "yes_count" INTEGER NOT NULL DEFAULT 0,
    "no_count" INTEGER NOT NULL DEFAULT 0,
    "graduated" BOOLEAN NOT NULL DEFAULT false,
    "first_try_success" BOOLEAN,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "flashcard_progress_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "flashcard_progress_session_id_player_id_idx" ON "flashcard_progress"("session_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_progress_session_id_player_id_card_id_key" ON "flashcard_progress"("session_id", "player_id", "card_id");
