/**
 * Analytics-UI — main entry point.
 * Checks auth, sets up router, and mounts the app.
 */
import './styles.css';
import { Router } from './router.js';
import { attachSidebarToggle } from './components/shared/ui.js';
import { renderDashboard } from './components/player/dashboard.js';
import { renderAccuracyTrend } from './components/player/accuracy-trend.js';
import { renderWeakTopics } from './components/player/weak-topics.js';
import { renderResponseProfile } from './components/player/response-profile.js';
import { renderPractice } from './components/player/practice.js';
import { renderGlobalComparison } from './components/player/global-comparison.js';
import { renderSessionHistory } from './components/player/session-history.js';
import { renderSessionDetail } from './components/player/session-detail.js';
import { renderSessionReport } from './components/host/session-report.js';
import { renderBankHealth } from './components/host/bank-health.js';
import { renderEngagement } from './components/host/engagement.js';
import { renderCompare } from './components/host/comparative.js';

const app = document.getElementById('app')!;

// Re-attach sidebar toggle after each render
const observer = new MutationObserver(() => attachSidebarToggle());
observer.observe(app, { childList: true });

const router = new Router();

// Player routes
router.on('/player/dashboard', () => renderDashboard(app));
router.on('/player/sessions/:id', (params) => renderSessionDetail(app, params));
router.on('/player/sessions', () => renderSessionHistory(app));
router.on('/player/trend', () => renderAccuracyTrend(app));
router.on('/player/topics', () => renderWeakTopics(app));
router.on('/player/speed', () => renderResponseProfile(app));
router.on('/player/practice', () => renderPractice(app));
router.on('/player/compare', (params) => renderGlobalComparison(app, params));

// Host routes
router.on('/host/sessions/compare', (params) => renderCompare(app, params));
router.on('/host/sessions/:id', (params) => renderSessionReport(app, params));
router.on('/host/banks/:id/health', (params) => renderBankHealth(app, params));
router.on('/host/banks/:id/engagement', (params) => renderEngagement(app, params));

router.notFound(() => {
  window.location.hash = '#/player/dashboard';
});

router.start();
