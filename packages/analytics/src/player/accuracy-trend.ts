/**
 * Player analytics: Accuracy Trend
 * Per-session accuracy time series with rolling average and slope.
 */
import { rollingAverage, slope } from '../shared/stats.js';
import type { PlayerStatRow } from '../types.js';

export interface AccuracyDataPoint {
  sessionId: string;
  playedAt: Date;
  accuracy: number;
  rollingAverage: number;
}

export interface AccuracyMilestone {
  threshold: number; // e.g. 0.5, 0.75, 0.9
  sessionId: string;
  playedAt: Date;
}

export interface AccuracyTrendReport {
  userId: string;
  dataPoints: AccuracyDataPoint[];
  slope: number;
  trend: 'improving' | 'stable' | 'declining';
  milestones: AccuracyMilestone[];
}

const ROLLING_WINDOW = 5;
const SLOPE_THRESHOLD = 0.002; // ~0.2% accuracy change per session
const MILESTONES = [0.5, 0.75, 0.9];

export function buildAccuracyTrend(
  userId: string,
  stats: PlayerStatRow[],
): AccuracyTrendReport {
  if (stats.length === 0) {
    return { userId, dataPoints: [], slope: 0, trend: 'stable', milestones: [] };
  }

  const accuracies = stats.map((r) =>
    r.totalQuestions > 0 ? r.correctAnswers / r.totalQuestions : 0,
  );
  const rolling = rollingAverage(accuracies, ROLLING_WINDOW);
  const trendSlope = slope(accuracies);

  const trend: AccuracyTrendReport['trend'] =
    trendSlope > SLOPE_THRESHOLD
      ? 'improving'
      : trendSlope < -SLOPE_THRESHOLD
        ? 'declining'
        : 'stable';

  const dataPoints: AccuracyDataPoint[] = stats.map((r, i) => ({
    sessionId: r.sessionId,
    playedAt: r.playedAt,
    accuracy: accuracies[i] ?? 0,
    rollingAverage: rolling[i] ?? 0,
  }));

  // Detect milestone first-crossings
  const milestones: AccuracyMilestone[] = [];
  const reached = new Set<number>();
  for (let i = 0; i < stats.length; i++) {
    const acc = accuracies[i] ?? 0;
    for (const threshold of MILESTONES) {
      if (!reached.has(threshold) && acc >= threshold) {
        reached.add(threshold);
        milestones.push({
          threshold,
          sessionId: stats[i]!.sessionId,
          playedAt: stats[i]!.playedAt,
        });
      }
    }
  }

  return { userId, dataPoints, slope: trendSlope, trend, milestones };
}
