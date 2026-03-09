/**
 * Host analytics: Engagement Over Time
 * Time-series views built from HostedSession records.
 */
import { startOfWeek, startOfMonth, format } from 'date-fns';
import type { HostedSessionRow } from '../types.js';

export type EngagementRange = 'day' | 'week' | 'month';

export interface EngagementPeriod {
  period: string; // ISO date string for the period start
  sessionCount: number;
  averagePlayers: number;
  averageAccuracy: number; // average (correctAnswers / totalQuestions) across sessions
}

export interface EngagementReport {
  questionBankId: string;
  range: EngagementRange;
  periods: EngagementPeriod[];
  totalSessions: number;
  overallAveragePlayers: number;
  overallAverageAccuracy: number;
}

// Placeholder — we don't have per-session accuracy in HostedSession directly,
// so we approximate averageAccuracy from the HostedSession record.
// A more complete implementation could join with PlayerStat records.
export function buildEngagementReport(
  questionBankId: string,
  sessions: HostedSessionRow[],
  range: EngagementRange,
  sessionAccuracies: Record<string, number> = {},
): EngagementReport {
  if (sessions.length === 0) {
    return {
      questionBankId,
      range,
      periods: [],
      totalSessions: 0,
      overallAveragePlayers: 0,
      overallAverageAccuracy: 0,
    };
  }

  // Group sessions by period
  const grouped = new Map<string, HostedSessionRow[]>();
  for (const s of sessions) {
    const key = getPeriodKey(s.completedAt, range);
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }

  const periods: EngagementPeriod[] = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, group]) => {
      const sessionCount = group.length;
      const totalPlayers = group.reduce((s, g) => s + g.totalPlayers, 0);
      const avgPlayers = sessionCount > 0 ? totalPlayers / sessionCount : 0;

      const accuracies = group
        .map((g) => sessionAccuracies[g.sessionId])
        .filter((a): a is number => a !== undefined);
      const avgAccuracy =
        accuracies.length > 0
          ? accuracies.reduce((s, v) => s + v, 0) / accuracies.length
          : 0;

      return {
        period,
        sessionCount,
        averagePlayers: avgPlayers,
        averageAccuracy: avgAccuracy,
      };
    });

  const totalSessions = sessions.length;
  const overallAveragePlayers =
    totalSessions > 0
      ? sessions.reduce((s, g) => s + g.totalPlayers, 0) / totalSessions
      : 0;

  const allAccuracies = Object.values(sessionAccuracies);
  const overallAverageAccuracy =
    allAccuracies.length > 0
      ? allAccuracies.reduce((s, v) => s + v, 0) / allAccuracies.length
      : 0;

  return {
    questionBankId,
    range,
    periods,
    totalSessions,
    overallAveragePlayers,
    overallAverageAccuracy,
  };
}

function getPeriodKey(date: Date, range: EngagementRange): string {
  switch (range) {
    case 'day':
      return format(date, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM');
  }
}
