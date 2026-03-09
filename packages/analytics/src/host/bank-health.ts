/**
 * Host analytics: Bank Health Report
 * Surfaces quality signals across all questions in a question bank.
 */
import {
  compositeQualityScore,
  distractorPower,
  isDominantDistractor,
} from '../shared/quality.js';
import type { QuestionGlobalStatRow } from '../types.js';

export interface QuestionHealthEntry {
  questionId: string;
  timesAppeared: number;
  timesAnswered: number;
  accuracy: number;
  empiricalDifficulty: number | null;
  hasInsufficientData: boolean;
  distractorPowers: Record<string, number>;
  dominantDistractors: string[];
  isStale: boolean;
  compositeScore: number;
}

export interface BankHealthReport {
  questionBankId: string;
  totalQuestions: number;
  questionsWithData: number;
  averageAccuracy: number;
  difficultyMismatchCount: number;
  staleCount: number;
  questions: QuestionHealthEntry[];
}

/** Declared difficulty → expected empirical range for flagging mismatches */
const EXPECTED_EMPIRICAL: Record<string, [number, number]> = {
  easy: [0.65, 1.0],
  medium: [0.35, 0.75],
  hard: [0.0, 0.45],
};

export function buildBankHealthReport(
  questionBankId: string,
  stats: QuestionGlobalStatRow[],
  declaredDifficulties: Record<string, string> = {},
  correctAnswerIds: Record<string, string[]> = {},
): BankHealthReport {
  const questionsWithData = stats.filter((s) => s.timesAnswered >= 5);

  let difficultyMismatchCount = 0;

  const questions: QuestionHealthEntry[] = stats.map((stat) => {
    const answerSelections: Record<string, number> = {};
    try {
      const parsed = JSON.parse(stat.answerSelections) as Record<string, number>;
      Object.assign(answerSelections, parsed);
    } catch {
      // malformed JSON — treat as empty
    }

    const correctIds = correctAnswerIds[stat.questionId] ?? [];
    const dp = distractorPower(answerSelections, correctIds, stat.timesAnswered);
    const dominant = Object.keys(answerSelections).filter((id) =>
      isDominantDistractor(id, answerSelections, correctIds),
    );

    const accuracy =
      stat.timesAnswered > 0 ? stat.timesCorrect / stat.timesAnswered : 0;

    // Staleness detection: > 50 appearances, last 20 sessions accuracy > 0.95
    // We approximate by checking global accuracy as proxy for "memorised"
    const isStale = stat.timesAppeared > 50 && accuracy > 0.95;

    // Check difficulty mismatch
    const declared = declaredDifficulties[stat.questionId];
    if (declared && stat.empiricalDifficulty !== null) {
      const [lo, hi] = EXPECTED_EMPIRICAL[declared] ?? [0, 1];
      if (stat.empiricalDifficulty < lo || stat.empiricalDifficulty > hi) {
        difficultyMismatchCount++;
      }
    }

    const qualityData = {
      questionId: stat.questionId,
      timesAppeared: stat.timesAppeared,
      timesAnswered: stat.timesAnswered,
      timesCorrect: stat.timesCorrect,
      averageResponseMs: stat.averageResponseMs,
      answerSelections,
      empiricalDifficulty: stat.empiricalDifficulty,
    };

    return {
      questionId: stat.questionId,
      timesAppeared: stat.timesAppeared,
      timesAnswered: stat.timesAnswered,
      accuracy,
      empiricalDifficulty: stat.empiricalDifficulty,
      hasInsufficientData: stat.timesAnswered < 5,
      distractorPowers: dp,
      dominantDistractors: dominant,
      isStale,
      compositeScore: compositeQualityScore(qualityData),
    };
  });

  // Sort by composite score descending (best questions first)
  const sorted = [...questions].sort((a, b) => b.compositeScore - a.compositeScore);

  const accuracies = questionsWithData.map((s) =>
    s.timesAnswered > 0 ? s.timesCorrect / s.timesAnswered : 0,
  );
  const averageAccuracy =
    accuracies.length > 0
      ? accuracies.reduce((s, v) => s + v, 0) / accuracies.length
      : 0;

  return {
    questionBankId,
    totalQuestions: stats.length,
    questionsWithData: questionsWithData.length,
    averageAccuracy,
    difficultyMismatchCount,
    staleCount: questions.filter((q) => q.isStale).length,
    questions: sorted,
  };
}
