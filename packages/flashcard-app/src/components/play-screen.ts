/**
 * Play Screen — The main flashcard experience.
 * Implements the Modified Leitner System (3-box) entirely client-side.
 *
 * Flow:
 *   question text → "Show Answer" → answer revealed + Yes/No buttons
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

export class FlashcardPlayScreen extends BaseComponent {
  private sessionId: string = '';
  private sessionState: FlashcardSessionState | null = null;
  private engine: LeitnerEngine | null = null;
  private currentCard: FlashCard | null = null;
  private phase: Phase = 'loading';
  private error: string | null = null;

  protected async onMount(): Promise<void> {
    const hash = window.location.hash;
    const match = hash.match(/#\/play\/([^/?]+)/);
    this.sessionId = match ? decodeURIComponent(match[1]!) : (state.sessionId || '');

    if (!this.sessionId) {
      router.navigate('/');
      return;
    }

    await this.loadSession();
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
      // Short delay then navigate to summary
      setTimeout(() => {
        // Persist stats to sessionStorage for summary screen
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

    if (this.phase === 'question') {
      this.setContent(`
        <div class="screen">
          <div class="container">
            ${this.renderProgressBar(graduated, active, total, progress)}
            <div class="card" style="margin-top: var(--spacing-md);">
              <div class="text-secondary text-center" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-sm);">
                ${active} card${active !== 1 ? 's' : ''} remaining
              </div>
              <div class="question-text" style="font-size: var(--font-size-xl); font-weight: 600; margin-bottom: var(--spacing-xl); min-height: 120px; display: flex; align-items: center; justify-content: center; text-align: center;">
                ${this.escapeHtml(card.text)}
              </div>
              <button id="show-answer-btn" class="btn-primary" style="width: 100%; padding: var(--spacing-md); font-size: var(--font-size-lg);">
                Show Answer
              </button>
            </div>
          </div>
        </div>
      `);
      this.qs('#show-answer-btn')?.addEventListener('click', () => {
        this.phase = 'answer';
        this.render();
      });
      return;
    }

    // phase === 'answer'
    this.setContent(`
      <div class="screen">
        <div class="container">
          ${this.renderProgressBar(graduated, active, total, progress)}
          <div class="card" style="margin-top: var(--spacing-md);">
            <div class="text-secondary text-center" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-sm);">
              ${active} card${active !== 1 ? 's' : ''} remaining
            </div>
            <div class="question-text" style="font-size: var(--font-size-lg); font-weight: 600; margin-bottom: var(--spacing-md); text-align: center; color: var(--color-text-light);">
              ${this.escapeHtml(card.text)}
            </div>
            <div style="border-top: 2px solid var(--color-border); padding-top: var(--spacing-md); margin-bottom: var(--spacing-lg);">
              <div class="text-secondary" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs); text-transform: uppercase; letter-spacing: 0.05em;">Answer</div>
              <div style="font-size: var(--font-size-xl); font-weight: 700; color: var(--color-success);">
                ${this.escapeHtml(card.answer)}
              </div>
              ${this.renderAllAnswers(card)}
            </div>
            <div style="font-size: var(--font-size-base); text-align: center; margin-bottom: var(--spacing-md); color: var(--color-text-light);">
              Did you know this?
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <button id="no-btn" style="
                padding: var(--spacing-md);
                font-size: var(--font-size-lg);
                font-weight: 700;
                border: none;
                border-radius: var(--radius-lg);
                background: var(--color-error);
                color: white;
                cursor: pointer;
                transition: opacity var(--transition-fast);
              ">✗ No</button>
              <button id="yes-btn" style="
                padding: var(--spacing-md);
                font-size: var(--font-size-lg);
                font-weight: 700;
                border: none;
                border-radius: var(--radius-lg);
                background: var(--color-success);
                color: white;
                cursor: pointer;
                transition: opacity var(--transition-fast);
              ">✓ Yes</button>
            </div>
          </div>
        </div>
      </div>
    `);

    this.qs('#yes-btn')?.addEventListener('click', () => {
      this.engine?.markCard(card.id, true);
      this.advance();
    });
    this.qs('#no-btn')?.addEventListener('click', () => {
      this.engine?.markCard(card.id, false);
      this.advance();
    });
  }

  private renderProgressBar(graduated: number, active: number, _total: number, progress: number): string {
    return `
      <div style="background: var(--color-bg); border-radius: var(--radius-md); padding: var(--spacing-sm);">
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm);">
          <span>✓ ${graduated} mastered</span>
          <span>${progress}%</span>
          <span>🔄 ${active} active</span>
        </div>
        <div style="background: var(--color-border); border-radius: var(--radius-full); height: 8px; overflow: hidden;">
          <div style="background: var(--color-success); height: 100%; width: ${progress}%; transition: width var(--transition-slow); border-radius: var(--radius-full);"></div>
        </div>
      </div>
    `;
  }

  private renderAllAnswers(card: FlashCard): string {
    if (card.allAnswers.length <= 1) return '';
    const distractors = card.allAnswers.filter((a) => !card.correctAnswerIds.includes(a.id));
    if (distractors.length === 0) return '';
    return `
      <div style="margin-top: var(--spacing-sm);">
        <div class="text-secondary" style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-xs);">Other options (incorrect):</div>
        ${distractors.map((a) => `<div style="font-size: var(--font-size-sm); color: var(--color-text-light); padding: 2px 0;">• ${this.escapeHtml(a.text)}</div>`).join('')}
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
