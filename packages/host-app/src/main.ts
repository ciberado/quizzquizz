import './styles.css';
import { router } from './router';
import { state } from './state';
import { OfflineIndicator } from './offline-indicator';
import { ErrorBoundary } from './error-boundary';

// Import screen components
import './components/create-session-screen';
import './components/lobby-screen';
import './components/question-display-screen';
import './components/leaderboard-screen';
import './components/final-results-screen';
import './components/question-stats-table';

/**
 * QuizzQuizz Host App
 * Web Components-based host interface for projector display
 */

// Initialize error boundary (catches unhandled errors)
new ErrorBoundary();

// Initialize offline indicator
new OfflineIndicator();

// Load saved state from localStorage
state.loadFromStorage();

// Define routes
router.on('/', () => {
  showScreen('create-session-screen');
});

router.on('/create', () => {
  showScreen('create-session-screen');
});

router.on('/lobby/:sessionId', () => {
  showScreen('lobby-screen');
});

router.on('/question/:sessionId', () => {
  showScreen('question-display-screen');
});

router.on('/question', () => {
  showScreen('question-display-screen');
});

router.on('/leaderboard', () => {
  showScreen('leaderboard-screen');
});

router.on('/results', () => {
  showScreen('final-results-screen');
});

// Helper function to show a screen
function showScreen(componentTag: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Clear existing content
  app.innerHTML = '';

  // Create and append component
  const component = document.createElement(componentTag);
  app.appendChild(component);
}

// Initialize router
console.log('🎯 QuizzQuizz Host App initialized');
