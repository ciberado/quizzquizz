/**
 * Player analytics: Global Comparison
 * Per-question delta vs global accuracy, and percentile rank.
 */
import type { UserQuestionStatRow, QuestionGlobalStatRow } from '../types.js';

export interface QuestionDelta {
  questionId: string;
  playerAccuracy: number;
  globalAccuracy: number;
  delta: number; // positive = outperforming global
}

export interface GlobalComparisonReport {
  userId: string;
  bankId: string;
  playerOverallAccuracy: number;
  globalOverallAccuracy: number;
  percentileRank: number; // 0–100, estimated from accuracy comparison
  questions: QuestionDelta[];
  outperformingCount: number;
  underperformingCount: number;
}

export function buildGlobalComparison(
  userId: string,
  bankId: string,
  userStats: UserQuestionStatRow[],
  globalStats: QuestionGlobalStatRow[],
): GlobalComparisonReport {
  // Index global stats by questionId
  const globalByQuestion = new Map<string, QuestionGlobalStatRow>();
  for (const g of globalStats) {
    globalByQuestion.set(g.questionId, g);
  }

  const questions: QuestionDelta[] = [];
  for (const u of userStats) {
    const global = globalByQuestion.get(u.questionId);
    if (!global || global.timesAnswered < 5) continue;

    const playerAcc = u.timesAnswered > 0 ? u.timesCorrect / u.timesAnswered : 0;
    const globalAcc =
      global.timesAnswered > 0 ? global.timesCorrect / global.timesAnswered : 0;

    questions.push({
      questionId: u.questionId,
      playerAccuracy: playerAcc,
      globalAccuracy: globalAcc,
      delta: playerAcc - globalAcc,
    });
  }

  questions.sort((a, b) => b.delta - a.delta);

  const totalPlayerAnswered = userStats.reduce((s, u) => s + u.timesAnswered, 0);
  const totalPlayerCorrect = userStats.reduce((s, u) => s + u.timesCorrect, 0);
  const playerOverallAccuracy =
    totalPlayerAnswered > 0 ? totalPlayerCorrect / totalPlayerAnswered : 0;

  const qualifiedGlobal = globalStats.filter((g) => g.timesAnswered >= 5);
  const totalGlobalAnswered = qualifiedGlobal.reduce((s, g) => s + g.timesAnswered, 0);
  const totalGlobalCorrect = qualifiedGlobal.reduce((s, g) => s + g.timesCorrect, 0);
  const globalOverallAccuracy =
    totalGlobalAnswered > 0 ? totalGlobalCorrect / totalGlobalAnswered : 0;

  // Estimate percentile rank: player accuracy vs global accuracy
  // Simple estimate: if player is above global average, they're > 50th percentile
  // Use a sigmoid-like mapping: percentile = (playerAcc / globalAcc) * 50 capped at 99
  let percentileRank = 50;
  if (globalOverallAccuracy > 0) {
    const ratio = playerOverallAccuracy / globalOverallAccuracy;
    percentileRank = Math.min(99, Math.max(1, Math.round(ratio * 50)));
  }

  return {
    userId,
    bankId,
    playerOverallAccuracy,
    globalOverallAccuracy,
    percentileRank,
    questions,
    outperformingCount: questions.filter((q) => q.delta > 0.05).length,
    underperformingCount: questions.filter((q) => q.delta < -0.05).length,
  };
}
