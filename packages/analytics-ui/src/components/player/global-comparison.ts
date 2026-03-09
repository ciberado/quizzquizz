/**
 * Player: Global Comparison
 * Route: #/player/compare
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct, statCard } from '../shared/ui.js';

type QuestionDelta = {
  questionId: string;
  playerAccuracy: number;
  globalAccuracy: number;
  delta: number;
};
type ComparisonReport = {
  playerOverallAccuracy: number;
  globalOverallAccuracy: number;
  percentileRank: number;
  questions: QuestionDelta[];
  outperformingCount: number;
  underperformingCount: number;
};

export function renderGlobalComparison(app: HTMLElement, _params: Record<string, string>): void {
  const hash = window.location.hash;
  const bankId = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '').get('bankId') ?? '';

  if (!bankId) {
    // Show bank selector
    app.innerHTML = pageLayout('#/player/compare', 'Global Comparison', `
      <div class="card">
        <h2>Select a Question Bank</h2>
        <form id="bank-form">
          <label>Bank ID <input type="text" name="bankId" placeholder="e.g. science/physics" required /></label>
          <button type="submit">View Comparison</button>
        </form>
      </div>
      <div id="comparison-result"></div>
    `);
    document.getElementById('bank-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      const id = (fd.get('bankId') as string).trim();
      window.location.hash = `#/player/compare?bankId=${encodeURIComponent(id)}`;
    });
    return;
  }

  renderLoading(app, 'Loading comparison…');

  api.globalComparison(bankId).then((rawData) => {
    const data = rawData as ComparisonReport;

    const rows = data.questions.slice(0, 30)
      .map((q) => {
        const deltaColor = q.delta > 0.05 ? '#10b981' : q.delta < -0.05 ? '#ef4444' : '#94a3b8';
        return `
          <tr>
            <td class="mono">${q.questionId.slice(0, 14)}…</td>
            <td>${pct(q.playerAccuracy)}</td>
            <td>${pct(q.globalAccuracy)}</td>
            <td style="color:${deltaColor};font-weight:bold">${q.delta > 0 ? '+' : ''}${(q.delta * 100).toFixed(1)}%</td>
          </tr>`;
      }).join('');

    const content = `
      <div class="card-grid">
        ${statCard('Your Accuracy', pct(data.playerOverallAccuracy))}
        ${statCard('Global Accuracy', pct(data.globalOverallAccuracy))}
        ${statCard('Percentile Rank', `~${data.percentileRank}th`)}
        ${statCard('Outperforming', data.outperformingCount + ' questions')}
        ${statCard('Underperforming', data.underperformingCount + ' questions')}
      </div>

      <div class="card">
        <h2>Per-Question Delta (You − Global)</h2>
        <p class="hint">Bank: ${bankId} — Top 30 questions shown.</p>
        ${data.questions.length === 0
          ? '<p>No comparable data for this bank yet.</p>'
          : `<table class="data-table">
              <thead><tr><th>Question</th><th>Your Accuracy</th><th>Global Accuracy</th><th>Delta</th></tr></thead>
              <tbody>${rows}</tbody>
             </table>`}
      </div>
    `;

    app.innerHTML = pageLayout('#/player/compare', 'Global Comparison', content);
  }).catch((err: unknown) => renderApiError(app, err));
}
