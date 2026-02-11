/**
 * Session utilities for loading and managing session questions
 */

import type { Question } from '@quizzquizz/common';
import { questionBanks } from './state';

/**
 * Get questions for a session based on its configuration
 * - Uses questionIds if specified (in order)
 * - Shuffles if randomOrder is true (after filtering)
 * - Falls back to all questions from bank if no questionIds
 */
export function getSessionQuestions(session: { 
  questionBankId: string; 
  questionIds: string | null; 
  randomOrder: boolean;
}): Question[] {
  const questionBank = questionBanks.get(session.questionBankId);
  if (!questionBank) {
    return [];
  }

  let questions: Question[];

  // If questionIds are specified, use only those questions
  if (session.questionIds) {
    try {
      const ids: string[] = JSON.parse(session.questionIds);
      const questionMap = new Map(questionBank.questions.map(q => [q.id, q]));
      questions = ids.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
    } catch (error) {
      console.error('Error parsing questionIds:', error);
      questions = questionBank.questions;
    }
  } else {
    // Use all questions from the bank
    questions = [...questionBank.questions];
  }

  // Shuffle if randomOrder is true
  if (session.randomOrder) {
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = questions[i];
      questions[i] = questions[j]!;
      questions[j] = temp!;
    }
  }

  return questions;
}
