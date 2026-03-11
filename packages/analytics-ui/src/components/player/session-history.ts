/**
 * Player: Session History
 * Route: #/player/sessions
 * Lists all sessions the authenticated player has participated in.
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, pct, msToSeconds } from '../shared/ui.js';

type SessionSummary = {
  sessionId: string;
  nickname: string;
  questionBankId: string | null;
  questionBankName: string | null;
  finalScore: number;
  finalRank: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  averageTime: number;
  playedAt: string;
};

type SessionHistory = { sessions: SessionSummary[] };

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.7) return '#10b981';
  if (accuracy >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export async function renderSessionHistory(app: HTMLElement): Promise<void> {
  renderLoading(app, 'Loading session history…');

  let data: SessionHistory;
  try {
    data = (await api.sessionHistory()) as SessionHistory;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const { sessions } = data;

  const rows = sessions
    .map((s) => {
      const date = new Date(s.playedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const color = accuracyColor(s.accuracy);
      const bankLabel = s.questionBankName ?? s.questionBankId ?? '—';
      return `
        <tr class="clickable-row" onclick="window.location.hash='#/player/sessions/${encodeURIComponent(s.sessionId)}'">
          <td>${date}</td>
          <td class="quiz-name">${bankLabel}</td>
          <td class="monospace">${s.nickname}</td>
          <td class="score-cell">${s.finalScore.toLocaleString()}</td>
          <td>#${s.finalRank}</td>
          <td style="color:${color};font-weight:600">${pct(s.accuracy)}</td>
          <td>${s.correctAnswers} / ${s.totalQuestions}</td>
          <td>${msToSeconds(s.averageTime)}</td>
          <td><a href="#/player/sessions/${encodeURIComponent(s.sessionId)}" class="detail-link">View →</a></td>
        </tr>`;
    })
    .join('');

  const content = `
    ${sessions.length > 0 ? `<p class="hint">${sessions.length} session${sessions.length > 1 ? 's' : ''} found. Click a row to see per-question details.</p>` : ''}

    <div class="card">
      <h2>All Played Sessions</h2>
      ${
        sessions.length === 0
          ? '<p>No sessions yet. Play your first game!</p>'
          : `<div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Quiz</th>
                    <th>Nickname</th>
                    <th>Score</th>
                    <th>Rank</th>
                    <th>Accuracy</th>
                    <th>Correct</th>
                    <th>Avg Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`
      }
    </div>
  `;

  app.innerHTML = pageLayout('#/player/sessions', 'Session History', content);
}
