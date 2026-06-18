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
import { updateSetBoxCounts } from '../flashcard-sets';
import fitty from 'fitty';

type Phase = 'loading' | 'question' | 'answer' | 'complete';

// Letter labels for answers: A, B, C, D, E, F
const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SS_FLAGGED_QUESTIONS = 'qz-flashcard-flags';
const LS_FLAGGED_QUESTIONS = 'qz-flagged-questions';

export interface FlaggedQuestion {
  questionId: string;
  explanation: string;
  timestamp: number;
}

/** Fisher-Yates shuffle — returns a new array */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export class FlashcardPlayScreen extends BaseComponent {
  private sessionId: string = '';
  private sessionState: FlashcardSessionState | null = null;
  private engine: LeitnerEngine | null = null;
  private currentCard: FlashCard | null = null;
  private shuffledAnswers: Array<{ id: string; text: string }> = [];
  private phase: Phase = 'loading';
  private error: string | null = null;
  private flaggedQuestions: Map<string, FlaggedQuestion> = new Map();
  private modalOverlay: HTMLElement | null = null;

  protected async onMount(): Promise<void> {
    this.injectStyles();

    const hash = window.location.hash;
    const match = hash.match(/#\/play\/([^/?]+)/);
    this.sessionId = match ? decodeURIComponent(match[1]!) : (state.sessionId || '');

    if (!this.sessionId) {
      router.navigate('/');
      return;
    }

    // Read active-session info and returnUrl from hash query params (passed by the host
    // app so the data survives cross-origin navigation in dev mode).
    this.readHashParams(hash);
    this.loadFlags();

    await this.loadSession();
  }

  protected onUnmount(): void {
    this.removeModal();
  }

  /** Parse bankId, setIndex, and returnUrl from the hash query string and persist to sessionStorage. */
  private readHashParams(hash: string): void {
    if (!hash.includes('?')) return;
    const queryPart = hash.split('?')[1] ?? '';
    const params = new URLSearchParams(queryPart);

    const bankId = params.get('bankId');
    const setIndexStr = params.get('setIndex');
    const returnUrl = params.get('returnUrl');

    try {
      if (bankId) sessionStorage.setItem('qz-active-bank-id', bankId);
      if (setIndexStr !== null) sessionStorage.setItem('qz-active-set-index', setIndexStr);
      if (returnUrl) sessionStorage.setItem('qz-flashcard-return-url', returnUrl);
    } catch { /* ignore */ }
  }

  private loadFlags(): void {
    try {
      const raw = sessionStorage.getItem(SS_FLAGGED_QUESTIONS);
      if (raw) {
        const arr = JSON.parse(raw) as FlaggedQuestion[];
        for (const f of arr) this.flaggedQuestions.set(f.questionId, f);
      }
    } catch { /* ignore */ }
  }

  private saveFlags(): void {
    try {
      // sessionStorage: per-session quick access
      sessionStorage.setItem(
        SS_FLAGGED_QUESTIONS,
        JSON.stringify([...this.flaggedQuestions.values()]),
      );
      // localStorage: shared across apps so host prep screen can read them
      const existing: Record<string, { explanation: string; timestamp: number }> = {};
      try {
        const raw = localStorage.getItem(LS_FLAGGED_QUESTIONS);
        if (raw) Object.assign(existing, JSON.parse(raw));
      } catch { /* ignore */ }
      this.flaggedQuestions.forEach((f, id) => { existing[id] = { explanation: f.explanation, timestamp: f.timestamp }; });
      localStorage.setItem(LS_FLAGGED_QUESTIONS, JSON.stringify(existing));
    } catch { /* ignore */ }
  }

  private exitToSummary(): void {
    this.removeModal();
    if (!this.engine) {
      router.navigate('/');
      return;
    }
    try {
      sessionStorage.setItem('qz-flashcard-stats', JSON.stringify(this.engine.getStats()));
      sessionStorage.setItem('qz-flashcard-bank-name', this.sessionState?.questionBankName || '');
    } catch { /* ignore */ }
    router.navigate('/summary');
  }

  private showFlagModal(cardId: string): void {
    this.removeModal();
    const existing = this.flaggedQuestions.get(cardId);

    const overlay = document.createElement('div');
    overlay.className = 'fc-modal-overlay';
    overlay.innerHTML = `
      <div class="fc-modal" role="dialog" aria-modal="true" aria-labelledby="fc-modal-title">
        <h3 id="fc-modal-title" class="fc-modal-title">
          ${existing ? '🚩 Question Already Flagged' : '🚩 Report an Issue'}
        </h3>
        <p class="fc-modal-desc">
          ${existing
            ? 'You can update the description or remove the flag.'
            : 'Describe the problem with this question. This is optional — you can flag it without a reason.'}
        </p>
        <textarea
          id="fc-flag-reason"
          class="fc-modal-textarea"
          rows="3"
          placeholder="E.g. Wrong answer, confusing wording, typo…"
          maxlength="500"
        >${existing ? this.escapeHtml(existing.explanation) : ''}</textarea>
        <div class="fc-modal-actions">
          ${existing ? `<button class="fc-modal-btn fc-modal-btn-danger" id="fc-flag-remove">Remove Flag</button>` : ''}
          <button class="fc-modal-btn fc-modal-btn-secondary" id="fc-flag-cancel">Cancel</button>
          <button class="fc-modal-btn fc-modal-btn-primary" id="fc-flag-submit">
            ${existing ? 'Update Flag' : '🚩 Flag Question'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalOverlay = overlay;

    const textarea = overlay.querySelector<HTMLTextAreaElement>('#fc-flag-reason');
    overlay.querySelector('#fc-flag-cancel')?.addEventListener('click', () => this.removeModal());
    overlay.querySelector('#fc-flag-submit')?.addEventListener('click', () => {
      const explanation = (textarea?.value ?? '').trim();
      this.flaggedQuestions.set(cardId, { questionId: cardId, explanation, timestamp: Date.now() });
      this.saveFlags();
      this.removeModal();
      this.render();
    });
    overlay.querySelector('#fc-flag-remove')?.addEventListener('click', () => {
      this.flaggedQuestions.delete(cardId);
      this.saveFlags();
      this.removeModal();
      this.render();
    });
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.removeModal();
    });

    // Focus textarea for accessibility
    setTimeout(() => textarea?.focus(), 50);
  }

  private removeModal(): void {
    this.modalOverlay?.remove();
    this.modalOverlay = null;
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
        grid-template-columns: 1fr;
        gap: var(--spacing-xs);
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        margin-bottom: var(--spacing-xs);
        align-content: start;
      }

      /* Single answer: full width */
      .fc-answers-grid.fc-single { grid-template-columns: 1fr; }

      /* 2-column layout on screens wide enough to give text room */
      @media (min-width: 560px) {
        .fc-answers-grid:not(.fc-single) {
          grid-template-columns: 1fr 1fr;
        }
      }

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

      /* ── Top bar ────────────────────────────────── */
      .fc-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        margin-bottom: var(--spacing-xs);
        padding: 0 0.25rem;
      }

      .fc-top-bar-exit {
        background: none;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0.35rem 0.75rem;
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-text-light);
        cursor: pointer;
        transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        white-space: nowrap;
        flex-shrink: 0;
      }

      .fc-top-bar-exit:hover {
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border-color: transparent;
      }

      .fc-top-bar-right {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        min-width: 0;
      }

      .fc-top-bar-title {
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-text-light);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ── Flag button (top-bar icon only) ───────── */
      .fc-flag-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        padding: 0.3rem 0.35rem;
        border-radius: var(--radius-sm);
        opacity: 0.35;
        transition: opacity var(--transition-fast), background var(--transition-fast);
        flex-shrink: 0;
      }

      .fc-flag-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.6);
      }

      .fc-flag-btn.fc-flagged { opacity: 1; }

      /* ── Modal overlay ───────────────────────────── */
      .fc-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: var(--spacing-md);
        box-sizing: border-box;
      }

      .fc-modal {
        background: var(--color-bg);
        border-radius: var(--radius-lg);
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        padding: var(--spacing-lg);
        max-width: 420px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .fc-modal-title {
        font-size: var(--font-size-lg);
        font-weight: 700;
        margin: 0;
      }

      .fc-modal-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-light);
        margin: 0;
      }

      .fc-modal-textarea {
        width: 100%;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
        font-size: var(--font-size-base);
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        transition: border-color var(--transition-fast);
        background: var(--color-bg-secondary);
        color: var(--color-text);
      }

      .fc-modal-textarea:focus {
        outline: none;
        border-color: var(--color-primary);
      }

      .fc-modal-actions {
        display: flex;
        gap: var(--spacing-xs);
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      .fc-modal-btn {
        padding: 0.5rem 1.1rem;
        font-size: var(--font-size-sm);
        font-weight: 600;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: opacity var(--transition-fast);
      }

      .fc-modal-btn:hover { opacity: 0.85; }

      .fc-modal-btn-primary {
        background: var(--color-primary);
        color: white;
      }

      .fc-modal-btn-secondary {
        background: var(--color-bg-secondary);
        color: var(--color-text);
        border: 1px solid var(--color-border);
      }

      .fc-modal-btn-danger {
        background: var(--color-error);
        color: white;
      }

      /* Dark mode — both OS preference (pre-JS) and explicit data-theme */
      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) .fc-stat-learning  { color: #9ca3af; }
        :root:not([data-theme="light"]) .fc-stat-reviewing { color: #fbbf24; }
        :root:not([data-theme="light"]) .fc-stat-mastering { color: #60a5fa; }
        :root:not([data-theme="light"]) .fc-seg-learning   { background: #6b7280; }
        :root:not([data-theme="light"]) .fc-answer-card.revealed-correct { background: #064e3b; border-color: var(--color-success); }
        :root:not([data-theme="light"]) .fc-answer-card.revealed-correct .fc-answer-text { color: #6ee7b7; }
        :root:not([data-theme="light"]) .fc-answer-card.revealed-wrong { background: #450a0a; border-color: #f87171; opacity: 0.75; }
        :root:not([data-theme="light"]) .fc-answer-card.revealed-wrong .fc-answer-label { background: #dc2626; }
        :root:not([data-theme="light"]) .fc-top-bar-exit:hover,
        :root:not([data-theme="light"]) .fc-flag-btn:hover { background: rgba(255,255,255,0.12); color: var(--color-text); border-color: var(--color-border); }
      }
      :root[data-theme="dark"] .fc-stat-learning  { color: #9ca3af; }
      :root[data-theme="dark"] .fc-stat-reviewing { color: #fbbf24; }
      :root[data-theme="dark"] .fc-stat-mastering { color: #60a5fa; }
      :root[data-theme="dark"] .fc-seg-learning   { background: #6b7280; }
      :root[data-theme="dark"] .fc-answer-card.revealed-correct { background: #064e3b; border-color: var(--color-success); }
      :root[data-theme="dark"] .fc-answer-card.revealed-correct .fc-answer-text { color: #6ee7b7; }
      :root[data-theme="dark"] .fc-answer-card.revealed-wrong { background: #450a0a; border-color: #f87171; opacity: 0.75; }
      :root[data-theme="dark"] .fc-answer-card.revealed-wrong .fc-answer-label { background: #dc2626; }
      :root[data-theme="dark"] .fc-top-bar-exit:hover,
      :root[data-theme="dark"] .fc-flag-btn:hover { background: rgba(255,255,255,0.12); color: var(--color-text); border-color: var(--color-border); }
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

      // Resume from server-saved progress if the player has an existing session
      const playerId = state.playerId;
      if (playerId) {
        try {
          const saved = await api.getProgress(this.sessionId, playerId);
          for (const card of saved.cards) {
            this.engine.restoreCardState(card.cardId, {
              box: card.box,
              yesCount: card.yesCount,
              noCount: card.noCount,
              graduated: card.graduated,
              firstTrySuccess: card.firstTrySuccess,
            });
          }
        } catch {
          // Progress fetch failure is non-fatal — start fresh
        }
      }

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

    // Shuffle answers so the correct position changes every turn
    this.shuffledAnswers = shuffle([...this.currentCard.allAnswers]);
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
    const isSingle = this.shuffledAnswers.length === 1;
    const isFlagged = this.flaggedQuestions.has(card.id);
    const bankName = this.sessionState?.questionBankName || 'Flashcards';

    this.patchContent(`
      <div class="fc-play-screen">
        <div class="fc-top-bar">
          <button class="fc-top-bar-exit" id="exit-btn" title="Exit to summary">✕ Exit</button>
          <div class="fc-top-bar-right">
            <span class="fc-top-bar-title">${this.escapeHtml(bankName)}</span>
            <button
              class="fc-flag-btn${isFlagged ? ' fc-flagged' : ''}"
              id="flag-btn"
              title="${isFlagged ? 'Question flagged — click to edit' : 'Report an issue with this question'}"
              aria-label="${isFlagged ? 'Flagged' : 'Report issue'}"
            >🚩</button>
          </div>
        </div>

        ${this.renderProgressBar(dist, total)}

        <div class="fc-question-card">
          <div class="fc-question-meta">${active} card${active !== 1 ? 's' : ''} remaining</div>
          <div class="fc-question-text">${this.escapeHtml(card.text)}</div>
        </div>

        <div class="fc-answers-grid${isSingle ? ' fc-single' : ''}">
          ${this.shuffledAnswers.map((answer, i) => this.renderAnswerCard(answer, i, card.correctAnswerIds, revealed)).join('')}
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

    requestAnimationFrame(() => {
      this.querySelectorAll<HTMLElement>('.fc-question-text, .fc-answer-text').forEach(el => {
        fitty(el, el.classList.contains('fc-question-text') ? { multiLine: true } : {});
      });
    });

    if (revealed) {
      this.qs('#yes-btn')?.addEventListener('click', () => {
        this.engine?.markCard(card.id, true);
        this.syncAnswer(card.id, true);
        this.advance();
      });
      this.qs('#no-btn')?.addEventListener('click', () => {
        this.engine?.markCard(card.id, false);
        this.syncAnswer(card.id, false);
        this.advance();
      });
    } else {
      this.qs('#show-answer-btn')?.addEventListener('click', () => {
        this.phase = 'answer';
        this.render();
      });
    }

    this.qs('#exit-btn')?.addEventListener('click', () => this.exitToSummary());
    this.qs('#flag-btn')?.addEventListener('click', () => this.showFlagModal(card.id));
  }

  /**
   * Fire-and-forget: send the current card state to the server after the engine has
   * already processed the answer locally.  Errors are silently swallowed so that a
   * network hiccup never blocks the player's study flow.
   * Also updates the per-set box distribution in localStorage so the host-app's set
   * picker can reflect current progress.
   */
  private syncAnswer(cardId: string, known: boolean): void {
    if (!this.engine) return;

    // Always persist box distribution — must run even when the host plays directly
    // without a playerId (the host opens the play URL without going through the
    // join screen, so state.playerId is null in that scenario).
    this.persistBoxCounts();

    const playerId = state.playerId;
    if (!playerId) return;

    // Read the post-markCard state directly from the engine's stats
    const stats = this.engine.getStats();
    const detail = stats.cardDetails.find((d) => d.card.id === cardId);
    if (!detail) return;

    api
      .recordAnswer(this.sessionId, {
        playerId,
        cardId,
        known,
        box: detail.box,
        yesCount: detail.yesCount,
        noCount: detail.noCount,
        graduated: detail.graduated,
        firstTrySuccess: detail.firstTrySuccess,
      })
      .catch(() => {
        // Non-blocking — local engine state is the source of truth during play
      });
  }

  /** Write current box distribution to localStorage so the host-app set picker reflects progress. */
  private persistBoxCounts(): void {
    if (!this.engine) return;
    try {
      const bankId = sessionStorage.getItem('qz-active-bank-id');
      const setIndexStr = sessionStorage.getItem('qz-active-set-index');
      if (bankId && setIndexStr !== null) {
        const setIndex = parseInt(setIndexStr, 10);
        if (!isNaN(setIndex)) {
          const dist = this.engine.getBoxDistribution();
          updateSetBoxCounts(bankId, setIndex, { ...dist, total: this.engine.getTotalCount() });
        }
      }
    } catch { /* ignore */ }
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
