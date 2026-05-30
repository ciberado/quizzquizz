/**
 * Theme management — persisted in localStorage under the shared key
 * 'quizzquizz_theme' so the preference set in any frontend is honoured here.
 * Analytics UI defaults to dark (its original appearance).
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'quizzquizz_theme';
const DEFAULT: Theme = 'dark';

function load(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch { /* storage unavailable */ }
  return DEFAULT;
}

function save(t: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch { /* storage full or disabled */ }
}

function apply(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t);
}

function toggle(): Theme {
  const next: Theme = load() === 'dark' ? 'light' : 'dark';
  save(next);
  apply(next);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: next }));
  return next;
}

function init(): void {
  apply(load());
}

export const theme = { load, save, apply, toggle, init };
