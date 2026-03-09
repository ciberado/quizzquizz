/**
 * Player: Response-Time Profile
 * Route: #/player/speed
 */
import { api } from '../../api-client.js';
import { renderScatterPlot } from '../shared/charts.js';
import { renderLoading, renderApiError, pageLayout, msToSeconds, statCard } from '../shared/ui.js';

type ScatterPoint = {
  questionId: string;
  averageResponseMs: number;
  accuracy: number;
  quadrant: 'mastered' | 'hesitant' | 'guessing' | 'confused';
};
type DiffCurve = { difficulty: string; averageResponseMs: number; questionCount: number };
type ProfileReport = {
  scatterPoints: ScatterPoint[];
  difficultyByResponseTime: DiffCurve[];
  medianResponseMs: number;
  medianAccuracy: number;
};

const QUADRANT_COLORS: Record<string, string> = {
  mastered: '#10b981',
  hesitant: '#3b82f6',
  guessing: '#f59e0b',
  confused: '#ef4444',
};

export async function renderResponseProfile(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading response profile…');

  let data: ProfileReport;
  try {
    data = (await api.responseProfile()) as ProfileReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const quadrantCounts = { mastered: 0, hesitant: 0, guessing: 0, confused: 0 };
  for (const p of data.scatterPoints) {
    if (p.quadrant in quadrantCounts) quadrantCounts[p.quadrant]++;
  }

  const diffRows = data.difficultyByResponseTime
    .map((d) => `<tr><td>${d.difficulty}</td><td>${msToSeconds(d.averageResponseMs)}</td><td>${d.questionCount}</td></tr>`)
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('Median Response Time', msToSeconds(data.medianResponseMs))}
      ${statCard('✅ Mastered', quadrantCounts.mastered)}
      ${statCard('🤔 Hesitant', quadrantCounts.hesitant)}
      ${statCard('🎲 Guessing', quadrantCounts.guessing)}
      ${statCard('😕 Confused', quadrantCounts.confused)}
    </div>

    <div class="card">
      <h2>Speed vs. Accuracy</h2>
      <p class="hint">x = response time, y = accuracy. Quadrants based on your median values.</p>
      <div id="scatter-plot"></div>
      <div class="legend">
        <span class="legend-dot" style="background:#10b981"></span> Mastered (fast + correct)
        <span class="legend-dot" style="background:#3b82f6"></span> Hesitant (slow + correct)
        <span class="legend-dot" style="background:#f59e0b"></span> Guessing (fast + wrong)
        <span class="legend-dot" style="background:#ef4444"></span> Confused (slow + wrong)
      </div>
    </div>

    ${data.difficultyByResponseTime.length > 0 ? `
    <div class="card">
      <h2>Response Time by Difficulty</h2>
      <table class="data-table">
        <thead><tr><th>Difficulty</th><th>Avg Response Time</th><th>Questions</th></tr></thead>
        <tbody>${diffRows}</tbody>
      </table>
    </div>` : ''}
  `;

  app.innerHTML = pageLayout('#/player/speed', 'Response-Time Profile', content);

  if (data.scatterPoints.length > 0) {
    const scatter = document.getElementById('scatter-plot');
    if (scatter) {
      renderScatterPlot(
        scatter,
        data.scatterPoints.map((p) => ({
          x: p.averageResponseMs / 1000,
          y: p.accuracy,
          color: QUADRANT_COLORS[p.quadrant] ?? '#3b82f6',
          label: `${p.questionId.slice(0, 8)} — ${(p.accuracy * 100).toFixed(0)}% in ${msToSeconds(p.averageResponseMs)}`,
        })),
        {
          xLabel: 'Avg Response Time (s)',
          yLabel: 'Accuracy',
          yMin: 0,
          yMax: 1,
          quadrantLabels: ['Hesitant', 'Mastered', 'Confused', 'Guessing'],
        },
      );
    }
  }
}
