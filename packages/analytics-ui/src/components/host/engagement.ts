/**
 * Host: Engagement Timeline
 * Route: #/host/banks/:id/engagement
 */
import { api } from '../../api-client.js';
import { renderLineChart } from '../shared/charts.js';
import { renderLoading, renderApiError, pageLayout, statCard } from '../shared/ui.js';

type Period = {
  period: string;
  sessionCount: number;
  averagePlayers: number;
  averageAccuracy: number;
};
type EngagementReport = {
  questionBankId: string;
  range: string;
  periods: Period[];
  totalSessions: number;
  overallAveragePlayers: number;
  overallAverageAccuracy: number;
};

export async function renderEngagement(
  app: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  const bankId = params['id'] ?? '';
  const range = (params['range'] ?? 'week') as 'day' | 'week' | 'month';
  renderLoading(app, 'Loading engagement data…');

  let report: EngagementReport;
  try {
    report = (await api.bankEngagement(bankId, range)) as EngagementReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const content = `
    <div class="range-selector">
      <span>Range: </span>
      <a href="#/host/banks/${bankId}/engagement?range=day" class="${range === 'day' ? 'active' : ''}">Day</a>
      <a href="#/host/banks/${bankId}/engagement?range=week" class="${range === 'week' ? 'active' : ''}">Week</a>
      <a href="#/host/banks/${bankId}/engagement?range=month" class="${range === 'month' ? 'active' : ''}">Month</a>
    </div>

    <div class="card-grid">
      ${statCard('Total Sessions', report.totalSessions)}
      ${statCard('Avg Players/Session', report.overallAveragePlayers.toFixed(1))}
      ${statCard('Overall Avg Accuracy', (report.overallAverageAccuracy * 100).toFixed(1) + '%')}
    </div>

    <div class="card">
      <h2>Sessions Per Period</h2>
      <div id="sessions-chart"></div>
    </div>

    <div class="card">
      <h2>Average Players Per Session</h2>
      <div id="players-chart"></div>
    </div>

    <div class="card">
      <h2>Average Accuracy Per Session</h2>
      <div id="accuracy-chart"></div>
    </div>
  `;

  app.innerHTML = pageLayout(`#/host/banks/${bankId}/engagement`, 'Engagement Timeline', content);

  const labels = report.periods.map((p) => p.period.slice(5));

  const sessionsChart = document.getElementById('sessions-chart');
  if (sessionsChart) {
    renderLineChart(sessionsChart, [{ values: report.periods.map((p) => p.sessionCount), color: '#3b82f6', label: 'Sessions' }], { labels });
  }

  const playersChart = document.getElementById('players-chart');
  if (playersChart) {
    renderLineChart(playersChart, [{ values: report.periods.map((p) => p.averagePlayers), color: '#10b981', label: 'Avg Players' }], { labels });
  }

  const accChart = document.getElementById('accuracy-chart');
  if (accChart) {
    renderLineChart(accChart, [{ values: report.periods.map((p) => p.averageAccuracy), color: '#f59e0b', label: 'Avg Accuracy' }], { labels, yMin: 0, yMax: 1 });
  }
}
