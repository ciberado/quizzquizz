/**
 * Session utilities for loading and managing session questions
 */

import type { Question } from '@quizzquizz/common';
import { shuffleArray } from '@quizzquizz/common';
import { questionBanks } from './state.js';

/**
 * Get questions for a session based on its configuration
 * - Uses questionIds if specified (in order)
 * - Shuffles questions if randomOrder is true (after filtering) - deterministic based on session ID
 * - Shuffles answers within questions if shuffleAnswers is true - deterministic based on session ID + question ID
 * - Falls back to all questions from bank if no questionIds
 * 
 * IMPORTANT: Uses seeded shuffling to ensure consistent order across multiple calls
 */
export function getSessionQuestions(session: { 
  id: string; // Session ID used as seed for deterministic shuffling
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
      questions = ids
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined && (q.status === 'active' || q.status === undefined));
    } catch (error) {
      console.error('Error parsing questionIds:', error);
      questions = questionBank.questions.filter(q => q.status === 'active' || q.status === undefined);
    }
  } else {
    // Use all active questions from the bank
    questions = questionBank.questions.filter(q => q.status === 'active' || q.status === undefined);
  }

  // Shuffle questions if randomOrder is true - use session ID as seed for deterministic shuffle
  if (session.randomOrder) {
    questions = shuffleArray(questions, session.id);
  }

  // Shuffle answers within each question if shuffleAnswers is true (default)
  // Use session ID + question ID as seed for deterministic, per-question shuffle
  const shouldShuffleAnswers = session.shuffleAnswers ?? true;
  if (shouldShuffleAnswers) {
    questions = questions.map(question => ({
      ...question,
      answers: shuffleArray(question.answers, `${session.id}-${question.id}`),
    }));
  }

  return questions;
}
