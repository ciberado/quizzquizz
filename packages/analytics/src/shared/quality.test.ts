import { describe, it, expect } from 'vitest';
import {
  compositeQualityScore,
  distractorPower,
  isDominantDistractor,
} from './quality.js';
import type { QuestionGlobalStatData } from './quality.js';

const baseQuestion: QuestionGlobalStatData = {
  questionId: 'q1',
  timesAppeared: 20,
  timesAnswered: 20,
  timesCorrect: 10, // 50% accuracy
  averageResponseMs: 15000, // 15s — ideal
  answerSelections: { a1: 10, a2: 4, a3: 3, a4: 3 },
  empiricalDifficulty: 0.5,
};

describe('compositeQualityScore', () => {
  it('returns 0.5 for insufficient data (< 5 answers)', () => {
    const q = { ...baseQuestion, timesAnswered: 4 };
    expect(compositeQualityScore(q)).toBe(0.5);
  });

  it('returns a value in [0, 1]', () => {
    const score = compositeQualityScore(baseQuestion);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('question with 50% accuracy scores reasonably well', () => {
    const score = compositeQualityScore(baseQuestion);
    expect(score).toBeGreaterThan(0.3);
  });

  it('very fast response time reduces score', () => {
    const fast = { ...baseQuestion, averageResponseMs: 500 };
    expect(compositeQualityScore(fast)).toBeLessThan(compositeQualityScore(baseQuestion));
  });

  it('100% accuracy yields lower quality than 55%', () => {
    const tooEasy = { ...baseQuestion, timesCorrect: 20, answerSelections: { a1: 20 } };
    const balanced = { ...baseQuestion, timesCorrect: 11 };
    expect(compositeQualityScore(tooEasy)).toBeLessThan(
      compositeQualityScore(balanced),
    );
  });
});

describe('distractorPower', () => {
  it('returns empty object for zero total answers', () => {
    expect(distractorPower({ a1: 5 }, ['a1'], 0)).toEqual({});
  });

  it('excludes correct answer IDs', () => {
    const result = distractorPower({ a1: 10, a2: 5, a3: 5 }, ['a1'], 20);
    expect(result).not.toHaveProperty('a1');
    expect(result).toHaveProperty('a2');
    expect(result).toHaveProperty('a3');
  });

  it('computes fractions correctly', () => {
    const result = distractorPower({ a1: 10, a2: 5, a3: 5 }, ['a1'], 20);
    expect(result['a2']).toBeCloseTo(0.25);
    expect(result['a3']).toBeCloseTo(0.25);
  });
});

describe('isDominantDistractor', () => {
  it('returns false for correct answer', () => {
    expect(isDominantDistractor('a1', { a1: 15, a2: 5 }, ['a1'])).toBe(false);
  });

  it('returns true when wrong answer chosen more often than correct', () => {
    expect(isDominantDistractor('a2', { a1: 5, a2: 15 }, ['a1'])).toBe(true);
  });

  it('returns false when wrong answer chosen less than correct', () => {
    expect(isDominantDistractor('a2', { a1: 15, a2: 5 }, ['a1'])).toBe(false);
  });

  it('handles missing entries in answerSelections', () => {
    expect(isDominantDistractor('a2', { a2: 3 }, ['a1'])).toBe(true); // correct has 0
  });
});
