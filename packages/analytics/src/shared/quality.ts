/**
 * Quality computation helpers for question health analysis.
 */

/** Subset of QuestionGlobalStat fields needed for quality scoring. */
export interface QuestionGlobalStatData {
  questionId: string;
  timesAppeared: number;
  timesAnswered: number;
  timesCorrect: number;
  averageResponseMs: number;
  answerSelections: Record<string, number>;
  empiricalDifficulty: number | null;
}

/**
 * Composite quality score for a question.
 * Higher is better. Range: 0–1.
 *
 * Weighted combination of:
 * - Accuracy balance (0.4 weight): questions around 0.4–0.7 accuracy score highest
 * - Distractor spread (0.4 weight): uniform distribution of wrong-answer selections
 * - Response time reasonableness (0.2 weight): 5s–60s response time scores highest
 */
export function compositeQualityScore(question: QuestionGlobalStatData): number {
  if (question.timesAnswered < 5) return 0.5; // insufficient data

  const accuracy =
    question.timesAnswered > 0 ? question.timesCorrect / question.timesAnswered : 0;

  // Balance score: peaks at 0.55, penalises extremes
  const balanceScore = 1 - Math.abs(accuracy - 0.55) * 2;

  // Distractor spread: compute entropy of wrong-answer selections
  const spread = distractorSpreadScore(question.answerSelections, question.timesAnswered);

  // Response-time score: 5s–60s is ideal
  const rtMs = question.averageResponseMs;
  const rtScore =
    rtMs < 1000
      ? 0
      : rtMs < 5000
        ? rtMs / 5000
        : rtMs <= 60000
          ? 1
          : Math.max(0, 1 - (rtMs - 60000) / 60000);

  return Math.min(1, Math.max(0, balanceScore * 0.4 + spread * 0.4 + rtScore * 0.2));
}

/**
 * Distractor power per answer option.
 * Returns fraction of total answers that selected each answer.
 */
export function distractorPower(
  answerSelections: Record<string, number>,
  correctIds: string[],
  totalAnswers: number,
): Record<string, number> {
  if (totalAnswers === 0) return {};
  const result: Record<string, number> = {};
  for (const [id, count] of Object.entries(answerSelections)) {
    if (!correctIds.includes(id)) {
      result[id] = count / totalAnswers;
    }
  }
  return result;
}

/**
 * Whether an answer option is a "dominant distractor" —
 * a wrong answer chosen more often than any correct one.
 */
export function isDominantDistractor(
  answerId: string,
  answerSelections: Record<string, number>,
  correctIds: string[],
): boolean {
  if (correctIds.includes(answerId)) return false;
  const wrongSelections = answerSelections[answerId] ?? 0;
  const maxCorrectSelections = Math.max(
    0,
    ...correctIds.map((id) => answerSelections[id] ?? 0),
  );
  return wrongSelections > maxCorrectSelections;
}

// Internal helper: entropy-based spread score for distractor options
function distractorSpreadScore(
  answerSelections: Record<string, number>,
  totalAnswers: number,
): number {
  const entries = Object.entries(answerSelections);
  if (entries.length === 0 || totalAnswers === 0) return 0;
  // Only look at wrong answers (we don't know which is correct here, so use all)
  const fractions = entries.map(([, count]) => count / totalAnswers);
  const n = fractions.length;
  if (n === 1) return 1;
  // Normalised entropy: -sum(p * log(p)) / log(n)
  const entropy = fractions.reduce((acc, p) => acc + (p > 0 ? -p * Math.log(p) : 0), 0);
  return entropy / Math.log(n);
}
