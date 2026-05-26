/**
 * Unit tests for flashcard-sets.ts — deterministic set computation and
 * localStorage-backed progress tracking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeSets,
  loadProgress,
  saveProgress,
  getOrBuildProgress,
  nextIncompleteSetIndex,
  markSetCompleted,
  resetProgress,
  setActiveSession,
  getActiveSession,
  clearActiveSession,
  STORAGE_KEY_PREFIX,
  ACTIVE_SESSION_KEY,
  DEFAULT_SET_SIZE,
} from './flashcard-sets';

describe('computeSets', () => {
  it('splits IDs into groups of setSize', () => {
    const ids = ['c', 'a', 'b', 'd', 'e'];
    const sets = computeSets(ids, 2);
    // IDs are sorted: a b c d e
    expect(sets).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('sorts IDs alphabetically before grouping (deterministic)', () => {
    const shuffled = ['z', 'm', 'a', 'f'];
    const sets = computeSets(shuffled, 10);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toEqual(['a', 'f', 'm', 'z']);
  });

  it('uses DEFAULT_SET_SIZE when no setSize is given', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `q${String(i).padStart(2, '0')}`);
    const sets = computeSets(ids);
    expect(sets).toHaveLength(3); // 10 + 10 + 5
    expect(sets[0]).toHaveLength(DEFAULT_SET_SIZE);
    expect(sets[1]).toHaveLength(DEFAULT_SET_SIZE);
    expect(sets[2]).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(computeSets([])).toEqual([]);
  });

  it('returns single set when count equals setSize', () => {
    const ids = ['b', 'a'];
    const sets = computeSets(ids, 2);
    expect(sets).toEqual([['a', 'b']]);
  });

  it('is deterministic — same IDs always produce same groups', () => {
    const ids = ['q3', 'q1', 'q2', 'q4', 'q5'];
    const first = computeSets(ids, 3);
    const second = computeSets([...ids].reverse(), 3);
    expect(first).toEqual(second);
  });
});

describe('loadProgress / saveProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadProgress returns null when nothing stored', () => {
    expect(loadProgress('bank-x')).toBeNull();
  });

  it('round-trips progress via save then load', () => {
    const progress = {
      setSize: 10,
      sets: [{ ids: ['a', 'b'], completedAt: null }],
    };
    saveProgress('bank-x', progress);
    expect(loadProgress('bank-x')).toEqual(progress);
  });

  it('uses bankId as part of the localStorage key', () => {
    saveProgress('bank-1', { setSize: 10, sets: [] });
    expect(localStorage.getItem(STORAGE_KEY_PREFIX + 'bank-1')).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_PREFIX + 'bank-2')).toBeNull();
  });

  it('loadProgress returns null on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'bank-x', '{bad');
    expect(loadProgress('bank-x')).toBeNull();
  });
});

describe('getOrBuildProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds fresh progress when no data stored', () => {
    const ids = ['c', 'a', 'b'];
    const progress = getOrBuildProgress('bank-1', ids, 2);
    expect(progress.setSize).toBe(2);
    expect(progress.sets).toHaveLength(2);
    expect(progress.sets[0]!.completedAt).toBeNull();
    expect(progress.sets[1]!.completedAt).toBeNull();
  });

  it('preserves completedAt from existing data when shape matches', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const initialProgress = getOrBuildProgress('bank-2', ids, 2);
    initialProgress.sets[0]!.completedAt = '2026-01-01T00:00:00.000Z';
    saveProgress('bank-2', initialProgress);

    const reloaded = getOrBuildProgress('bank-2', ids, 2);
    expect(reloaded.sets[0]!.completedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(reloaded.sets[1]!.completedAt).toBeNull();
  });

  it('discards stale completion data when set count changes', () => {
    // Start with 4 IDs → 2 sets of 2
    const ids4 = ['a', 'b', 'c', 'd'];
    const p1 = getOrBuildProgress('bank-3', ids4, 2);
    p1.sets[0]!.completedAt = '2026-01-01T00:00:00.000Z';
    saveProgress('bank-3', p1);

    // Now add 2 more IDs → 3 sets → shape mismatch → reset completedAt
    const ids6 = ['a', 'b', 'c', 'd', 'e', 'f'];
    const p2 = getOrBuildProgress('bank-3', ids6, 2);
    expect(p2.sets).toHaveLength(3);
    expect(p2.sets[0]!.completedAt).toBeNull();
  });
});

describe('nextIncompleteSetIndex', () => {
  it('returns index of first null completedAt', () => {
    const progress = {
      setSize: 10,
      sets: [
        { ids: ['a'], completedAt: '2026-01-01T00:00:00.000Z' },
        { ids: ['b'], completedAt: null },
        { ids: ['c'], completedAt: null },
      ],
    };
    expect(nextIncompleteSetIndex(progress)).toBe(1);
  });

  it('returns 0 when all sets are completed (cycle back)', () => {
    const progress = {
      setSize: 10,
      sets: [
        { ids: ['a'], completedAt: '2026-01-01T00:00:00.000Z' },
        { ids: ['b'], completedAt: '2026-01-02T00:00:00.000Z' },
      ],
    };
    expect(nextIncompleteSetIndex(progress)).toBe(0);
  });

  it('returns 0 for single incomplete set', () => {
    const progress = { setSize: 10, sets: [{ ids: ['a'], completedAt: null }] };
    expect(nextIncompleteSetIndex(progress)).toBe(0);
  });
});

describe('markSetCompleted', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets completedAt to a date string for the given set index', () => {
    const progress = {
      setSize: 10,
      sets: [
        { ids: ['a'], completedAt: null },
        { ids: ['b'], completedAt: null },
      ],
    };
    saveProgress('bank-4', progress);

    markSetCompleted('bank-4', 0);

    const updated = loadProgress('bank-4')!;
    expect(updated.sets[0]!.completedAt).not.toBeNull();
    expect(updated.sets[1]!.completedAt).toBeNull();
    // completedAt should be a valid ISO date
    expect(() => new Date(updated.sets[0]!.completedAt!)).not.toThrow();
  });

  it('does nothing when bankId not found', () => {
    // Should not throw
    expect(() => markSetCompleted('nonexistent', 0)).not.toThrow();
  });

  it('does nothing for out-of-range setIndex', () => {
    const progress = { setSize: 10, sets: [{ ids: ['a'], completedAt: null }] };
    saveProgress('bank-5', progress);
    markSetCompleted('bank-5', 99);
    expect(loadProgress('bank-5')!.sets[0]!.completedAt).toBeNull();
  });
});

describe('resetProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the progress key from localStorage', () => {
    saveProgress('bank-6', { setSize: 10, sets: [{ ids: ['a'], completedAt: '2026-01-01' }] });
    resetProgress('bank-6');
    expect(loadProgress('bank-6')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_PREFIX + 'bank-6')).toBeNull();
  });

  it('does not throw when nothing is stored', () => {
    expect(() => resetProgress('nonexistent')).not.toThrow();
  });
});

describe('active session handoff', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setActiveSession stores bankId and setIndex', () => {
    setActiveSession({ bankId: 'bank-7', setIndex: 2 });
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    expect(JSON.parse(raw!)).toEqual({ bankId: 'bank-7', setIndex: 2 });
  });

  it('getActiveSession returns stored session', () => {
    setActiveSession({ bankId: 'bank-8', setIndex: 1 });
    expect(getActiveSession()).toEqual({ bankId: 'bank-8', setIndex: 1 });
  });

  it('getActiveSession returns null when nothing stored', () => {
    expect(getActiveSession()).toBeNull();
  });

  it('clearActiveSession removes the key', () => {
    setActiveSession({ bankId: 'bank-9', setIndex: 0 });
    clearActiveSession();
    expect(getActiveSession()).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
});
