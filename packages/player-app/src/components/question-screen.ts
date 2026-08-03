import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';
import { connectToSession, type SessionDocState, type SessionQuestion } from '../yjs-provider';
import { fitText } from './text-fit';

const LS_FLAGGED_QUESTIONS = 'qz-flagged-questions';

interface FlaggedQuestion {
  explanation: string;
  timestamp: number;
}

/**
 * Question Screen Component
 * Displays the current question with answers, timer, and submit button.
 * Observes the Yjs session doc to detect question changes or quiz end.
 */
export class QuestionScreen extends BaseComponent {
  private disconnectYjs: (() => void) | null = null;
  private selectedAnswerIds: Set<string> = new Set();
  private timeRemaining: number = 0;
  private timeLimit: number = 0;
  private currentQuestion: SessionQuestion | null = null;
  private currentQuestionIndex: number = 0;
  private hasSubmitted: boolean = false;
  private hasRenderedQuestion: boolean = false;
  private errorNavigationTimeout: number | null = null;
  private flaggedQuestions: Map<string, FlaggedQuestion> = new Map();
  private modalOverlay: HTMLElement | null = null;

  protected onMount(): void {
    this.injectFlagStyles();
    this.loadFlags();

    const currentState = state.getState();
    if (!currentState.sessionId || !currentState.playerId) {
      router.navigate('/');
      return;
    }

    this.disconnectYjs = connectToSession(
      currentState.sessionId,
      currentState.playerId,
      (docState) => this.handleDocState(docState)
    );
  }

  protected onUnmount(): void {
    if (this.disconnectYjs) {
      this.disconnectYjs();
      this.disconnectYjs = null;
    }
    if (this.errorNavigationTimeout !== null) {
      clearTimeout(this.errorNavigationTimeout);
      this.errorNavigationTimeout = null;
    }
    this.removeModal();
  }

  private injectFlagStyles(): void {
    if (document.getElementById('qz-flag-styles')) return;
    const style = document.createElement('style');
    style.id = 'qz-flag-styles';
    style.textContent = `
      .qz-flag-btn {
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
      .qz-flag-btn:hover { opacity: 1; background: rgba(0,0,0,0.6); }
      .qz-flag-btn.qz-flagged { opacity: 1; }
      /* Modal — shared with flashcard pattern */
      .qz-modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: var(--spacing-md); box-sizing: border-box;
      }
      .qz-modal {
        background: var(--color-bg);
        border-radius: var(--radius-lg);
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        padding: var(--spacing-lg);
        max-width: 420px; width: 100%;
        display: flex; flex-direction: column; gap: var(--spacing-sm);
      }
      .qz-modal-title { font-size: var(--font-size-lg); font-weight: 700; margin: 0; }
      .qz-modal-desc  { font-size: var(--font-size-sm); color: var(--color-text-light); margin: 0; }
      .qz-modal-textarea {
        width: 100%; border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md); padding: var(--spacing-sm);
        font-size: var(--font-size-base); font-family: inherit;
        resize: vertical; box-sizing: border-box;
        background: var(--color-bg-secondary); color: var(--color-text);
      }
      .qz-modal-textarea:focus { outline: none; border-color: var(--color-primary); }
      .qz-modal-actions { display: flex; gap: var(--spacing-xs); justify-content: flex-end; flex-wrap: wrap; }
      .qz-modal-btn {
        padding: 0.5rem 1.1rem; font-size: var(--font-size-sm); font-weight: 600;
        border: none; border-radius: var(--radius-md); cursor: pointer;
        transition: opacity var(--transition-fast);
      }
      .qz-modal-btn:hover { opacity: 0.85; }
      .qz-modal-btn-primary  { background: var(--color-primary); color: white; }
      .qz-modal-btn-secondary { background: var(--color-bg-secondary); color: var(--color-text); border: 1px solid var(--color-border); }
      .qz-modal-btn-danger   { background: var(--color-error); color: white; }
    `;
    document.head.appendChild(style);
  }

  private loadFlags(): void {
    try {
      const raw = localStorage.getItem(LS_FLAGGED_QUESTIONS);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, FlaggedQuestion>;
        for (const [id, f] of Object.entries(obj)) this.flaggedQuestions.set(id, f);
      }
    } catch { /* ignore */ }
  }

  private saveFlags(): void {
    try {
      const obj: Record<string, FlaggedQuestion> = {};
      this.flaggedQuestions.forEach((f, id) => { obj[id] = f; });
      localStorage.setItem(LS_FLAGGED_QUESTIONS, JSON.stringify(obj));
    } catch { /* ignore */ }
  }

  private showFlagModal(questionId: string): void {
    this.removeModal();
    const existing = this.flaggedQuestions.get(questionId);

    const overlay = document.createElement('div');
    overlay.className = 'qz-modal-overlay';
    overlay.innerHTML = `
      <div class="qz-modal" role="dialog" aria-modal="true">
        <h3 class="qz-modal-title">${existing ? '🚩 Question Already Flagged' : '🚩 Report an Issue'}</h3>
        <p class="qz-modal-desc">
          ${existing
            ? 'You can update the description or remove the flag.'
            : 'Describe the problem with this question. This is optional.'}
        </p>
        <textarea class="qz-modal-textarea" id="qz-flag-reason" rows="3"
          placeholder="E.g. Wrong answer, confusing wording, typo…"
          maxlength="500"
        >${existing ? this.escapeHtml(existing.explanation) : ''}</textarea>
        <div class="qz-modal-actions">
          ${existing ? `<button class="qz-modal-btn qz-modal-btn-danger" id="qz-flag-remove">Remove Flag</button>` : ''}
          <button class="qz-modal-btn qz-modal-btn-secondary" id="qz-flag-cancel">Cancel</button>
          <button class="qz-modal-btn qz-modal-btn-primary" id="qz-flag-submit">
            ${existing ? 'Update Flag' : '🚩 Flag Question'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.modalOverlay = overlay;

    const textarea = overlay.querySelector<HTMLTextAreaElement>('#qz-flag-reason');
    overlay.querySelector('#qz-flag-cancel')?.addEventListener('click', () => this.removeModal());
    overlay.querySelector('#qz-flag-submit')?.addEventListener('click', () => {
      const explanation = (textarea?.value ?? '').trim();
      this.flaggedQuestions.set(questionId, { explanation, timestamp: Date.now() });
      this.saveFlags();
      this.removeModal();
      this.render();
    });
    overlay.querySelector('#qz-flag-remove')?.addEventListener('click', () => {
      this.flaggedQuestions.delete(questionId);
      this.saveFlags();
      this.removeModal();
      this.render();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.removeModal(); });
    setTimeout(() => textarea?.focus(), 50);
  }

  private removeModal(): void {
    this.modalOverlay?.remove();
    this.modalOverlay = null;
  }

  private handleDocState(docState: SessionDocState): void {
    if (docState.status === 'finished') {
      console.log('[PLAYER][Question] status=finished → /results');
      const sessionId = state.getState().sessionId;
      router.navigate(`/results?sessionId=${sessionId}`);
      return;
    }
    if (docState.status === 'lobby') {
      console.log('[PLAYER][Question] status=lobby → /lobby');
      const sessionId = state.getState().sessionId;
      router.navigate(`/lobby?sessionId=${sessionId}`);
      return;
    }

    if (docState.currentQuestion) {
      const timerPaused = docState.timerPaused ?? false;

      if (!this.currentQuestion) {
        // First load
        console.log(`[PLAYER][Question] First question received: id=${docState.currentQuestion.id.slice(0,8)} "${docState.currentQuestion.text.slice(0,50)}"`);
        this.currentQuestion = docState.currentQuestion ?? null;
        this.currentQuestionIndex = (docState.currentQuestionNumber || 1) - 1;
        this.timeLimit = docState.timeLimit ?? 20;
        this.timeRemaining = docState.timeRemaining ?? this.timeLimit;
        this.selectedAnswerIds.clear();
        this.hasSubmitted = false;

        if (!this.hasRenderedQuestion) {
          this.hasRenderedQuestion = true;
          this.render();
        }
      } else if (docState.currentQuestion.id !== this.currentQuestion.id) {
        // Question changed — go to waiting screen
        this.removeModal();
        console.log(`[PLAYER][Question] Question changed → /waiting`);
        router.navigate(`/waiting`);
      } else {
        // Same question — update timeRemaining directly from server push
        if (docState.timeLimit !== undefined && docState.timeLimit !== null) {
          this.timeLimit = docState.timeLimit;
        }
        if (!timerPaused && docState.timeRemaining !== undefined && docState.timeRemaining !== null) {
          this.timeRemaining = docState.timeRemaining;
          this.updateTimerDisplay();
          if (this.timeRemaining <= 0 && !this.hasSubmitted) {
            this.submitAnswer();
          }
        } else if (timerPaused && docState.timeRemaining !== undefined && docState.timeRemaining !== null) {
          // Paused — show frozen value
          this.timeRemaining = docState.timeRemaining;
          this.updateTimerDisplay();
        }
      }
    }
  }

  private updateTimerDisplay(): void {
    const timerEl = this.querySelector('.timer');
    if (timerEl) {
      timerEl.textContent = `${this.timeRemaining}s`;
      const percentRemaining = this.timeLimit > 0 ? this.timeRemaining / this.timeLimit : 0;
      timerEl.classList.remove('timer-warning', 'timer-caution');
      if (this.timeRemaining <= 5) {
        timerEl.classList.add('timer-warning');
      } else if (percentRemaining <= 0.3) {
        timerEl.classList.add('timer-caution');
      }
    }
  }

  private toggleAnswer(answerId: string, button: HTMLElement): void {
    if (this.hasSubmitted) return;
    this.addRippleEffect(button);
    if (this.selectedAnswerIds.has(answerId)) {
      this.selectedAnswerIds.delete(answerId);
    } else {
      this.selectedAnswerIds.add(answerId);
    }
    this.updateAnswerButtons();
    this.updateSubmitButton();
  }

  private addRippleEffect(button: HTMLElement): void {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.marginLeft = -(size / 2) + 'px';
    ripple.style.marginTop = -(size / 2) + 'px';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  private updateAnswerButtons(): void {
    const buttons = this.querySelectorAll('.answer-btn');
    buttons.forEach((btn) => {
      const answerId = (btn as HTMLElement).dataset.answerId;
      if (answerId) {
        if (this.selectedAnswerIds.has(answerId)) {
          btn.classList.add('selected');
          btn.classList.add('selecting');
          setTimeout(() => btn.classList.remove('selecting'), 200);
        } else {
          btn.classList.remove('selected');
        }
      }
    });
  }

  private getSubmitButtonText(): string {
    if (this.hasSubmitted) return 'Submitted';
    const correctCount = this.currentQuestion?.correctAnswerCount ?? 1;
    const remaining = correctCount - this.selectedAnswerIds.size;
    if (remaining > 1) {
      return `Select ${remaining} more answers`;
    }
    return 'Submit Answer';
  }

  private updateSubmitButton(): void {
    const submitBtn = this.querySelector('.submit-btn') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.textContent = this.getSubmitButtonText();
      if (this.hasSubmitted) {
        submitBtn.disabled = true;
        return;
      }
      if (this.selectedAnswerIds.size === 0) {
        submitBtn.disabled = true;
        return;
      }
      if (this.currentQuestion) {
        const correctCount = this.currentQuestion.correctAnswerCount ?? 1;
        if (correctCount > 1 && this.selectedAnswerIds.size !== correctCount) {
          submitBtn.disabled = true;
          return;
        }
      }
      submitBtn.disabled = false;
    }
  }

  private async submitAnswer(): Promise<void> {
    if (this.hasSubmitted) return;
    const currentState = state.getState();
    if (!currentState.sessionId || !currentState.playerId || !this.currentQuestion) return;

    this.hasSubmitted = true;

    const submitBtn = this.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.classList.add('loading');
      (submitBtn as HTMLButtonElement).disabled = true;
    }
    const buttons = this.querySelectorAll('.answer-btn');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = true;
    });

    try {
      const result = await api.submitAnswer(
        currentState.sessionId,
        currentState.playerId,
        {
          questionId: this.currentQuestion.id,
          selectedAnswerIds: Array.from(this.selectedAnswerIds),
        }
      );
      router.navigate(`/waiting?correct=${result.correct}&score=${result.score}&lastQuestionId=${this.currentQuestion.id}`);
    } catch (error) {
      console.error('Error submitting answer:', error);
      const errorEl = this.querySelector('.error-message');
      if (errorEl) {
        errorEl.textContent = 'Failed to submit answer. Moving to next question...';
      }
      if (this.errorNavigationTimeout === null) {
        this.errorNavigationTimeout = window.setTimeout(() => {
          this.errorNavigationTimeout = null;
          const questionId = this.currentQuestion?.id || 'unknown';
          router.navigate(`/waiting?lastQuestionId=${questionId}`);
        }, 2000);
      }
    }
  }

  protected render(): void {
    const isFlagged = this.currentQuestion ? this.flaggedQuestions.has(this.currentQuestion.id) : false;

    const html = !this.currentQuestion ? `
        <div class="screen question-screen">
          <div class="loading">
            <div class="spinner"></div>
            <p>Waiting for question...</p>
          </div>
        </div>
      ` : `
      <div class="question-header">
        <div class="timer">0s</div>
        <div class="question-number">
          Question ${this.currentQuestionIndex + 1}
        </div>
        <button
          class="qz-flag-btn${isFlagged ? ' qz-flagged' : ''}"
          id="qz-flag-btn"
          title="${isFlagged ? 'Question flagged — click to edit' : 'Report an issue with this question'}"
          aria-label="${isFlagged ? 'Flagged' : 'Report issue'}"
        >🚩</button>
      </div>
      <div class="screen question-screen">

        <div class="question-text">
          ${this.escapeHtml(this.currentQuestion.text)}
        </div>

        ${(this.currentQuestion.correctAnswerCount ?? 1) > 1 ? `
          <div class="multiple-answers-hint">
            ⚠️ Select exactly ${this.currentQuestion.correctAnswerCount} answers
          </div>
        ` : ''}

        <div class="answers-grid">
          ${this.currentQuestion.answers.map((answer) => `
            <button 
              class="answer-btn" 
              data-answer-id="${answer.id}"
              ${this.hasSubmitted ? 'disabled' : ''}
            >
              ${this.escapeHtml(answer.text)}
            </button>
          `).join('')}
        </div>

        <div class="question-footer">
          <button 
            class="submit-btn primary-btn" 
            ${this.hasSubmitted || this.selectedAnswerIds.size === 0 ? 'disabled' : ''}
          >
            Submit Answer
          </button>
          <p class="hint">
            ${(this.currentQuestion.correctAnswerCount ?? 1) > 1
              ? `${this.selectedAnswerIds.size}/${this.currentQuestion.correctAnswerCount} selected`
              : 'Select one or more answers'}
          </p>
        </div>

        <div class="error-message"></div>
      </div>
    `;

    this.setContent(html);
    requestAnimationFrame(() => {
      const el = this.querySelector<HTMLElement>('.question-text');
      if (el) fitText(el, { minSize: 16, maxSize: 36 });
    });
    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    const answerButtons = this.querySelectorAll('.answer-btn');
    answerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const answerId = (btn as HTMLElement).dataset.answerId;
        if (answerId) {
          this.toggleAnswer(answerId, btn as HTMLElement);
        }
      });
    });

    const submitBtn = this.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitAnswer();
      });
    }

    const questionId = this.currentQuestion?.id;
    if (questionId) {
      this.querySelector('#qz-flag-btn')?.addEventListener('click', () => {
        this.showFlagModal(questionId);
      });
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('question-screen', QuestionScreen);

