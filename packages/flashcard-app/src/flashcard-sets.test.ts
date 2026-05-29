/**
 * Unit tests for flashcard-app/src/flashcard-sets.ts.
 * Covers markSetCompleted (including stub creation) and updateSetBoxCounts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  markSetCompleted,
  updateSetBoxCounts,
  getActiveSession,
  clearActiveSession,
  STORAGE_KEY_PREFIX,
  ACTIVE_SESSION_KEY,
} from './flashcard-sets';

describe('markSetCompleted', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets completedAt for the given set index when progress exists', () => {
    const progress = {
      setSize: 10,
      sets: [
        { ids: ['a', 'b'], completedAt: null },
        { ids: ['c', 'd'], completedAt: null },
      ],
    };
    saveProgress('bank-1', progress);

    markSetCompleted('bank-1', 0);

    const updated = loadProgress('bank-1')!;
    expect(updated.sets[0]!.completedAt).not.toBeNull();
    expect(updated.sets[1]!.completedAt).toBeNull();
    expect(() => new Date(updated.sets[0]!.completedAt!)).not.toThrow();
  });

  it('creates a stub progress entry and marks it complete when no progress exists', () => {
    // No progress saved for 'bank-x' — simulates dev-mode cross-origin scenario
    markSetCompleted('bank-x', 0);

    const saved = loadProgress('bank-x');
    expect(saved).not.toBeNull();
    expect(saved!.sets[0]!.completedAt).not.toBeNull();
  });

  it('stub handles setIndex > 0 correctly', () => {
    markSetCompleted('bank-y', 2);

    const saved = loadProgress('bank-y')!;
    expect(saved.sets).toHaveLength(3);
    expect(saved.sets[0]!.completedAt).toBeNull();
    expect(saved.sets[1]!.completedAt).toBeNull();
    expect(saved.sets[2]!.completedAt).not.toBeNull();
  });

  it('does nothing for out-of-range setIndex on existing progress', () => {
    const progress = { setSize: 10, sets: [{ ids: ['a'], completedAt: null }] };
    saveProgress('bank-z', progress);
    markSetCompleted('bank-z', 99);
    expect(loadProgress('bank-z')!.sets[0]!.completedAt).toBeNull();
  });
});

describe('updateSetBoxCounts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates boxCounts for the given set index', () => {
    const progress = {
      setSize: 10,
      sets: [{ ids: ['a', 'b', 'c'], completedAt: null }],
    };
    saveProgress('bank-2', progress);

    updateSetBoxCounts('bank-2', 0, { box1: 2, box2: 1, box3: 0, graduated: 0, total: 3 });

    const updated = loadProgress('bank-2')!;
    expect(updated.sets[0]!.boxCounts).toEqual({
      box1: 2, box2: 1, box3: 0, graduated: 0, total: 3,
    });
  });

  it('creates a stub progress entry when no prior progress exists (dev-mode cross-origin scenario)', () => {
    updateSetBoxCounts('bank-missing', 0, { box1: 1, box2: 0, box3: 0, graduated: 0, total: 1 });
    const saved = loadProgress('bank-missing');
    expect(saved).not.toBeNull();
    expect(saved!.sets[0]!.boxCounts).toEqual({ box1: 1, box2: 0, box3: 0, graduated: 0, total: 1 });
  });

  it('does nothing for out-of-range setIndex', () => {
    const progress = { setSize: 10, sets: [{ ids: ['a'], completedAt: null }] };
    saveProgress('bank-3', progress);

    updateSetBoxCounts('bank-3', 5, { box1: 1, box2: 0, box3: 0, graduated: 0, total: 1 });

    // Set 0 should be unchanged (no boxCounts added)
    expect(loadProgress('bank-3')!.sets[0]!.boxCounts).toBeUndefined();
  });

  it('preserves existing completedAt when updating boxCounts', () => {
    const iso = '2026-01-01T00:00:00.000Z';
    const progress = {
      setSize: 10,
      sets: [{ ids: ['a'], completedAt: iso }],
    };
    saveProgress('bank-4', progress);

    updateSetBoxCounts('bank-4', 0, { box1: 0, box2: 0, box3: 0, graduated: 1, total: 1 });

    const updated = loadProgress('bank-4')!;
    expect(updated.sets[0]!.completedAt).toBe(iso);
    expect(updated.sets[0]!.boxCounts).toEqual({ box1: 0, box2: 0, box3: 0, graduated: 1, total: 1 });
  });
});

describe('active session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getActiveSession returns null when nothing stored', () => {
    expect(getActiveSession()).toBeNull();
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });

  it('clearActiveSession removes the key', () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ bankId: 'b', setIndex: 0 }));
    clearActiveSession();
    expect(getActiveSession()).toBeNull();
  });

  it('uses correct storage key prefix', () => {
    const progress = { setSize: 10, sets: [] };
    saveProgress('bank-5', progress);
    expect(localStorage.getItem(STORAGE_KEY_PREFIX + 'bank-5')).not.toBeNull();
  });
});
