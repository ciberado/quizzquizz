import { describe, it, expect } from 'vitest';
import { streaks } from './streaks.js';

describe('streaks', () => {
  it('returns 0 for empty array', () => {
    expect(streaks([])).toEqual({ current: 0, longest: 0 });
  });

  it('single true', () => {
    expect(streaks([true])).toEqual({ current: 1, longest: 1 });
  });

  it('single false', () => {
    expect(streaks([false])).toEqual({ current: 0, longest: 0 });
  });

  it('all true', () => {
    expect(streaks([true, true, true])).toEqual({ current: 3, longest: 3 });
  });

  it('all false', () => {
    expect(streaks([false, false, false])).toEqual({ current: 0, longest: 0 });
  });

  it('current streak resets after false', () => {
    // T T F T T T → current=3, longest=3
    expect(streaks([true, true, false, true, true, true])).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it('current streak is 0 when last entry is false', () => {
    expect(streaks([true, true, false])).toEqual({ current: 0, longest: 2 });
  });

  it('longest streak longer than current', () => {
    // T T T F T → current=1, longest=3
    expect(streaks([true, true, true, false, true])).toEqual({
      current: 1,
      longest: 3,
    });
  });
});
