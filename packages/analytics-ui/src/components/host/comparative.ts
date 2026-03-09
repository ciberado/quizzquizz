/**
 * Host: Session Comparison
 * Route: #/host/sessions/compare
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct, statCard } from '../shared/ui.js';

type ComparativeReport = {
  sessionIdA: string;
  sessionIdB: string;
  totalPlayersA: number;
  totalPlayersB: number;
  questions: {
    questionId: string;
    accuracyA: number;
    accuracyB: number;
    delta: number;
    improved: boolean;
    regressed: boolean;
  }[];
  improvedCount: number;
  regressedCount: number;
  unchangedCount: number;
};

export function renderCompare(app: HTMLElement, _params: Record<string, string>): void {
  // Show a form to enter two session IDs
  const sessionHash = window.location.hash;
  const urlParams = new URLSearchParams(
    sessionHash.includes('?') ? sessionHash.split('?')[1] : '',
  );
  const sessionA = urlParams.get('sessionA') ?? '';
  const sessionB = urlParams.get('sessionB') ?? '';

  const form = `
    <div class="card">
      <h2>Compare Two Sessions</h2>
      <form id="compare-form" class="compare-form">
        <label>Session A ID <input type="text" name="sessionA" value="${sessionA}" placeholder="session-id-a" required /></label>
        <label>Session B ID <input type="text" name="sessionB" value="${sessionB}" placeholder="session-id-b" required /></label>
        <button type="submit">Compare</button>
      </form>
    </div>
    <div id="compare-result"></div>
  `;

  app.innerHTML = pageLayout('#/host/sessions/compare', 'Session Comparison', form);

  document.getElementById('compare-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const idA = (fd.get('sessionA') as string).trim();
    const idB = (fd.get('sessionB') as string).trim();
    const result = document.getElementById('compare-result')!;
    renderLoading(result, 'Comparing sessions…');

    let report: ComparativeReport;
    try {
      report = (await api.sessionCompare(idA, idB)) as ComparativeReport;
    } catch (err) {
      renderApiError(result, err);
      return;
    }

    const rows = report.questions
      .map(
        (q) => `
      <tr class="${q.improved ? 'improved' : q.regressed ? 'regressed' : ''}">
        <td class="mono">${q.questionId.slice(0, 12)}…</td>
        <td>${pct(q.accuracyA)}</td>
        <td>${pct(q.accuracyB)}</td>
        <td class="${q.delta > 0 ? 'positive' : q.delta < 0 ? 'negative' : ''}">
          ${q.delta > 0 ? '+' : ''}${(q.delta * 100).toFixed(1)}%
        </td>
        <td>${q.improved ? '✅ Better' : q.regressed ? '⬇ Worse' : '—'}</td>
      </tr>`,
      )
      .join('');

    result.innerHTML = `
      <div class="card-grid">
        ${statCard('Players (A)', report.totalPlayersA)}
        ${statCard('Players (B)', report.totalPlayersB)}
        ${statCard('Improved', report.improvedCount)}
        ${statCard('Regressed', report.regressedCount)}
        ${statCard('Unchanged', report.unchangedCount)}
      </div>
      <div class="card">
        <h2>Per-Question Delta (B − A)</h2>
        <table class="data-table">
          <thead><tr><th>Question</th><th>Accuracy A</th><th>Accuracy B</th><th>Delta</th><th>Change</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  });

  // Auto-submit if both IDs are already in URL
  if (sessionA && sessionB) {
    (document.getElementById('compare-form') as HTMLFormElement)?.requestSubmit();
  }
}
