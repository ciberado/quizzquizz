import { describe, it, expect } from 'vitest';
import {
  generateId,
  generatePin,
  calculateScore,
  isAnswerCorrect,
  shuffleArray,
  now,
} from './utils.js';

describe('generateId', () => {
  it('should generate a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe('generatePin', () => {
  it('should generate a 6-digit PIN', () => {
    const pin = generatePin();
    expect(pin).toHaveLength(6);
  });

  it('should only contain digits 2-9', () => {
    const pin = generatePin();
    expect(pin).toMatch(/^[2-9]{6}$/);
  });

  it('should not contain ambiguous characters (0, 1)', () => {
    // Generate multiple PINs to ensure consistency
    for (let i = 0; i < 100; i++) {
      const pin = generatePin();
      expect(pin).not.toContain('0');
      expect(pin).not.toContain('1');
    }
  });

  it('should generate different PINs', () => {
    const pin1 = generatePin();
    const pin2 = generatePin();
    // Very unlikely to be the same
    expect(pin1).not.toBe(pin2);
  });
});

describe('calculateScore', () => {
  it('should return 0 for incorrect answers', () => {
    const score = calculateScore(false, 5, 20, 1000);
    expect(score).toBe(0);
  });

  it('should return full points for instant correct answer', () => {
    const score = calculateScore(true, 0, 20, 1000);
    expect(score).toBe(1000);
  });

  it('should return half points for answer at half time', () => {
    const score = calculateScore(true, 10, 20, 1000);
    expect(score).toBe(750);
  });

  it('should return minimum points for answer at time limit', () => {
    const score = calculateScore(true, 20, 20, 1000);
    expect(score).toBe(500);
  });

  it('should handle custom base points', () => {
    const score = calculateScore(true, 0, 20, 500);
    expect(score).toBe(500);
  });

  it('should clamp time taken to time limit', () => {
    // If somehow time taken exceeds limit, treat as limit
    const score = calculateScore(true, 25, 20, 1000);
    expect(score).toBe(500);
  });

  it('should return integer scores', () => {
    const score = calculateScore(true, 7, 20, 1000);
    expect(Number.isInteger(score)).toBe(true);
  });

  it('should never return negative scores', () => {
    const score = calculateScore(true, 1000, 20, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('isAnswerCorrect', () => {
  it('should return true for exact match', () => {
    const selected = ['a', 'b'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(true);
  });

  it('should return true for exact match (order independent)', () => {
    const selected = ['b', 'a'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(true);
  });

  it('should return false for missing correct answer', () => {
    const selected = ['a'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });

  it('should return false for extra incorrect answer', () => {
    const selected = ['a', 'b', 'c'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });

  it('should return false for completely wrong answers', () => {
    const selected = ['c', 'd'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });

  it('should return false for partial match', () => {
    const selected = ['a', 'c'];
    const correct = ['a', 'b'];
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });

  it('should return true for single correct answer', () => {
    const selected = ['a'];
    const correct = ['a'];
    expect(isAnswerCorrect(selected, correct)).toBe(true);
  });

  it('should return false for empty selection when answers required', () => {
    const selected: string[] = [];
    const correct = ['a'];
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });

  it('should handle duplicate IDs gracefully', () => {
    const selected = ['a', 'a', 'b'];
    const correct = ['a', 'b'];
    // Duplicates should not affect correctness
    expect(isAnswerCorrect(selected, correct)).toBe(false);
  });
});

describe('shuffleArray', () => {
  it('should return a new array with same elements', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);
    
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    shuffleArray(original);
    
    expect(original).toEqual(originalCopy);
  });

  it('should shuffle array (probabilistic test)', () => {
    // Test multiple times to ensure shuffling happens
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let wasShuffled = false;
    
    // Run 10 times - at least one should be different from original order
    for (let i = 0; i < 10; i++) {
      const shuffled = shuffleArray(original);
      if (JSON.stringify(shuffled) !== JSON.stringify(original)) {
        wasShuffled = true;
        break;
      }
    }
    
    expect(wasShuffled).toBe(true);
  });

  it('should handle empty arrays', () => {
    const empty: number[] = [];
    const shuffled = shuffleArray(empty);
    
    expect(shuffled).toEqual([]);
  });

  it('should handle single-element arrays', () => {
    const single = [42];
    const shuffled = shuffleArray(single);
    
    expect(shuffled).toEqual([42]);
  });

  it('should work with different data types', () => {
    const strings = ['a', 'b', 'c', 'd'];
    const shuffled = shuffleArray(strings);
    
    expect(shuffled).toHaveLength(strings.length);
    expect(shuffled.sort()).toEqual(strings.sort());
  });

  it('should work with objects', () => {
    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const shuffled = shuffleArray(objects);
    
    expect(shuffled).toHaveLength(objects.length);
    expect(shuffled.map(o => o.id).sort()).toEqual([1, 2, 3]);
  });
});

describe('now', () => {
  it('should return a timestamp', () => {
    const timestamp = now();
    expect(typeof timestamp).toBe('number');
    expect(timestamp).toBeGreaterThan(0);
  });

  it('should return current time in milliseconds', () => {
    const timestamp = now();
    const currentTime = Date.now();
    // Should be within 10ms
    expect(Math.abs(timestamp - currentTime)).toBeLessThan(10);
  });
});
