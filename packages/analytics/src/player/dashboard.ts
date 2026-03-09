/**
 * Player analytics: Personal Dashboard
 * Aggregate lifetime stats + streaks for the authenticated player.
 */
import { streaks } from '../shared/streaks.js';
import { percentiles } from '../shared/stats.js';
import type { PlayerStatRow } from '../types.js';

export interface DashboardSession {
  sessionId: string;
  finalScore: number;
  finalRank: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  averageTime: number;
  playedAt: Date;
}

export interface PlayerDashboard {
  userId: string;
  lifetime: {
    totalPlayed: number;
    totalAnswered: number;
    totalCorrect: number;
    overallAccuracy: number;
    averageRank: number;
    medianScore: number;
  };
  streaks: {
    engagementCurrent: number;
    engagementLongest: number;
    masteryCurrent: number; // consecutive sessions with accuracy > 80%
    masteryLongest: number;
  };
  recentSessions: DashboardSession[];
}

const MASTERY_ACCURACY_THRESHOLD = 0.8;

export function buildPlayerDashboard(
  userId: string,
  stats: PlayerStatRow[],
): PlayerDashboard {
  const totalPlayed = stats.length;
  const totalAnswered = stats.reduce((s, r) => s + r.totalQuestions, 0);
  const totalCorrect = stats.reduce((s, r) => s + r.correctAnswers, 0);
  const overallAccuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;

  const ranks = stats.map((r) => r.finalRank);
  const averageRank =
    ranks.length > 0 ? ranks.reduce((s, v) => s + v, 0) / ranks.length : 0;

  const scores = stats.map((r) => r.finalScore);
  const [medianScore] = percentiles(scores, [0.5]);

  // Engagement streak: consecutive sessions played (all sessions count as "played")
  const engagementBooleans = stats.map(() => true);
  const engagementStreak = streaks(engagementBooleans);

  // Mastery streak: consecutive sessions with accuracy > 80%
  const masteryBooleans = stats.map(
    (r) =>
      r.totalQuestions > 0 &&
      r.correctAnswers / r.totalQuestions >= MASTERY_ACCURACY_THRESHOLD,
  );
  const masteryStreak = streaks(masteryBooleans);

  const recentSessions: DashboardSession[] = stats
    .slice(-10)
    .reverse()
    .map((r) => ({
      sessionId: r.sessionId,
      finalScore: r.finalScore,
      finalRank: r.finalRank,
      correctAnswers: r.correctAnswers,
      totalQuestions: r.totalQuestions,
      accuracy:
        r.totalQuestions > 0 ? r.correctAnswers / r.totalQuestions : 0,
      averageTime: r.averageTime,
      playedAt: r.playedAt,
    }));

  return {
    userId,
    lifetime: {
      totalPlayed,
      totalAnswered,
      totalCorrect,
      overallAccuracy,
      averageRank,
      medianScore: medianScore ?? 0,
    },
    streaks: {
      engagementCurrent: engagementStreak.current,
      engagementLongest: engagementStreak.longest,
      masteryCurrent: masteryStreak.current,
      masteryLongest: masteryStreak.longest,
    },
    recentSessions,
  };
}
