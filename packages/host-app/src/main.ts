import './styles.css';
import { router } from './router';
import { state } from './state';
import { OfflineIndicator } from './offline-indicator';
import { ErrorBoundary } from './error-boundary';
import { theme } from './theme';

// Import screen components
import './components/auth-header';
import './components/theme-toggle';
import './components/login-screen';
import './components/bank-browser';
import './components/upload-quiz-modal';
import './components/create-session-screen';
import './components/question-preview-screen';
import './components/lobby-screen';
import './components/question-display-screen';
import './components/leaderboard-screen';
import './components/final-results-screen';
import './components/question-stats-table';
import './components/flashcard-lobby-screen';
import './components/question-bank-editor';

/**
 * QuizzQuizz Host App
 * Web Components-based host interface for projector display
 */

// Initialize error boundary (catches unhandled errors)
new ErrorBoundary();

// Apply saved theme before first render
theme.init();

// Initialize offline indicator
new OfflineIndicator();

// Load saved state from localStorage
state.loadFromStorage();

// Define routes
router.on('/', () => {
  showScreen('create-session-screen');
});

router.on('/login', () => {
  showScreen('login-screen');
});

router.on('/create', () => {
  showScreen('create-session-screen');
});

router.on('/preview/:bankId', () => {
  showScreen('question-preview-screen');
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

router.on('/flashcard-lobby/:sessionId', () => {
  showScreen('flashcard-lobby-screen');
});

router.on('/edit/:bankId', () => {
  showScreen('qz-question-bank-editor');
});

// Helper function to show a screen
// Track the currently mounted screen tag to avoid unnecessary remounts
let currentScreenTag = '';

function showScreen(componentTag: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // If the same screen type is already mounted, skip remounting.
  // This prevents fade/flash when only query params change (e.g. folder navigation).
  if (currentScreenTag === componentTag && app.firstElementChild) {
    return;
  }

  currentScreenTag = componentTag;

  // Clear existing content
  app.innerHTML = '';

  // Create and append component with route-enter class for fade animation
  const component = document.createElement(componentTag);
  component.classList.add('route-enter');
  app.appendChild(component);
}

// Initialize router
console.log('🎯 QuizzQuizz Host App initialized');
