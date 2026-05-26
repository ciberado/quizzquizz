import './styles.css';
import { router } from './router';
import { state } from './state';
import { OfflineIndicator } from './offline-indicator';
import { ErrorBoundary } from './error-boundary';
import { theme } from './theme';

// Import screen components
import './components/join-screen';
import './components/nickname-screen';
import './components/lobby-screen';
import './components/question-screen';
import './components/waiting-screen';
import './components/results-screen';
import './components/login-screen';
import './components/auth-header';
import './components/theme-toggle';

/**
 * QuizzQuizz Player App
 * Web Components-based player interface
 */

// Initialize error boundary (catches unhandled errors)
new ErrorBoundary();

// Apply saved theme before first render
theme.init();

// Initialize offline indicator
new OfflineIndicator();

// Load saved state from localStorage (for reconnection)
state.loadFromStorage();

// Define routes
router.on('/', () => {
  showScreen('join-screen');
});

router.on('/join', () => {
  showScreen('join-screen');
});

router.on('/nickname', () => {
  showScreen('nickname-screen');
});

router.on('/lobby/:sessionId', () => {
  showScreen('lobby-screen');
});

router.on('/question/:sessionId', () => {
  showScreen('question-screen');
});

router.on('/question', () => {
  showScreen('question-screen');
});

router.on('/waiting', () => {
  showScreen('waiting-screen');
});

router.on('/results/:sessionId', () => {
  showScreen('results-screen');
});

router.on('/results', () => {
  showScreen('results-screen');
});

router.on('/login', () => {
  showScreen('login-screen');
});

/**
 * Screen switcher - mounts Web Components
 */
function showScreen(componentTag: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Mount Web Component
  app.innerHTML = `<${componentTag}></${componentTag}>`;
}

console.log('QuizzQuizz Player App initialized');
console.log('Current route:', router.getCurrentPath());
