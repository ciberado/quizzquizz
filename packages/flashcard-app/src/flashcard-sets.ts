/**
 * Flashcard set completion tracker — flashcard-app side.
 *
 * Mirrors the completion-related functions from host-app/src/flashcard-sets.ts.
 * Both apps share the same localStorage keys so completion written here is
 * immediately visible to the host-app on its next load (works when apps share
 * the same origin, i.e., production).
 *
 * In development (separate ports), the host-app passes bankId/setIndex via URL
 * hash params.  The summary screen then appends completion params to the return
 * URL so the host-app marks the set done in its own localStorage.
 *
 * Keys:
 *   qz-fc-progress-{bankId}  — per-bank set progress (written by host; read+updated here)
 *   qz-fc-active-session     — set by host before launching; cleared after marking done
 */

export const STORAGE_KEY_PREFIX = 'qz-fc-progress-';
export const ACTIVE_SESSION_KEY = 'qz-fc-active-session';
export const DEFAULT_SET_SIZE = 10;

export interface BoxCounts {
  box1: number;
  box2: number;
  box3: number;
  graduated: number;
  total: number;
}

export interface SetProgress {
  ids: string[];
  completedAt: string | null;
  /** Box distribution for this set — updated after each card answer during a session */
  boxCounts?: BoxCounts | null;
}

export interface BankProgress {
  setSize: number;
  sets: SetProgress[];
}

export interface ActiveSession {
  bankId: string;
  setIndex: number;
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
  } catch { /* ignore */ }
}

export function markSetCompleted(bankId: string, setIndex: number): void {
  if (setIndex < 0) return;
  let existing = loadProgress(bankId);
  if (!existing) {
    // No progress record in this origin's localStorage — create a minimal stub so the
    // completion is persisted.  In production (same origin as host-app) the host-app will
    // reconcile the full structure via getOrBuildProgress on its next load.
    existing = {
      setSize: DEFAULT_SET_SIZE,
      sets: Array.from({ length: setIndex + 1 }, () => ({ ids: [], completedAt: null })),
    };
  }
  if (setIndex >= existing.sets.length) return;
  existing.sets[setIndex]!.completedAt = new Date().toISOString();
  saveProgress(bankId, existing);
}

/** Update the box distribution for a set after each card answer.
 * Creates a minimal stub entry when no progress exists yet (e.g. dev-mode
 * cross-origin, where the host-app saved the entry on a different port). */
export function updateSetBoxCounts(bankId: string, setIndex: number, counts: BoxCounts): void {
  let existing = loadProgress(bankId);
  if (!existing) {
    existing = {
      setSize: DEFAULT_SET_SIZE,
      sets: Array.from({ length: setIndex + 1 }, () => ({ ids: [], completedAt: null })),
    };
  }
  if (setIndex < 0 || setIndex >= existing.sets.length) return;
  existing.sets[setIndex]!.boxCounts = counts;
  saveProgress(bankId, existing);
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
