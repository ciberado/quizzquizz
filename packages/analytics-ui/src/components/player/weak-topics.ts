/**
 * Player: Weak Topics
 * Route: #/player/topics
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct } from '../shared/ui.js';

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
    <p class="hint">Topics sorted weakest first. Questions analysed: ${data.totalQuestionsAnalysed}</p>

    <div class="card">
      <h2>Topic Accuracy Breakdown</h2>
      ${data.topics.length === 0
        ? '<p>No topic data yet. Play some games first!</p>'
        : `<table class="data-table sortable">
            <thead><tr><th>Topic</th><th>Accuracy</th><th>Times Answered</th><th>Correct</th><th>Questions</th></tr></thead>
            <tbody>${rows}</tbody>
           </table>`}
    </div>
  `;

  app.innerHTML = pageLayout('#/player/topics', 'Weak Topics', content);
}
