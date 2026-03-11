/**
 * Player: Session Detail
 * Route: #/player/sessions/:id
 * Shows per-question breakdown and topic summary for a single played session.
 */
import { api } from '../../api-client.js';
import { renderLoading, renderApiError, pageLayout, statCard, pct, msToSeconds } from '../shared/ui.js';
import { renderBarChart } from '../shared/charts.js';

type QuestionDetail = {
  questionId: string;
  questionText: string | null;
  topics: string[];
  isCorrect: boolean;
  score: number;
  responseTimeMs: number;
  selectedAnswerIds: string[];
  correctAnswerIds: string[];
};

type TopicBreakdown = {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
};

type SessionDetail = {
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
  questions: QuestionDetail[] | null;
  topicsInSession: TopicBreakdown[];
};

function topicColor(accuracy: number): string {
  if (accuracy >= 0.7) return '#10b981';
  if (accuracy >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export async function renderSessionDetail(app: HTMLElement, params: Record<string, string>): Promise<void> {
  const sessionId = params['id'] ?? '';
  renderLoading(app, 'Loading session details…');

  let data: SessionDetail;
  try {
    data = (await api.sessionDetail(sessionId)) as SessionDetail;
  } catch (e) {
    renderApiError(app, e);
    return;
  }

  const date = new Date(data.playedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bankLabel = data.questionBankName ?? data.questionBankId ?? 'Unknown Quiz';

  // Per-question rows
  let questionsSection = '';
  if (data.questions && data.questions.length > 0) {
    const rows = data.questions
      .map((q, i) => {
        const icon = q.isCorrect ? '✅' : '❌';
        const topicsStr = q.topics.length > 0
          ? q.topics.map((t) => `<span class="topic-tag">${t}</span>`).join(' ')
          : '<span class="muted">—</span>';
        const questionLabel = q.questionText
          ? `<span class="question-text">${q.questionText}</span>`
          : `<span class="muted">Q${i + 1}</span>`;
        return `
          <tr>
            <td class="text-center">${icon}</td>
            <td>${questionLabel}<br><small>${topicsStr}</small></td>
            <td class="text-right">${q.score.toLocaleString()}</td>
            <td class="text-right">${msToSeconds(q.responseTimeMs)}</td>
          </tr>`;
      })
      .join('');

    questionsSection = `
      <div class="card">
        <h2>Question Breakdown</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px"></th>
              <th>Question & Topics</th>
              <th class="text-right">Points</th>
              <th class="text-right">Response Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } else {
    questionsSection = `
      <div class="card">
        <h2>Question Breakdown</h2>
        <p class="hint">Per-question data is no longer available — session records are cleaned up after they expire.</p>
      </div>`;
  }

  // Topics section
  let topicsSection = '';
  if (data.topicsInSession.length > 0) {
    const topicItems = data.topicsInSession.map((t) => ({
      label: `${t.topic} (${t.correct}/${t.total})`,
      value: t.accuracy,
      color: topicColor(t.accuracy),
    }));

    topicsSection = `
      <div class="card">
        <h2>Topics in This Session</h2>
        <p class="hint">Accuracy per topic — sorted weakest first.</p>
        <div id="session-topics-chart"></div>
      </div>`;

    // Render chart after HTML is inserted
    setTimeout(() => {
      const container = document.getElementById('session-topics-chart');
      if (container) {
        renderBarChart(container, topicItems, { maxValue: 1 });
      }
    }, 0);
  }

  const content = `
    <div class="breadcrumb"><a href="#/player/sessions">← Session History</a></div>

    <p class="page-subtitle">${bankLabel} &nbsp;·&nbsp; ${date}</p>

    <div class="card-grid">
      ${statCard('Score', data.finalScore.toLocaleString())}
      ${statCard('Rank', '#' + data.finalRank)}
      ${statCard('Accuracy', pct(data.accuracy))}
      ${statCard('Correct', `${data.correctAnswers} / ${data.totalQuestions}`)}
      ${statCard('Avg Response', msToSeconds(data.averageTime))}
    </div>

    ${topicsSection}
    ${questionsSection}
  `;

  app.innerHTML = pageLayout('#/player/sessions', 'Session Detail', content);

  // Re-render bar chart after DOM update (chart needs mounted container)
  if (data.topicsInSession.length > 0) {
    const topicItems = data.topicsInSession.map((t) => ({
      label: `${t.topic} (${t.correct}/${t.total})`,
      value: t.accuracy,
      color: topicColor(t.accuracy),
    }));
    const container = document.getElementById('session-topics-chart');
    if (container) {
      renderBarChart(container, topicItems, { maxValue: 1 });
    }
  }
}
