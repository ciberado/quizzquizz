/**
 * Theme management — persisted in localStorage under the shared key
 * 'quizzquizz_theme' so the preference set in any frontend is honoured here.
 * Falls back to the OS colour-scheme preference when nothing is stored.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'quizzquizz_theme';

function osPreference(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function load(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch { /* storage unavailable */ }
  return osPreference();
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
  // Keep in sync when OS preference changes and no explicit preference is stored
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? 'dark' : 'light');
      } catch { /* ignore */ }
    });
  } catch { /* matchMedia unavailable */ }
}

export const theme = { load, save, apply, toggle, init };
