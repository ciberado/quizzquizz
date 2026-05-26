/**
 * Flashcard set completion tracker — flashcard-app side.
 *
 * Mirrors the completion-related functions from host-app/src/flashcard-sets.ts.
 * Both apps share the same localStorage keys so completion written here is
 * immediately visible to the host-app on its next load.
 *
 * Keys:
 *   qz-fc-progress-{bankId}  — per-bank set progress (written by host; read+updated here)
 *   qz-fc-active-session     — set by host before launching; cleared after marking done
 */

export const STORAGE_KEY_PREFIX = 'qz-fc-progress-';
export const ACTIVE_SESSION_KEY = 'qz-fc-active-session';

export interface SetProgress {
  ids: string[];
  completedAt: string | null;
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
  const existing = loadProgress(bankId);
  if (!existing || setIndex < 0 || setIndex >= existing.sets.length) return;
  existing.sets[setIndex]!.completedAt = new Date().toISOString();
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
