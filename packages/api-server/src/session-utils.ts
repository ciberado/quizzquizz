/**
 * Session utilities for loading and managing session questions
 */

import type { Question } from '@quizzquizz/common';
import { shuffleArray } from '@quizzquizz/common';
import { questionBanks } from './state.js';

/**
 * Get questions for a session based on its configuration
 * - Uses questionIds if specified (in order)
 * - Shuffles questions if randomOrder is true (after filtering)
 * - Shuffles answers within questions if shuffleAnswers is true
 * - Falls back to all questions from bank if no questionIds
 */
export function getSessionQuestions(session: { 
  questionBankId: string; 
  questionIds: string | null; 
  randomOrder: boolean;
  shuffleAnswers?: boolean;
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

  // Shuffle questions if randomOrder is true
  if (session.randomOrder) {
    questions = shuffleArray(questions);
  }

  // Shuffle answers within each question if shuffleAnswers is true (default)
  const shouldShuffleAnswers = session.shuffleAnswers ?? true;
  if (shouldShuffleAnswers) {
    questions = questions.map(question => ({
      ...question,
      answers: shuffleArray(question.answers),
    }));
  }

  return questions;
}
