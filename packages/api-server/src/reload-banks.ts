import { questionBanks, setBankTree } from './state.js';
import { loadQuestionBankTree } from '@quizzquizz/question-bank';

export interface ReloadResult {
  count: number;
  banks: Array<{ id: string; name: string; questionCount: number }>;
}

/**
 * Re-scan the question-banks directory and replace the in-memory bank map.
 * Called by both the admin /reload endpoint and the upload route.
 *
 * NOTE: Does NOT serialise concurrent calls — callers that need mutual
 * exclusion should wrap this in the upload mutex (upload-mutex.ts).
 */
export function reloadQuestionBanks(questionBanksPath: string): ReloadResult {
  questionBanks.clear();
  const { tree, banks } = loadQuestionBankTree(questionBanksPath);
  setBankTree(tree);

  for (const [id, bank] of banks) {
    questionBanks.set(id, bank);
    console.log(
      `   ✓ Reloaded: ${bank.metadata.name} [${id}] (${bank.questions.length} questions)`,
    );
  }

  console.log(`✅ Reloaded ${banks.size} question bank(s)`);

  return {
    count: banks.size,
    banks: Array.from(banks.values()).map((b) => ({
      id: b.id,
      name: b.metadata.name,
      questionCount: b.questions.length,
    })),
  };
}
