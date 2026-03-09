/**
 * Player: Accuracy Trend
 * Route: #/player/trend
 */
import { api } from '../../api-client.js';
import { renderLineChart } from '../shared/charts.js';
import { renderLoading, renderApiError, pageLayout, statCard, pct } from '../shared/ui.js';

type DataPoint = { playedAt: string; accuracy: number; rollingAverage: number };
type Milestone = { threshold: number; playedAt: string };
type TrendReport = {
  dataPoints: DataPoint[];
  slope: number;
  trend: 'improving' | 'stable' | 'declining';
  milestones: Milestone[];
};

export async function renderAccuracyTrend(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading accuracy trend…');

  let data: TrendReport;
  try {
    data = (await api.accuracyTrend()) as TrendReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const trendEmoji =
    data.trend === 'improving' ? '📈' : data.trend === 'declining' ? '📉' : '➡️';

  const milestoneItems = data.milestones
    .map((m) => `<li>First time ≥ ${pct(m.threshold)} — ${new Date(m.playedAt).toLocaleDateString()}</li>`)
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('Total Sessions', data.dataPoints.length)}
      ${statCard('Trend', `${trendEmoji} ${data.trend}`)}
      ${statCard('Slope', (data.slope * 100).toFixed(3) + '% / session')}
    </div>

    <div class="card">
      <h2>Accuracy Over Time</h2>
      ${data.dataPoints.length === 0 ? '<p>No data yet. Play some games first!</p>' : '<div id="trend-chart"></div>'}
    </div>

    ${milestoneItems ? `<div class="card"><h2>Milestones</h2><ul>${milestoneItems}</ul></div>` : ''}
  `;

  app.innerHTML = pageLayout('#/player/trend', 'Accuracy Trend', content);

  if (data.dataPoints.length > 0) {
    const chart = document.getElementById('trend-chart');
    if (chart) {
      renderLineChart(
        chart,
        [
          { values: data.dataPoints.map((p) => p.accuracy), color: '#3b82f6', label: 'Accuracy' },
          { values: data.dataPoints.map((p) => p.rollingAverage), color: '#f59e0b', label: '5-session avg' },
        ],
        {
          labels: data.dataPoints.map((p) => new Date(p.playedAt).toLocaleDateString()),
          yMin: 0,
          yMax: 1,
        },
      );
    }
  }
}
