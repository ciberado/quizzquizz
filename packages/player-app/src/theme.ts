/**
 * Theme management — persisted in localStorage.
 * Player app defaults to light theme.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'quizzquizz_theme';
const DEFAULT: Theme = 'light';

function load(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    // Storage unavailable — fall back to default
  }
  return DEFAULT;
}

function save(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage full or disabled — silently ignore
  }
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggle(): Theme {
  const current = load();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  save(next);
  apply(next);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: next }));
  return next;
}

function init(): void {
  apply(load());
}

export const theme = { load, save, apply, toggle, init };
