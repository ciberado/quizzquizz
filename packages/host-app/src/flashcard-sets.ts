/**
 * Flashcard set tracking utility.
 *
 * Provides deterministic set computation (splits a bank into fixed-size groups
 * by sorting IDs) and localStorage-backed progress tracking so users can study
 * one batch at a time and resume where they left off.
 *
 * localStorage keys:
 *   qz-fc-progress-{bankId}   — per-bank set progress
 *   qz-fc-active-session      — handoff to flashcard-app for completion marking
 */

export const STORAGE_KEY_PREFIX = 'qz-fc-progress-';
export const ACTIVE_SESSION_KEY = 'qz-fc-active-session';
export const DEFAULT_SET_SIZE = 10;

export interface SetProgress {
  ids: string[];
  completedAt: string | null; // ISO date string when completed, null otherwise
  /** Box distribution for this set — updated by the flashcard-app after each card answer */
  boxCounts?: {
    box1: number;
    box2: number;
    box3: number;
    graduated: number;
    total: number;
  } | null;
}

export interface BankProgress {
  setSize: number;
  sets: SetProgress[];
}

export interface ActiveSession {
  bankId: string;
  setIndex: number;
}

/**
 * Compute deterministic sets from a list of question IDs.
 * IDs are sorted alphabetically then sliced into groups of `setSize`.
 */
export function computeSets(allQuestionIds: string[], setSize: number = DEFAULT_SET_SIZE): string[][] {
  const sorted = [...allQuestionIds].sort();
  const sets: string[][] = [];
  for (let i = 0; i < sorted.length; i += setSize) {
    sets.push(sorted.slice(i, i + setSize));
  }
  return sets;
}

export function loadProgress(bankId: string): BankProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + bankId);
    if (!raw) return null;
    return JSON.parse(raw) as BankProgress;
  } catch {
    return null;
  }
}

export function saveProgress(bankId: string, progress: BankProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + bankId, JSON.stringify(progress));
  } catch { /* ignore quota errors */ }
}

/**
 * Load saved progress for a bank, or build fresh progress from the current
 * question IDs. Preserves completedAt timestamps for matching set indices
 * even if the bank grows, but discards stale completion data for sets that
 * no longer match (detected by set count change).
 */
export function getOrBuildProgress(
  bankId: string,
  allQuestionIds: string[],
  setSize: number = DEFAULT_SET_SIZE,
): BankProgress {
  const sets = computeSets(allQuestionIds, setSize);
  const existing = loadProgress(bankId);

  const sameShape = existing !== null &&
    existing.setSize === setSize &&
    existing.sets.length === sets.length;

  const progress: BankProgress = {
    setSize,
    sets: sets.map((ids, i) => ({
      ids,
      completedAt: sameShape ? (existing!.sets[i]?.completedAt ?? null) : null,
      boxCounts: sameShape ? (existing!.sets[i]?.boxCounts ?? null) : null,
    })),
  };

  return progress;
}

/** Return the index of the first incomplete set, or 0 if all are complete. */
export function nextIncompleteSetIndex(progress: BankProgress): number {
  const idx = progress.sets.findIndex((s) => s.completedAt === null);
  return idx === -1 ? 0 : idx;
}

/** Mark a specific set as completed and persist. */
export function markSetCompleted(bankId: string, setIndex: number): void {
  const existing = loadProgress(bankId);
  if (!existing || setIndex < 0 || setIndex >= existing.sets.length) return;
  existing.sets[setIndex]!.completedAt = new Date().toISOString();
  saveProgress(bankId, existing);
}

/** Remove all progress for a bank. */
export function resetProgress(bankId: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + bankId);
  } catch { /* ignore */ }
}

/** Store the currently active flashcard session so flashcard-app can mark it complete. */
export function setActiveSession(info: ActiveSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(info));
  } catch { /* ignore */ }
}

export function getActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* ignore */ }
}
