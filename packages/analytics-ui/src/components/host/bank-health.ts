/**
 * Host: Bank Health Dashboard
 * Route: #/host/banks/:id/health
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct, statCard } from '../shared/ui.js';

type QuestionHealth = {
  questionId: string;
  accuracy: number;
  timesAppeared: number;
  timesAnswered: number;
  empiricalDifficulty: number | null;
  isStale: boolean;
  dominantDistractors: string[];
  compositeScore: number;
  hasInsufficientData: boolean;
};

type BankHealthReport = {
  questionBankId: string;
  totalQuestions: number;
  questionsWithData: number;
  averageAccuracy: number;
  difficultyMismatchCount: number;
  staleCount: number;
  questions: QuestionHealth[];
};

export async function renderBankHealth(
  app: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  const bankId = params['id'] ?? '';
  renderLoading(app, 'Loading bank health…');

  let report: BankHealthReport;
  try {
    report = (await api.bankHealth(bankId)) as BankHealthReport;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const questionRows = report.questions
    .slice(0, 50)
    .map(
      (q) => `
      <tr class="${q.isStale ? 'stale' : ''}">
        <td class="mono">${q.questionId.slice(0, 12)}…</td>
        <td>${q.hasInsufficientData ? '—' : pct(q.accuracy)}</td>
        <td>${q.timesAnswered}</td>
        <td>${q.empiricalDifficulty !== null ? q.empiricalDifficulty.toFixed(2) : '—'}</td>
        <td>${q.dominantDistractors.length > 0 ? '⚠ ' + q.dominantDistractors.length : '—'}</td>
        <td>${q.isStale ? '⏰ Stale' : ''}</td>
        <td>${(q.compositeScore * 100).toFixed(0)}</td>
      </tr>`,
    )
    .join('');

  const content = `
    <div class="card-grid">
      ${statCard('Total Questions', report.totalQuestions)}
      ${statCard('Questions with Data', report.questionsWithData)}
      ${statCard('Average Accuracy', pct(report.averageAccuracy))}
      ${statCard('Difficulty Mismatches', report.difficultyMismatchCount)}
      ${statCard('Stale Questions', report.staleCount)}
    </div>

    ${report.staleCount > 0 ? `<div class="alert alert-warning">⏰ ${report.staleCount} question(s) may be memorised by players — consider refreshing them.</div>` : ''}
    ${report.difficultyMismatchCount > 0 ? `<div class="alert alert-info">📊 ${report.difficultyMismatchCount} question(s) have empirical difficulty that doesn't match declared difficulty.</div>` : ''}

    <div class="card">
      <h2>Question Quality Rankings</h2>
      <p class="hint">Sorted by composite quality score (higher = better). Top 50 shown.</p>
      <table class="data-table">
        <thead><tr><th>Question ID</th><th>Accuracy</th><th>Times Answered</th><th>Empirical Difficulty</th><th>Dom. Distractors</th><th>Status</th><th>Quality Score</th></tr></thead>
        <tbody>${questionRows}</tbody>
      </table>
    </div>
  `;

  app.innerHTML = pageLayout(`#/host/banks/${bankId}/health`, 'Bank Health Dashboard', content);
}
