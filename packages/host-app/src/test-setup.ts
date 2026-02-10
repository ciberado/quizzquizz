/**
 * Test setup for host app
 * Configures jsdom environment
 */

import { beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock location.hash for routing tests
delete (window as { location?: unknown }).location;
(window as { location: unknown }).location = {
  hash: '',
  href: 'http://localhost:3001/',
} as Location;

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  
  // Clear custom elements registry between tests
  const existingElements = ['create-session-screen', 'lobby-screen'];
  existingElements.forEach(tag => {
    const existing = customElements.get(tag);
    if (existing) {
      // Can't actually undefine, but we can at least check
      // In real tests, we'd use different tag names or reset DOM
    }
  });
  
  // Clear DOM
  document.body.innerHTML = '';
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};
