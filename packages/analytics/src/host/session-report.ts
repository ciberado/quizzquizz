/**
 * Host analytics: Session Report
 * Produces a complete post-game breakdown for a session.
 */
import { percentiles, standardDeviation, histogram, populationMean } from '../shared/stats.js';
import type { PlayerAnswerRow } from '../types.js';

export interface PerQuestionReport {
  questionId: string;
  totalPlayers: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  accuracy: number;
  answerOptionCounts: Record<string, number>;
  responseTimePercentiles: { p25: number; p50: number; p75: number; p95: number };
}

export interface PlayerSpread {
  min: number;
  max: number;
  median: number;
  mean: number;
  stdDev: number;
  histogram: { min: number; max: number; count: number }[];
}

export interface SessionReport {
  sessionId: string;
  totalPlayers: number;
  perQuestion: PerQuestionReport[];
  playerSpread: PlayerSpread;
}

export function buildSessionReport(
  sessionId: string,
  answers: PlayerAnswerRow[],
  players: { id: string; score: number }[],
): SessionReport {
  const totalPlayers = players.length;

  // Group answers by questionId
  const byQuestion = new Map<string, PlayerAnswerRow[]>();
  for (const a of answers) {
    const arr = byQuestion.get(a.questionId) ?? [];
    arr.push(a);
    byQuestion.set(a.questionId, arr);
  }

  const perQuestion: PerQuestionReport[] = Array.from(byQuestion.entries()).map(
    ([qId, qAnswers]) => {
      const correctCount = qAnswers.filter((a) => a.isCorrect).length;
      const answeredCount = qAnswers.length;
      const unansweredCount = Math.max(0, totalPlayers - answeredCount);

      // Aggregate answer option selections
      const answerOptionCounts: Record<string, number> = {};
      for (const a of qAnswers) {
        let ids: string[] = [];
        try {
          ids = JSON.parse(a.selectedAnswerIds) as string[];
        } catch {
          ids = [];
        }
        for (const id of ids) {
          answerOptionCounts[id] = (answerOptionCounts[id] ?? 0) + 1;
        }
      }

      const responseTimes = qAnswers.map((a) => a.responseTimeMs);
      const [p25, p50, p75, p95] = percentiles(responseTimes, [0.25, 0.5, 0.75, 0.95]);

      return {
        questionId: qId,
        totalPlayers,
        answeredCount,
        unansweredCount,
        correctCount,
        accuracy: answeredCount > 0 ? correctCount / answeredCount : 0,
        answerOptionCounts,
        responseTimePercentiles: {
          p25: p25 ?? 0,
          p50: p50 ?? 0,
          p75: p75 ?? 0,
          p95: p95 ?? 0,
        },
      };
    },
  );

  // Player score spread
  const scores = players.map((p) => p.score);
  const [median] = percentiles(scores, [0.5]);

  const playerSpread: PlayerSpread = {
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
    median: median ?? 0,
    mean: populationMean(scores),
    stdDev: standardDeviation(scores),
    histogram: histogram(scores, 10),
  };

  return { sessionId, totalPlayers, perQuestion, playerSpread };
}
