/**
 * Player: Practice Recommendations
 * Route: #/player/practice
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct, statCard } from '../shared/ui.js';

type PracticeItem = {
  questionId: string;
  questionBankId: string;
  practiceWeight: number;
  timesAnswered: number;
  accuracy: number;
  isMastered: boolean;
};
type PracticeReport = {
  priorityQueue: PracticeItem[];
  masteredCount: number;
  totalTracked: number;
  recommendedSessionSize: number;
};

export async function renderPractice(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading practice recommendations…');

  let data: PracticeReport;
  try {
    data = (await api.practice()) as PracticeReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const rows = data.priorityQueue
    .map((item) => {
      const urgency = item.practiceWeight > 2.0 ? '🔴' : item.practiceWeight > 1.2 ? '🟡' : '🟢';
      return `
        <tr>
          <td>${urgency}</td>
          <td class="mono">${item.questionId.slice(0, 16)}…</td>
          <td>${item.questionBankId.replace(/^.*\//, '')}</td>
          <td>${pct(item.accuracy)}</td>
          <td>${item.timesAnswered}</td>
          <td>${item.practiceWeight.toFixed(2)}</td>
        </tr>`;
    })
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('To Review', data.priorityQueue.length)}
      ${statCard('Mastered', data.masteredCount)}
      ${statCard('Total Tracked', data.totalTracked)}
      ${statCard('Recommended Session', data.recommendedSessionSize + ' questions')}
    </div>

    <div class="card">
      <h2>Priority Practice Queue</h2>
      <p class="hint">🔴 High priority &nbsp; 🟡 Medium &nbsp; 🟢 Low</p>
      ${data.priorityQueue.length === 0
        ? '<p>🎉 Nothing to practice! Keep playing to discover areas to improve.</p>'
        : `<table class="data-table">
            <thead><tr><th>Priority</th><th>Question ID</th><th>Bank</th><th>Your Accuracy</th><th>Times Answered</th><th>Practice Weight</th></tr></thead>
            <tbody>${rows}</tbody>
           </table>`}
    </div>
  `;

  app.innerHTML = pageLayout('#/player/practice', 'Practice Recommendations', content);
}
