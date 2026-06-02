import './styles.css';
import { theme } from './theme';
import { router } from './router';
import { state } from './state';

// Import screen components
import './components/nav-header';
import './components/join-screen';
import './components/play-screen';
import './components/summary-screen';
import './components/theme-toggle';

// Apply saved theme (or OS preference) before first render to avoid flash
theme.init();

// Track the currently mounted screen tag to avoid unnecessary remounts
let currentScreenTag = '';

function showScreen(tag: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  // If the same screen type is already mounted, skip remounting.
  if (currentScreenTag === tag && app.firstElementChild) {
    return;
  }

  currentScreenTag = tag;
  app.innerHTML = `<${tag} class="route-enter"></${tag}>`;
}

// Routes
router.on('/', () => showScreen('flashcard-join-screen'));
router.on('/join', () => showScreen('flashcard-join-screen'));

router.on('/play/:sessionId', () => {
  // If no session in state and no sessionId from URL, redirect to join
  const hash = window.location.hash;
  const hasSession = hash.match(/#\/play\/([^/?]+)/);
  if (!hasSession && !state.sessionId) {
    router.navigate('/');
    return;
  }
  showScreen('flashcard-play-screen');
});

router.on('/summary', () => showScreen('flashcard-summary-screen'));

console.log('🃏 QuizzQuizz Flashcard App initialized');
