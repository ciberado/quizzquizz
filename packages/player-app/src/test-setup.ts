/**
 * Test setup for player-app
 * Runs before each test file
 */

// Mock localStorage if not available
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
}

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    origin: 'http://localhost:3002',
  },
  writable: true,
});
