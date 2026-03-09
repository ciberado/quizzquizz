/**
 * Player analytics: Response-Time Profile
 * Speed vs. accuracy scatter and difficulty curve.
 */
import type { UserQuestionStatRow } from '../types.js';

export type SpeedAccuracyQuadrant =
  | 'mastered' // fast + correct
  | 'hesitant' // slow + correct
  | 'guessing' // fast + wrong
  | 'confused'; // slow + wrong

export interface SpeedAccuracyPoint {
  questionId: string;
  questionBankId: string;
  averageResponseMs: number;
  accuracy: number;
  timesAnswered: number;
  quadrant: SpeedAccuracyQuadrant;
}

export interface DifficultyResponseTime {
  difficulty: string;
  averageResponseMs: number;
  questionCount: number;
}

export interface ResponseProfileReport {
  userId: string;
  scatterPoints: SpeedAccuracyPoint[];
  difficultyByResponseTime: DifficultyResponseTime[];
  medianResponseMs: number;
  medianAccuracy: number;
}

export function buildResponseProfile(
  userId: string,
  stats: UserQuestionStatRow[],
  questionDifficulties: Record<string, string> = {},
): ResponseProfileReport {
  if (stats.length === 0) {
    return {
      userId,
      scatterPoints: [],
      difficultyByResponseTime: [],
      medianResponseMs: 0,
      medianAccuracy: 0,
    };
  }

  const withData = stats.filter((s) => s.timesAnswered >= 2);

  // Compute medians for quadrant splits
  const sortedMs = [...withData.map((s) => s.averageResponseMs)].sort(
    (a, b) => a - b,
  );
  const sortedAcc = [...withData.map((s) =>
    s.timesAnswered > 0 ? s.timesCorrect / s.timesAnswered : 0,
  )].sort((a, b) => a - b);

  const medianMs =
    sortedMs.length > 0 ? sortedMs[Math.floor(sortedMs.length / 2)]! : 0;
  const medianAcc =
    sortedAcc.length > 0 ? sortedAcc[Math.floor(sortedAcc.length / 2)]! : 0;

  const scatterPoints: SpeedAccuracyPoint[] = withData.map((s) => {
    const accuracy = s.timesAnswered > 0 ? s.timesCorrect / s.timesAnswered : 0;
    const fast = s.averageResponseMs <= medianMs;
    const correct = accuracy >= medianAcc;

    let quadrant: SpeedAccuracyQuadrant;
    if (fast && correct) quadrant = 'mastered';
    else if (!fast && correct) quadrant = 'hesitant';
    else if (fast && !correct) quadrant = 'guessing';
    else quadrant = 'confused';

    return {
      questionId: s.questionId,
      questionBankId: s.questionBankId,
      averageResponseMs: s.averageResponseMs,
      accuracy,
      timesAnswered: s.timesAnswered,
      quadrant,
    };
  });

  // Group by declared difficulty
  const byDifficulty = new Map<string, { totalMs: number; count: number }>();
  for (const s of withData) {
    const diff = questionDifficulties[s.questionId] ?? 'unknown';
    const entry = byDifficulty.get(diff) ?? { totalMs: 0, count: 0 };
    entry.totalMs += s.averageResponseMs;
    entry.count++;
    byDifficulty.set(diff, entry);
  }

  const difficultyByResponseTime: DifficultyResponseTime[] = Array.from(
    byDifficulty.entries(),
  )
    .map(([difficulty, { totalMs, count }]) => ({
      difficulty,
      averageResponseMs: count > 0 ? totalMs / count : 0,
      questionCount: count,
    }))
    .sort((a, b) => a.averageResponseMs - b.averageResponseMs);

  return {
    userId,
    scatterPoints,
    difficultyByResponseTime,
    medianResponseMs: medianMs,
    medianAccuracy: medianAcc,
  };
}
