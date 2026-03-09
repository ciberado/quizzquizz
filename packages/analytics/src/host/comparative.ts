/**
 * Host analytics: Comparative Analysis
 * Compare two sessions on per-question accuracy.
 */
import type { PlayerAnswerRow } from '../types.js';

export interface QuestionComparison {
  questionId: string;
  accuracyA: number;
  accuracyB: number;
  delta: number; // accuracyB - accuracyA (positive = improved)
  improved: boolean;
  regressed: boolean;
}

export interface ComparativeReport {
  sessionIdA: string;
  sessionIdB: string;
  totalPlayersA: number;
  totalPlayersB: number;
  questions: QuestionComparison[];
  improvedCount: number;
  regressedCount: number;
  unchangedCount: number;
}

const SIGNIFICANCE_THRESHOLD = 0.05; // 5% delta to consider meaningful change

export function buildComparativeReport(
  sessionIdA: string,
  answersA: PlayerAnswerRow[],
  playersA: number,
  sessionIdB: string,
  answersB: PlayerAnswerRow[],
  playersB: number,
): ComparativeReport {
  // Collect all question IDs from both sessions
  const allQuestionIds = new Set<string>([
    ...answersA.map((a) => a.questionId),
    ...answersB.map((a) => a.questionId),
  ]);

  const accuracyA = computeAccuracyByQuestion(answersA, playersA);
  const accuracyB = computeAccuracyByQuestion(answersB, playersB);

  const questions: QuestionComparison[] = Array.from(allQuestionIds).map((qId) => {
    const aAcc = accuracyA.get(qId) ?? 0;
    const bAcc = accuracyB.get(qId) ?? 0;
    const delta = bAcc - aAcc;
    return {
      questionId: qId,
      accuracyA: aAcc,
      accuracyB: bAcc,
      delta,
      improved: delta > SIGNIFICANCE_THRESHOLD,
      regressed: delta < -SIGNIFICANCE_THRESHOLD,
    };
  });

  questions.sort((a, b) => b.delta - a.delta);

  return {
    sessionIdA,
    sessionIdB,
    totalPlayersA: playersA,
    totalPlayersB: playersB,
    questions,
    improvedCount: questions.filter((q) => q.improved).length,
    regressedCount: questions.filter((q) => q.regressed).length,
    unchangedCount: questions.filter((q) => !q.improved && !q.regressed).length,
  };
}

function computeAccuracyByQuestion(
  answers: PlayerAnswerRow[],
  totalPlayers: number,
): Map<string, number> {
  const byQuestion = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = byQuestion.get(a.questionId) ?? { correct: 0, total: 0 };
    entry.total++;
    if (a.isCorrect) entry.correct++;
    byQuestion.set(a.questionId, entry);
  }

  const result = new Map<string, number>();
  for (const [qId, { correct, total }] of byQuestion.entries()) {
    result.set(qId, totalPlayers > 0 ? correct / Math.max(total, totalPlayers) : 0);
  }
  return result;
}
