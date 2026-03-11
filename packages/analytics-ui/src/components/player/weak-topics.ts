/**
 * Player: Topics Overview
 * Route: #/player/topics
 * Shows performance per topic across all played quizzes.
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct } from '../shared/ui.js';
import { renderBarChart } from '../shared/charts.js';

type Topic = { topic: string; accuracy: number; timesAnswered: number; timesCorrect: number; questionCount: number };
type WeakTopicsReport = { topics: Topic[]; totalQuestionsAnalysed: number; bankId: string | null };

export async function renderWeakTopics(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading topic analysis…');

  let data: WeakTopicsReport;
  try {
    data = (await api.weakTopics()) as WeakTopicsReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const rows = data.topics
    .map((t) => {
      const accPct = parseFloat((t.accuracy * 100).toFixed(1));
      const color = accPct < 40 ? '#ef4444' : accPct < 70 ? '#f59e0b' : '#10b981';
      return `
        <tr>
          <td>${t.topic}</td>
          <td style="color:${color};font-weight:bold">${pct(t.accuracy)}</td>
          <td>${t.timesAnswered}</td>
          <td>${t.timesCorrect}</td>
          <td>${t.questionCount}</td>
        </tr>`;
    })
    .join('');

  const content = `
    <p class="hint">Across all quizzes — questions analysed: ${data.totalQuestionsAnalysed}. Topics sorted weakest first.</p>

    ${data.topics.length === 0 ? '' : `
    <div class="card">
      <h2>Accuracy by Topic</h2>
      <div id="topics-bar-chart"></div>
    </div>`}

    <div class="card">
      <h2>Topic Details</h2>
      ${data.topics.length === 0
        ? '<p>No topic data yet. Play some games first!</p>'
        : `<table class="data-table sortable">
            <thead><tr><th>Topic</th><th>Accuracy</th><th>Times Answered</th><th>Correct</th><th>Questions</th></tr></thead>
            <tbody>${rows}</tbody>
           </table>`}
    </div>
  `;

  app.innerHTML = pageLayout('#/player/topics', 'Topics Overview', content);

  // Render bar chart after DOM update
  if (data.topics.length > 0) {
    const container = document.getElementById('topics-bar-chart');
    if (container) {
      const items = data.topics.map((t) => ({
        label: t.topic,
        value: t.accuracy,
        color: t.accuracy < 0.4 ? '#ef4444' : t.accuracy < 0.7 ? '#f59e0b' : '#10b981',
      }));
      renderBarChart(container, items, { maxValue: 1 });
    }
  }
}
