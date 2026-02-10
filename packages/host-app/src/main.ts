import './styles.css';
import { router } from './router';
import { state } from './state';

// Import screen components
import './components/create-session-screen';

/**
 * QuizzQuizz Host App
 * Web Components-based host interface for projector display
 */

// Load saved state from localStorage
state.loadFromStorage();

// Define routes
router.on('/', () => {
  showScreen('create-session-screen');
});

router.on('/create', () => {
  showScreen('create-session-screen');
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
