/**
 * Host: Session Report screen
 * Route: #/host/sessions/:id
 */
import { api } from '../../api-client.js';
import { renderLineChart, renderBarChart } from '../shared/charts.js';
import { renderLoading, renderApiError, pct, msToSeconds, pageLayout, statCard } from '../shared/ui.js';

export async function renderSessionReport(
  app: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  const sessionId = params['id'] ?? '';
  renderLoading(app, 'Loading session report…');

  type PerQ = {
    questionId: string;
    accuracy: number;
    correctCount: number;
    answeredCount: number;
    unansweredCount: number;
    answerOptionCounts: Record<string, number>;
    responseTimePercentiles: { p25: number; p50: number; p75: number; p95: number };
  };
  type Report = {
    sessionId: string;
    totalPlayers: number;
    perQuestion: PerQ[];
    playerSpread: { min: number; max: number; median: number; mean: number; stdDev: number; histogram: { min: number; max: number; count: number }[] };
  };

  let report: Report;
  try {
    report = (await api.sessionReport(sessionId)) as Report;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const questionRows = report.perQuestion
    .map(
      (q, i) => `
      <tr>
        <td>Q${i + 1}</td>
        <td>${pct(q.accuracy)}</td>
        <td>${q.correctCount}/${q.answeredCount}</td>
        <td>${q.unansweredCount}</td>
        <td>${msToSeconds(q.responseTimePercentiles.p50)} (p50)</td>
        <td>${msToSeconds(q.responseTimePercentiles.p95)} (p95)</td>
      </tr>`,
    )
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('Total Players', report.totalPlayers)}
      ${statCard('Questions', report.perQuestion.length)}
      ${statCard('Score Min', report.playerSpread.min)}
      ${statCard('Score Max', report.playerSpread.max)}
      ${statCard('Score Median', report.playerSpread.median.toFixed(0))}
      ${statCard('Score Std Dev', report.playerSpread.stdDev.toFixed(0))}
    </div>

    <div class="card">
      <h2>Per-Question Accuracy</h2>
      <div id="accuracy-chart"></div>
    </div>

    <div class="card">
      <h2>Question Details</h2>
      <table class="data-table">
        <thead><tr><th>#</th><th>Accuracy</th><th>Correct</th><th>Unanswered</th><th>Median Time</th><th>p95 Time</th></tr></thead>
        <tbody>${questionRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>Player Score Distribution</h2>
      <div id="score-histogram"></div>
    </div>
  `;

  app.innerHTML = pageLayout(`#/host/sessions/${sessionId}`, `Session Report`, content);

  // Render charts
  const accChart = document.getElementById('accuracy-chart');
  if (accChart) {
    renderLineChart(accChart, [
      {
        values: report.perQuestion.map((q) => q.accuracy),
        color: '#3b82f6',
        label: 'Accuracy',
      },
    ], {
      labels: report.perQuestion.map((_, i) => `Q${i + 1}`),
      yMin: 0,
      yMax: 1,
    });
  }

  const histogramChart = document.getElementById('score-histogram');
  if (histogramChart) {
    renderBarChart(histogramChart, report.playerSpread.histogram.map((b, i) => ({
      label: `${b.min.toFixed(0)}–${b.max.toFixed(0)}`,
      value: b.count,
      color: `hsl(${220 + i * 8}, 70%, 55%)`,
    })));
  }
}
