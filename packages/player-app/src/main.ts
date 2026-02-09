import './styles.css';
import { router } from './router';
import { state } from './state';

/**
 * QuizzQuizz Player App
 * Simple Web Components-based player interface
 */

// Load saved state from localStorage (for reconnection)
state.loadFromStorage();

// Define routes (will add components in Phase 4B)
router.on('/', () => {
  showScreen('join');
});

router.on('/join', () => {
  showScreen('join');
});

router.on('/nickname', () => {
  showScreen('nickname');
});

router.on('/lobby/:sessionId', (params) => {
  console.log('Lobby screen:', params.sessionId);
  showScreen('lobby');
});

router.on('/play/:sessionId', (params) => {
  console.log('Play screen:', params.sessionId);
  showScreen('play');
});

router.on('/results/:sessionId', (params) => {
  console.log('Results screen:', params.sessionId);
  showScreen('results');
});

/**
 * Simple screen switcher (will replace with actual components)
 */
function showScreen(screenName: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // For now, just show placeholder content
  const screens: Record<string, string> = {
    join: `
      <div class="screen">
        <h1>Join Quiz</h1>
        <p>Enter PIN screen placeholder</p>
        <button onclick="location.hash='/nickname'">Test: Go to Nickname</button>
      </div>
    `,
    nickname: `
      <div class="screen">
        <h1>Enter Nickname</h1>
        <p>Nickname screen placeholder</p>
        <button onclick="location.hash='/lobby/test'">Test: Go to Lobby</button>
      </div>
    `,
    lobby: `
      <div class="screen">
        <h1>Lobby</h1>
        <p>Waiting for host to start...</p>
        <button onclick="location.hash='/play/test'">Test: Go to Question</button>
      </div>
    `,
    play: `
      <div class="screen">
        <h1>Question</h1>
        <p>Question screen placeholder</p>
        <button onclick="location.hash='/results/test'">Test: Go to Results</button>
      </div>
    `,
    results: `
      <div class="screen">
        <h1>Results</h1>
        <p>Results screen placeholder</p>
        <button onclick="location.hash='/join'">Test: Back to Join</button>
      </div>
    `,
  };

  app.innerHTML = screens[screenName] || '<div class="screen"><h1>404</h1></div>';
}

console.log('QuizzQuizz Player App initialized');
console.log('Current route:', router.getCurrentPath());
