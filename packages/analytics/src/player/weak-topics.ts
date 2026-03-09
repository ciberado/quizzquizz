/**
 * Player analytics: Weak Topic Analysis
 * Per-topic accuracy breakdown and prioritised study list.
 */
import type { UserQuestionStatRow } from '../types.js';

export interface TopicBreakdown {
  topic: string;
  timesAnswered: number;
  timesCorrect: number;
  accuracy: number;
  questionCount: number; // number of unique questions in this topic
}

export interface WeakTopicsReport {
  userId: string;
  bankId: string | null;
  topics: TopicBreakdown[]; // sorted weakest first
  totalQuestionsAnalysed: number;
}

/**
 * Build weak topics report.
 * @param questionTopics  Map from questionId → list of topic strings
 */
export function buildWeakTopics(
  userId: string,
  stats: UserQuestionStatRow[],
  questionTopics: Record<string, string[]> = {},
  bankId: string | null = null,
): WeakTopicsReport {
  // Aggregate per topic
  const topicMap = new Map<
    string,
    { answered: number; correct: number; questionIds: Set<string> }
  >();

  for (const stat of stats) {
    const topics = questionTopics[stat.questionId] ?? ['Unknown'];
    for (const topic of topics) {
      const entry = topicMap.get(topic) ?? {
        answered: 0,
        correct: 0,
        questionIds: new Set(),
      };
      entry.answered += stat.timesAnswered;
      entry.correct += stat.timesCorrect;
      entry.questionIds.add(stat.questionId);
      topicMap.set(topic, entry);
    }
  }

  const topics: TopicBreakdown[] = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      timesAnswered: data.answered,
      timesCorrect: data.correct,
      accuracy: data.answered > 0 ? data.correct / data.answered : 0,
      questionCount: data.questionIds.size,
    }))
    // Sort weakest first, then by volume descending (more data = more confident)
    .sort((a, b) => {
      if (Math.abs(a.accuracy - b.accuracy) > 0.01) return a.accuracy - b.accuracy;
      return b.timesAnswered - a.timesAnswered;
    });

  return {
    userId,
    bankId,
    topics,
    totalQuestionsAnalysed: stats.length,
  };
}
