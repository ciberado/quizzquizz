/**
 * Player analytics: Practice Recommendations
 * Powered by practiceWeight (spaced-repetition signal).
 */
import type { UserQuestionStatRow } from '../types.js';

export interface PracticeItem {
  questionId: string;
  questionBankId: string;
  practiceWeight: number;
  timesAnswered: number;
  accuracy: number;
  lastAnsweredAt: Date | null;
  isMastered: boolean;
}

export interface PracticeReport {
  userId: string;
  bankId: string | null;
  priorityQueue: PracticeItem[]; // high-weight questions first
  masteredCount: number;
  totalTracked: number;
  recommendedSessionSize: number;
}

const MASTERY_WEIGHT_THRESHOLD = 0.3;
const MASTERY_MIN_ANSWERS = 5;

export function buildPracticeReport(
  userId: string,
  stats: UserQuestionStatRow[],
  bankId: string | null = null,
  limit = 20,
): PracticeReport {
  const items: PracticeItem[] = stats.map((s) => ({
    questionId: s.questionId,
    questionBankId: s.questionBankId,
    practiceWeight: s.practiceWeight,
    timesAnswered: s.timesAnswered,
    accuracy: s.timesAnswered > 0 ? s.timesCorrect / s.timesAnswered : 0,
    lastAnsweredAt: s.lastAnsweredAt,
    isMastered:
      s.practiceWeight < MASTERY_WEIGHT_THRESHOLD &&
      s.timesAnswered >= MASTERY_MIN_ANSWERS,
  }));

  const masteredCount = items.filter((i) => i.isMastered).length;

  // Priority queue: non-mastered, sorted by practiceWeight desc
  const unmastered = items
    .filter((i) => !i.isMastered)
    .sort((a, b) => b.practiceWeight - a.practiceWeight);

  const priorityQueue = unmastered.slice(0, limit);

  // Recommended session size: high-weight questions + 20% mastered "refreshers"
  const highWeightCount = unmastered.length;
  const refresherCount = Math.round(Math.min(masteredCount, highWeightCount * 0.2));
  const recommendedSessionSize = Math.min(
    Math.max(5, highWeightCount + refresherCount),
    30,
  );

  return {
    userId,
    bankId,
    priorityQueue,
    masteredCount,
    totalTracked: items.length,
    recommendedSessionSize,
  };
}
