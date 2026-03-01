-- Fix: question stat uniqueness must be scoped to (questionBankId, questionId)
-- otherwise two banks that share a question ID (e.g. "Q001") would collide.
--
-- UserQuestionStat: was UNIQUE(user_id, question_id)
--                   now UNIQUE(user_id, question_bank_id, question_id)
--
-- QuestionGlobalStat: was UNIQUE(question_id)
--                     now UNIQUE(question_bank_id, question_id)

-- Drop old narrow unique indexes
DROP INDEX IF EXISTS "user_question_stats_user_id_question_id_key";
DROP INDEX IF EXISTS "question_global_stats_question_id_key";
DROP INDEX IF EXISTS "question_global_stats_question_bank_id_idx";

-- Create correct composite unique indexes
CREATE UNIQUE INDEX "user_question_stats_user_id_question_bank_id_question_id_key"
    ON "user_question_stats"("user_id", "question_bank_id", "question_id");

CREATE UNIQUE INDEX "question_global_stats_question_bank_id_question_id_key"
    ON "question_global_stats"("question_bank_id", "question_id");
