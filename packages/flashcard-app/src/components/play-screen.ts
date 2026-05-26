/**
 * Play Screen — The main flashcard experience.
 * Implements the Modified Leitner System (3-box) entirely client-side.
 *
 * Flow:
 *   question text + all answer options (hidden) → "Show Answer"
 *   → correct answers highlighted, wrong ones dimmed + Yes/No buttons
 *   Yes: move card up a box (or graduate from box 3)
 *   No: move card back to box 1 (shuffle back in)
 *   When all cards graduated → navigate to summary
 */
import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { state } from '../state';
import { router } from '../router';
import { LeitnerEngine } from '../leitner';
import type { FlashCard } from '../leitner';
import type { FlashcardSessionState } from '../api-client';

type Phase = 'loading' | 'question' | 'answer' | 'complete';

// Letter labels for answers: A, B, C, D, E, F
const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export class FlashcardPlayScreen extends BaseComponent {
  private sessionId: string = '';
  private sessionState: FlashcardSessionState | null = null;
  private engine: LeitnerEngine | null = null;
  private currentCard: FlashCard | null = null;
  private phase: Phase = 'loading';
  private error: string | null = null;

  protected async onMount(): Promise<void> {
    this.injectStyles();

    const hash = window.location.hash;
    const match = hash.match(/#\/play\/([^/?]+)/);
    this.sessionId = match ? decodeURIComponent(match[1]!) : (state.sessionId || '');

    if (!this.sessionId) {
      router.navigate('/');
      return;
    }

    await this.loadSession();
  }

  private injectStyles(): void {
    if (document.getElementById('flashcard-play-styles')) return;
    const style = document.createElement('style');
    style.id = 'flashcard-play-styles';
    style.textContent = `
      /* Full-viewport layout — pinned to viewport, works on all screen sizes */
      .fc-play-screen {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-secondary);
        padding: var(--spacing-sm);
        box-sizing: border-box;
        overflow: hidden;
        /* Wide layout: centered, capped at 1000px — fills screen on phones */
        max-width: 1000px;
        width: 100%;
        margin: 0 auto;
        left: 50%;
        transform: translateX(-50%);
      }

      /* ── Progress bar ─────────────────────────────── */
      .fc-progress-bar {
        background: var(--color-bg);
        border-radius: var(--radius-md);
        padding: 0.625rem var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
        box-shadow: var(--shadow-sm);
        flex-shrink: 0;
      }

      .fc-progress-stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.375rem;
        font-size: var(--font-size-sm);
        font-weight: 500;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .fc-stat-learning  { color: #6b7280; }
      .fc-stat-reviewing { color: #d97706; }
      .fc-stat-mastering { color: #2563eb; }
      .fc-stat-mastered  { color: var(--color-success); }

      .fc-progress-track {
        display: flex;
        height: 8px;
        border-radius: var(--radius-full);
        overflow: hidden;
        background: var(--color-border);
      }

      .fc-seg { height: 100%; transition: width var(--transition-slow); }
      .fc-seg-learning  { background: #9ca3af; }
      .fc-seg-reviewing { background: #f59e0b; }
      .fc-seg-mastering { background: #3b82f6; }
      .fc-seg-mastered  { background: var(--color-success); }

      /* ── Question card ─────────────────────────────── */
      .fc-question-card {
        background: var(--color-bg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-md) var(--spacing-md) var(--spacing-sm);
        flex-shrink: 0;
        margin-bottom: var(--spacing-xs);
      }

      .fc-question-meta {
        font-size: var(--font-size-sm);
        color: var(--color-text-light);
        text-align: center;
        margin-bottom: 0.375rem;
        font-weight: 500;
      }

      .fc-question-text {
        font-size: clamp(1.05rem, 3vw, 1.75rem);
        font-weight: 700;
        line-height: 1.35;
        text-align: center;
        color: var(--color-text);
      }

      /* ── Answers grid ────────────────────────────── */
      .fc-answers-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xs);
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        margin-bottom: var(--spacing-xs);
        align-content: start;
      }

      /* Single answer: full width */
      .fc-answers-grid.fc-single { grid-template-columns: 1fr; }

      /* 3 answers: last spans full width */
      .fc-answers-grid:has(.fc-answer-card:nth-child(3):last-child) .fc-answer-card:last-child {
        grid-column: 1 / -1;
      }

      .fc-answer-card {
        position: relative;
        background: var(--color-bg);
        border: 2px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 3.5rem;
        min-height: 60px;
        display: flex;
        align-items: center;
        box-shadow: var(--shadow-sm);
        transition: background var(--transition-base), border-color var(--transition-base);
      }

      .fc-answer-card.revealed-correct {
        background: #d1fae5;
        border-color: var(--color-success);
        animation: fc-pulse-correct 0.45s ease;
      }

      .fc-answer-card.revealed-wrong {
        background: #fef2f2;
        border-color: #fca5a5;
        opacity: 0.6;
      }

      @keyframes fc-pulse-correct {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.03); }
      }

      .fc-answer-label {
        position: absolute;
        left: 0.65rem;
        top: 50%;
        transform: translateY(-50%);
        width: 2rem;
        height: 2rem;
        background: var(--color-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      .fc-answer-card.revealed-correct .fc-answer-label { background: var(--color-success); }
      .fc-answer-card.revealed-wrong  .fc-answer-label { background: #ef4444; }

      .fc-answer-text {
        font-size: clamp(0.82rem, 1.8vw, 1rem);
        font-weight: 500;
        color: var(--color-text);
        line-height: 1.3;
      }

      .fc-answer-card.revealed-correct .fc-answer-text {
        font-weight: 700;
        color: #065f46;
      }

      .fc-correct-tick {
        position: absolute;
        right: 0.65rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-success);
        font-size: 1.2rem;
        font-weight: 700;
      }

      /* ── Actions (always at bottom) ─────────────── */
      .fc-actions {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        /* Fixed-height container so layout doesn't shift between phases */
        min-height: calc(var(--spacing-md) * 2 + var(--font-size-lg) + var(--spacing-xs) * 2 + var(--spacing-xs));
        justify-content: flex-end;
      }

      .fc-show-btn {
        width: 100%;
        padding: var(--spacing-md);
        font-size: var(--font-size-lg);
        font-weight: 700;
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: opacity var(--transition-fast), transform var(--transition-fast);
        box-shadow: var(--shadow-md);
      }

      .fc-show-btn:hover { opacity: 0.92; transform: translateY(-1px); }
      .fc-show-btn:active { transform: translateY(0); }

      .fc-knew-prompt {
        font-size: var(--font-size-base);
        text-align: center;
        color: var(--color-text-light);
        font-weight: 500;
      }

      .fc-verdict-btns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
      }

      .fc-no-btn, .fc-yes-btn {
        padding: var(--spacing-md);
        font-size: var(--font-size-lg);
        font-weight: 700;
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: opacity var(--transition-fast), transform var(--transition-fast);
        box-shadow: var(--shadow-md);
        color: white;
      }

      .fc-no-btn  { background: var(--color-error); }
      .fc-yes-btn { background: var(--color-success); }

      .fc-no-btn:hover, .fc-yes-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      .fc-no-btn:active, .fc-yes-btn:active { transform: translateY(0); }

      @media (max-width: 400px) {
        .fc-answer-card { padding-left: 3rem; min-height: 52px; }
        .fc-answer-label { width: 1.75rem; height: 1.75rem; font-size: 0.78rem; }
      }
    `;
    document.head.appendChild(style);
  }

  private async loadSession(): Promise<void> {
    this.phase = 'loading';
    this.render();

    try {
      this.sessionState = await api.getFlashcardState(this.sessionId);

      const flashCards: FlashCard[] = this.sessionState.questions.map((q) => ({
        id: q.id,
        text: q.text,
        answer: q.answers
          .filter((a) => q.correctAnswerIds.includes(a.id))
          .map((a) => a.text)
          .join(' / '),
        correctAnswerIds: q.correctAnswerIds,
        allAnswers: q.answers,
      }));

      this.engine = new LeitnerEngine(flashCards);
      this.advance();
    } catch {
      this.error = 'Failed to load flashcard session. Please check the URL and try again.';
      this.phase = 'loading';
      this.render();
    }
  }

  private advance(): void {
    if (!this.engine) return;

    if (this.engine.isComplete()) {
      this.phase = 'complete';
      this.render();
      setTimeout(() => {
        try {
          sessionStorage.setItem('qz-flashcard-stats', JSON.stringify(this.engine!.getStats()));
          sessionStorage.setItem('qz-flashcard-bank-name', this.sessionState?.questionBankName || '');
        } catch { /* ignore */ }
        router.navigate('/summary');
      }, 1200);
      return;
    }

    this.currentCard = this.engine.getNextCard();
    if (!this.currentCard) {
      this.phase = 'complete';
      this.render();
      return;
    }

    this.phase = 'question';
    this.render();
  }

  protected render(): void {
    if (this.error) {
      this.setContent(`
        <div class="screen"><div class="container"><div class="card">
          <p class="error-message">${this.error}</p>
          <button class="btn-secondary" id="back-btn" style="margin-top: var(--spacing-md);">← Back</button>
        </div></div></div>
      `);
      this.qs('#back-btn')?.addEventListener('click', () => router.navigate('/'));
      return;
    }

    if (this.phase === 'loading') {
      this.setContent(`
        <div class="screen"><div class="container">
          <div class="loading-container"><div class="spinner"></div><p>Loading flashcards...</p></div>
        </div></div>
      `);
      return;
    }

    if (this.phase === 'complete') {
      this.setContent(`
        <div class="screen"><div class="container"><div class="card text-center">
          <h2>All cards mastered!</h2>
          <p class="text-secondary">Loading your results...</p>
        </div></div></div>
      `);
      return;
    }

    const card = this.currentCard!;
    const total = this.engine?.getTotalCount() ?? 0;
    const dist = this.engine?.getBoxDistribution() ?? { box1: 0, box2: 0, box3: 0, graduated: 0 };
    const active = this.engine?.getActiveCount() ?? 0;
    const revealed = this.phase === 'answer';
    const isSingle = card.allAnswers.length === 1;

    this.setContent(`
      <div class="fc-play-screen">
        ${this.renderProgressBar(dist, total)}

        <div class="fc-question-card">
          <div class="fc-question-meta">${active} card${active !== 1 ? 's' : ''} remaining</div>
          <div class="fc-question-text">${this.escapeHtml(card.text)}</div>
        </div>

        <div class="fc-answers-grid${isSingle ? ' fc-single' : ''}">
          ${card.allAnswers.map((answer, i) => this.renderAnswerCard(answer, i, card.correctAnswerIds, revealed)).join('')}
        </div>

        <div class="fc-actions">
          ${revealed ? `
            <div class="fc-knew-prompt">Did you know this?</div>
            <div class="fc-verdict-btns">
              <button class="fc-no-btn"  id="no-btn">✗ No</button>
              <button class="fc-yes-btn" id="yes-btn">✓ Yes</button>
            </div>
          ` : `
            <button class="fc-show-btn" id="show-answer-btn">Show Answer</button>
          `}
        </div>
      </div>
    `);

    if (revealed) {
      this.qs('#yes-btn')?.addEventListener('click', () => {
        this.engine?.markCard(card.id, true);
        this.advance();
      });
      this.qs('#no-btn')?.addEventListener('click', () => {
        this.engine?.markCard(card.id, false);
        this.advance();
      });
    } else {
      this.qs('#show-answer-btn')?.addEventListener('click', () => {
        this.phase = 'answer';
        this.render();
      });
    }
  }

  private renderAnswerCard(
    answer: { id: string; text: string },
    index: number,
    correctIds: string[],
    revealed: boolean,
  ): string {
    const label = ANSWER_LABELS[index] ?? String(index + 1);
    const isCorrect = correctIds.includes(answer.id);
    let cardClass = 'fc-answer-card';
    if (revealed) cardClass += isCorrect ? ' revealed-correct' : ' revealed-wrong';

    return `
      <div class="${cardClass}">
        <div class="fc-answer-label">${label}</div>
        <div class="fc-answer-text">${this.escapeHtml(answer.text)}</div>
        ${revealed && isCorrect ? '<div class="fc-correct-tick">✓</div>' : ''}
      </div>
    `;
  }

  private renderProgressBar(
    dist: { box1: number; box2: number; box3: number; graduated: number },
    total: number,
  ): string {
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    return `
      <div class="fc-progress-bar">
        <div class="fc-progress-stats">
          <span class="fc-stat-learning">Learning: ${dist.box1}</span>
          <span class="fc-stat-reviewing">Reviewing: ${dist.box2}</span>
          <span class="fc-stat-mastering">Mastering: ${dist.box3}</span>
          <span class="fc-stat-mastered">Done: ${dist.graduated}/${total}</span>
        </div>
        <div class="fc-progress-track">
          <div class="fc-seg fc-seg-learning"  style="width: ${pct(dist.box1)}%"></div>
          <div class="fc-seg fc-seg-reviewing" style="width: ${pct(dist.box2)}%"></div>
          <div class="fc-seg fc-seg-mastering" style="width: ${pct(dist.box3)}%"></div>
          <div class="fc-seg fc-seg-mastered"  style="width: ${pct(dist.graduated)}%"></div>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

customElements.define('flashcard-play-screen', FlashcardPlayScreen);
