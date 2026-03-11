/**
 * Player: Personal Dashboard
 * Route: #/player/dashboard
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, statCard, pct } from '../shared/ui.js';

type DashboardSession = {
  sessionId: string;
  finalScore: number;
  finalRank: number;
  accuracy: number;
  playedAt: string;
};
type Dashboard = {
  userId: string;
  lifetime: {
    totalPlayed: number;
    totalAnswered: number;
    overallAccuracy: number;
    averageRank: number;
    medianScore: number;
  };
  streaks: {
    engagementCurrent: number;
    masteryCurrent: number;
    masteryLongest: number;
  };
  recentSessions: DashboardSession[];
};

export async function renderDashboard(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading dashboard…');

  let data: Dashboard;
  try {
    data = (await api.dashboard()) as Dashboard;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const recentRows = data.recentSessions
    .map(
      (s) => `
      <tr class="clickable-row" onclick="window.location.hash='#/player/sessions/${encodeURIComponent(s.sessionId)}'">
        <td>${new Date(s.playedAt).toLocaleDateString()}</td>
        <td>${s.finalScore}</td>
        <td>#${s.finalRank}</td>
        <td>${pct(s.accuracy)}</td>
        <td><a href="#/player/sessions/${encodeURIComponent(s.sessionId)}" class="detail-link">View →</a></td>
      </tr>`,
    )
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('Total Games Played', data.lifetime.totalPlayed)}
      ${statCard('Total Answers', data.lifetime.totalAnswered)}
      ${statCard('Overall Accuracy', pct(data.lifetime.overallAccuracy))}
      ${statCard('Average Rank', data.lifetime.averageRank.toFixed(1))}
      ${statCard('Median Score', data.lifetime.medianScore.toFixed(0))}
    </div>

    <div class="card-grid">
      ${statCard('🔥 Play Streak', data.streaks.engagementCurrent + ' sessions')}
      ${statCard('⭐ Mastery Streak', data.streaks.masteryCurrent + ' sessions')}
      ${statCard('🏆 Best Mastery Streak', data.streaks.masteryLongest + ' sessions')}
    </div>

    <div class="card">
      <h2>Recent Sessions</h2>
      ${data.recentSessions.length === 0 ? '<p>No sessions yet. Play your first game!</p>' : `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Score</th><th>Rank</th><th>Accuracy</th><th></th></tr></thead>
          <tbody>${recentRows}</tbody>
        </table>
        <p class="hint"><a href="#/player/sessions">View all sessions →</a></p>`}
    </div>

    <div class="card-grid nav-cards">
      <a href="#/player/sessions" class="nav-card">📋 Session History</a>
      <a href="#/player/topics" class="nav-card">📚 Topics Overview</a>
      <a href="#/player/trend" class="nav-card">📈 Accuracy Trend</a>
      <a href="#/player/speed" class="nav-card">⚡ Response Profile</a>
      <a href="#/player/practice" class="nav-card">🎯 Practice</a>
      <a href="#/player/compare" class="nav-card">🌍 Global Comparison</a>
    </div>
  `;

  app.innerHTML = pageLayout('#/player/dashboard', 'My Dashboard', content);
}
