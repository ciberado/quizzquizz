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
      .fc-play-screen {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
        background: var(--color-bg-secondary);
        padding: var(--spacing-sm);
        box-sizing: border-box;
      }

      /* Progress bar */
      .fc-progress-bar {
        background: var(--color-bg);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
        box-shadow: var(--shadow-sm);
        flex-shrink: 0;
      }

      .fc-progress-stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-text-light);
        font-weight: 500;
      }

      .fc-progress-stats .mastered { color: var(--color-success); }
      .fc-progress-stats .active   { color: var(--color-primary); }

      .fc-progress-track {
        background: var(--color-border);
        border-radius: var(--radius-full);
        height: 8px;
        overflow: hidden;
      }

      .fc-progress-fill {
        background: linear-gradient(90deg, var(--color-success), #34d399);
        height: 100%;
        border-radius: var(--radius-full);
        transition: width var(--transition-slow);
      }

      /* Question card */
      .fc-question-card {
        background: var(--color-bg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        padding: var(--spacing-md) var(--spacing-md) var(--spacing-sm);
        flex-shrink: 0;
        margin-bottom: var(--spacing-sm);
      }

      .fc-question-meta {
        font-size: var(--font-size-sm);
        color: var(--color-text-light);
        text-align: center;
        margin-bottom: var(--spacing-xs);
        font-weight: 500;
      }

      .fc-question-text {
        font-size: clamp(1.1rem, 3vw, 1.75rem);
        font-weight: 700;
        line-height: 1.35;
        text-align: center;
        color: var(--color-text);
      }

      /* Answers grid */
      .fc-answers-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
        flex: 1;
      }

      /* Single answer: full width */
      .fc-answers-grid:has(.fc-answer-card:only-child) {
        grid-template-columns: 1fr;
      }

      /* 3 answers: last one spans full width */
      .fc-answers-grid:has(.fc-answer-card:nth-child(3):last-child) .fc-answer-card:last-child {
        grid-column: 1 / -1;
      }

      .fc-answer-card {
        position: relative;
        background: var(--color-bg);
        border: 2px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) 3.5rem;
        min-height: 64px;
        display: flex;
        align-items: center;
        box-shadow: var(--shadow-sm);
        transition: background var(--transition-base), border-color var(--transition-base);
      }

      .fc-answer-card.revealed-correct {
        background: #d1fae5;
        border-color: var(--color-success);
        animation: fc-pulse-correct 0.5s ease;
      }

      .fc-answer-card.revealed-wrong {
        background: #fef2f2;
        border-color: #fca5a5;
        opacity: 0.65;
      }

      @keyframes fc-pulse-correct {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.03); }
      }

      .fc-answer-label {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 2rem;
        height: 2rem;
        background: var(--color-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      .fc-answer-card.revealed-correct .fc-answer-label {
        background: var(--color-success);
      }

      .fc-answer-card.revealed-wrong .fc-answer-label {
        background: #ef4444;
      }

      .fc-answer-text {
        font-size: clamp(0.85rem, 2vw, 1.05rem);
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
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-success);
        font-size: 1.25rem;
        font-weight: 700;
      }

      /* Action area */
      .fc-actions {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
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
        margin-bottom: 0.25rem;
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

      .fc-no-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
      .fc-yes-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      .fc-no-btn:active, .fc-yes-btn:active { transform: translateY(0); }

      @media (max-width: 400px) {
        .fc-answer-card { padding-left: 3rem; min-height: 56px; }
        .fc-answer-label { width: 1.75rem; height: 1.75rem; font-size: 0.8rem; }
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
      }, 1500);
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
          <div style="font-size: 4rem; margin-bottom: var(--spacing-md);">🎉</div>
          <h2>All cards mastered!</h2>
          <p class="text-secondary">Loading your results...</p>
        </div></div></div>
      `);
      return;
    }

    const card = this.currentCard!;
    const graduated = this.engine?.getGraduatedCount() ?? 0;
    const total = this.engine?.getTotalCount() ?? 0;
    const active = this.engine?.getActiveCount() ?? 0;
    const progress = total > 0 ? Math.round((graduated / total) * 100) : 0;
    const revealed = this.phase === 'answer';

    this.setContent(`
      <div class="fc-play-screen">
        ${this.renderProgressBar(graduated, active, progress)}

        <div class="fc-question-card">
          <div class="fc-question-meta">${active} card${active !== 1 ? 's' : ''} remaining</div>
          <div class="fc-question-text">${this.escapeHtml(card.text)}</div>
        </div>

        <div class="fc-answers-grid">
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

  private renderProgressBar(graduated: number, active: number, progress: number): string {
    return `
      <div class="fc-progress-bar">
        <div class="fc-progress-stats">
          <span class="mastered">✓ ${graduated} mastered</span>
          <span>${progress}%</span>
          <span class="active">${active} active</span>
        </div>
        <div class="fc-progress-track">
          <div class="fc-progress-fill" style="width: ${progress}%;"></div>
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
