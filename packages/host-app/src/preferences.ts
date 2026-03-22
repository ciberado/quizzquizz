/**
 * Host quiz preferences — persisted in localStorage.
 *
 * Remembers the last session-configuration choices the host made so
 * the next quiz starts with the same options.
 */

export interface QuizPreferences {
  randomOrder: boolean;
  shuffleAnswers: boolean;
  pace: 'normal' | 'calm' | 'manual';
  autoQuestionTime: boolean;
}

const STORAGE_KEY = 'quizzquizz_host_preferences';

const DEFAULTS: QuizPreferences = {
  randomOrder: false,
  shuffleAnswers: true,
  pace: 'normal',
  autoQuestionTime: true,
};

function load(): QuizPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<QuizPreferences>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // Corrupt data — fall back to defaults
  }
  return { ...DEFAULTS };
}

function save(prefs: QuizPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or disabled — silently ignore
  }
}

export const preferences = { load, save, DEFAULTS };
