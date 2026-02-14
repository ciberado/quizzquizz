import { describe, it, expect, beforeEach } from 'vitest';
import { getSessionQuestions } from './session-utils.js';
import { questionBanks } from './state.js';
import type { QuestionBank } from '@quizzquizz/common';

describe('getSessionQuestions', () => {
  // Setup a test question bank with known answer order
  beforeEach(() => {
    questionBanks.clear();
    
    const testBank: QuestionBank = {
      id: 'test-bank',
      metadata: {
        name: 'Test Bank',
        topics: ['test'],
        defaultTimeLimit: 20,
      },
      questions: [
        {
          id: 'Q1',
          text: 'First question',
          answers: [
            { id: 'Q1_A1', text: 'Answer 1' },
            { id: 'Q1_A2', text: 'Answer 2' },
            { id: 'Q1_A3', text: 'Answer 3' },
            { id: 'Q1_A4', text: 'Answer 4' },
          ],
          correctAnswerIds: ['Q1_A2'],
          difficulty: 'easy',
          topics: ['test'],
          tags: [],
        },
        {
          id: 'Q2',
          text: 'Second question',
          answers: [
            { id: 'Q2_A1', text: 'Answer A' },
            { id: 'Q2_A2', text: 'Answer B' },
            { id: 'Q2_A3', text: 'Answer C' },
          ],
          correctAnswerIds: ['Q2_A1', 'Q2_A3'],
          difficulty: 'medium',
          topics: ['test'],
          tags: [],
        },
      ],
    };
    
    questionBanks.set('test-bank', testBank);
  });

  describe('Answer shuffling', () => {
    it('should shuffle answers when shuffleAnswers is true', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: true,
      };

      // Run multiple times to ensure shuffling happens
      let foundDifferentOrder = false;
      const originalOrder = ['Q1_A1', 'Q1_A2', 'Q1_A3', 'Q1_A4'];
      
      for (let i = 0; i < 10; i++) {
        const questions = getSessionQuestions(session);
        const answerIds = questions[0]?.answers.map(a => a.id);
        
        if (JSON.stringify(answerIds) !== JSON.stringify(originalOrder)) {
          foundDifferentOrder = true;
          break;
        }
      }
      
      expect(foundDifferentOrder).toBe(true);
    });

    it('should not shuffle answers when shuffleAnswers is false', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: false,
      };

      const originalOrder = ['Q1_A1', 'Q1_A2', 'Q1_A3', 'Q1_A4'];
      
      // Run multiple times to ensure no shuffling
      for (let i = 0; i < 5; i++) {
        const questions = getSessionQuestions(session);
        const answerIds = questions[0]?.answers.map(a => a.id);
        
        expect(answerIds).toEqual(originalOrder);
      }
    });

    it('should default to shuffling answers when shuffleAnswers is undefined', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        // shuffleAnswers: undefined (not specified)
      };

      // Run multiple times to ensure default shuffling happens
      let foundDifferentOrder = false;
      const originalOrder = ['Q1_A1', 'Q1_A2', 'Q1_A3', 'Q1_A4'];
      
      for (let i = 0; i < 10; i++) {
        const questions = getSessionQuestions(session);
        const answerIds = questions[0]?.answers.map(a => a.id);
        
        if (JSON.stringify(answerIds) !== JSON.stringify(originalOrder)) {
          foundDifferentOrder = true;
          break;
        }
      }
      
      expect(foundDifferentOrder).toBe(true);
    });

    it('should preserve all answer IDs when shuffling', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: true,
      };

      const questions = getSessionQuestions(session);
      const answerIds = questions[0]?.answers.map(a => a.id).sort();
      const expectedIds = ['Q1_A1', 'Q1_A2', 'Q1_A3', 'Q1_A4'].sort();
      
      expect(answerIds).toEqual(expectedIds);
    });

    it('should preserve answer text when shuffling', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: true,
      };

      const questions = getSessionQuestions(session);
      const answerTexts = questions[0]?.answers.map(a => a.text).sort();
      const expectedTexts = ['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4'].sort();
      
      expect(answerTexts).toEqual(expectedTexts);
    });

    it('should shuffle answers independently for each question', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: true,
      };

      const questions = getSessionQuestions(session);
      
      // Verify both questions still have their answers
      expect(questions[0]?.answers).toHaveLength(4);
      expect(questions[1]?.answers).toHaveLength(3);
      
      // Verify questions maintain their correct answer IDs
      expect(questions[0]?.correctAnswerIds).toEqual(['Q1_A2']);
      expect(questions[1]?.correctAnswerIds).toEqual(['Q2_A1', 'Q2_A3']);
    });
  });

  describe('Question shuffling', () => {
    it('should shuffle questions when randomOrder is true', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: true,
        shuffleAnswers: false,
      };

      let foundDifferentOrder = false;
      
      for (let i = 0; i < 10; i++) {
        const questions = getSessionQuestions(session);
        if (questions[0]?.id !== 'Q1') {
          foundDifferentOrder = true;
          break;
        }
      }
      
      expect(foundDifferentOrder).toBe(true);
    });

    it('should not shuffle questions when randomOrder is false', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: false,
        shuffleAnswers: false,
      };

      for (let i = 0; i < 5; i++) {
        const questions = getSessionQuestions(session);
        expect(questions.map(q => q.id)).toEqual(['Q1', 'Q2']);
      }
    });
  });

  describe('Combined shuffling', () => {
    it('should handle both question and answer shuffling', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: null,
        randomOrder: true,
        shuffleAnswers: true,
      };

      const questions = getSessionQuestions(session);
      
      // Verify we got 2 questions
      expect(questions).toHaveLength(2);
      
      // Verify all question IDs are present (order may vary)
      const questionIds = questions.map(q => q.id).sort();
      expect(questionIds).toEqual(['Q1', 'Q2']);
      
      // Verify all answers are present for each question
      const q1 = questions.find(q => q.id === 'Q1');
      const q2 = questions.find(q => q.id === 'Q2');
      
      expect(q1?.answers).toHaveLength(4);
      expect(q2?.answers).toHaveLength(3);
    });
  });

  describe('Question selection', () => {
    it('should respect questionIds parameter', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: JSON.stringify(['Q2']),
        randomOrder: false,
        shuffleAnswers: false,
      };

      const questions = getSessionQuestions(session);
      
      expect(questions).toHaveLength(1);
      expect(questions[0]?.id).toBe('Q2');
    });

    it('should shuffle answers even with specific questionIds', () => {
      const session = {
        questionBankId: 'test-bank',
        questionIds: JSON.stringify(['Q1']),
        randomOrder: false,
        shuffleAnswers: true,
      };

      let foundDifferentOrder = false;
      const originalOrder = ['Q1_A1', 'Q1_A2', 'Q1_A3', 'Q1_A4'];
      
      for (let i = 0; i < 10; i++) {
        const questions = getSessionQuestions(session);
        const answerIds = questions[0]?.answers.map(a => a.id);
        
        if (JSON.stringify(answerIds) !== JSON.stringify(originalOrder)) {
          foundDifferentOrder = true;
          break;
        }
      }
      
      expect(foundDifferentOrder).toBe(true);
    });
  });
});
