import { describe, it, expect } from 'vitest';
import {
  rollingAverage,
  percentiles,
  slope,
  standardDeviation,
  histogram,
  populationMean,
} from './stats.js';

describe('rollingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(rollingAverage([], 3)).toEqual([]);
  });

  it('single element returns same value', () => {
    expect(rollingAverage([5], 3)).toEqual([5]);
  });

  it('computes window correctly', () => {
    // [1,2,3,4,5] with window=3
    const result = rollingAverage([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBeCloseTo(1); // avg of [1]
    expect(result[1]).toBeCloseTo(1.5); // avg of [1,2]
    expect(result[2]).toBeCloseTo(2); // avg of [1,2,3]
    expect(result[3]).toBeCloseTo(3); // avg of [2,3,4]
    expect(result[4]).toBeCloseTo(4); // avg of [3,4,5]
  });

  it('window of 1 returns original values', () => {
    expect(rollingAverage([10, 20, 30], 1)).toEqual([10, 20, 30]);
  });

  it('window larger than array uses all values', () => {
    const result = rollingAverage([2, 4, 6], 10);
    expect(result[0]).toBeCloseTo(2);
    expect(result[1]).toBeCloseTo(3);
    expect(result[2]).toBeCloseTo(4);
  });

  it('throws on window <= 0', () => {
    expect(() => rollingAverage([1, 2], 0)).toThrow();
  });
});

describe('percentiles', () => {
  it('returns zeros for empty input', () => {
    expect(percentiles([], [0.5])).toEqual([0]);
  });

  it('single element returns same value for any percentile', () => {
    expect(percentiles([42], [0, 0.5, 1])).toEqual([42, 42, 42]);
  });

  it('computes p50 (median)', () => {
    expect(percentiles([1, 2, 3, 4, 5], [0.5])[0]).toBeCloseTo(3);
  });

  it('computes p25 and p75 for [1..100]', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const [p25, p75] = percentiles(values, [0.25, 0.75]);
    expect(p25).toBeGreaterThanOrEqual(24);
    expect(p25).toBeLessThanOrEqual(26);
    expect(p75).toBeGreaterThanOrEqual(74);
    expect(p75).toBeLessThanOrEqual(76);
  });
});

describe('slope', () => {
  it('returns 0 for empty input', () => {
    expect(slope([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(slope([5])).toBe(0);
  });

  it('returns positive slope for increasing series', () => {
    expect(slope([1, 2, 3, 4, 5])).toBeGreaterThan(0);
  });

  it('returns negative slope for decreasing series', () => {
    expect(slope([5, 4, 3, 2, 1])).toBeLessThan(0);
  });

  it('returns ~0 for flat series', () => {
    expect(Math.abs(slope([3, 3, 3, 3]))).toBeLessThan(0.001);
  });

  it('slope of [1,3,5] is ~2', () => {
    expect(slope([1, 3, 5])).toBeCloseTo(2);
  });
});

describe('standardDeviation', () => {
  it('returns 0 for empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(standardDeviation([42])).toBe(0);
  });

  it('returns 0 for all-same values', () => {
    expect(standardDeviation([5, 5, 5, 5])).toBeCloseTo(0);
  });

  it('computes correct value for known dataset', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → population std dev ≈ 2
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 0);
  });
});

describe('histogram', () => {
  it('returns empty for empty input', () => {
    expect(histogram([], 5)).toEqual([]);
  });

  it('throws on bucketCount <= 0', () => {
    expect(() => histogram([1, 2], 0)).toThrow();
  });

  it('returns single bucket when all values equal', () => {
    const result = histogram([7, 7, 7], 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ min: 7, max: 7, count: 3 });
  });

  it('total count equals input length', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = histogram(values, 5);
    const total = result.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(values.length);
  });

  it('creates correct number of buckets', () => {
    const result = histogram([0, 1, 2, 3, 4, 5], 3);
    expect(result).toHaveLength(3);
  });
});

describe('populationMean', () => {
  it('returns 0 for empty array', () => {
    expect(populationMean([])).toBe(0);
  });

  it('computes mean correctly', () => {
    expect(populationMean([1, 2, 3, 4, 5])).toBeCloseTo(3);
  });
});
