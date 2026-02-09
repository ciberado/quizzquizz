import './styles.css';
import { router } from './router';
import { state } from './state';

// Import screen components
import './components/join-screen';
import './components/nickname-screen';
import './components/lobby-screen';

/**
 * QuizzQuizz Player App
 * Web Components-based player interface
 */

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

router.on('/play/:sessionId', () => {
  showScreen('play-screen-placeholder');
});

router.on('/results/:sessionId', () => {
  showScreen('results-screen-placeholder');
});

/**
 * Screen switcher - mounts Web Components
 */
function showScreen(componentTag: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Placeholder screens for Phase 4C
  const placeholders: Record<string, string> = {
    'play-screen-placeholder': `
      <div class="screen">
        <div class="card">
          <h1>Question Screen</h1>
          <p>Coming in Phase 4C...</p>
          <button onclick="location.hash='/join'" class="secondary">Back to Join</button>
        </div>
      </div>
    `,
    'results-screen-placeholder': `
      <div class="screen">
        <div class="card">
          <h1>Results Screen</h1>
          <p>Coming in Phase 4C...</p>
          <button onclick="location.hash='/join'" class="secondary">Back to Join</button>
        </div>
      </div>
    `,
  };

  // Use placeholder or create component
  if (placeholders[componentTag]) {
    app.innerHTML = placeholders[componentTag];
  } else {
    app.innerHTML = `<${componentTag}></${componentTag}>`;
  }
}

console.log('QuizzQuizz Player App initialized');
console.log('Current route:', router.getCurrentPath());
