import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';
import type { GameState } from '@quizzquizz/common';
import { connectToSession, type SessionDocState } from '../yjs-provider';

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
  private currentQuestion: GameState['currentQuestion'] = null;
  private currentQuestionIndex: number = 0;
  private hasSubmitted: boolean = false;
  private hasRenderedQuestion: boolean = false;
  private errorNavigationTimeout: number | null = null;

  protected onMount(): void {
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
        this.currentQuestion = docState.currentQuestion as GameState['currentQuestion'];
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
    const correctCount = this.currentQuestion?.correctAnswerIds?.length ?? 1;
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
      if (this.currentQuestion && this.currentQuestion.correctAnswerIds) {
        const correctCount = this.currentQuestion.correctAnswerIds.length;
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
    const html = !this.currentQuestion ? `
        <div class="screen question-screen">
          <div class="loading">
            <div class="spinner"></div>
            <p>Waiting for question...</p>
          </div>
        </div>
      ` : `
      <div class="screen question-screen">
        <div class="question-header">
          <div class="timer">0s</div>
          <div class="question-number">
            Question ${this.currentQuestionIndex + 1}
          </div>
        </div>

        <div class="question-text">
          ${this.escapeHtml(this.currentQuestion.text)}
        </div>

        ${this.currentQuestion.correctAnswerIds && this.currentQuestion.correctAnswerIds.length > 1 ? `
          <div class="multiple-answers-hint">
            ⚠️ Select exactly ${this.currentQuestion.correctAnswerIds.length} answers
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
            ${this.currentQuestion.correctAnswerIds && this.currentQuestion.correctAnswerIds.length > 1 
              ? `${this.selectedAnswerIds.size}/${this.currentQuestion.correctAnswerIds.length} selected`
              : 'Select one or more answers'}
          </p>
        </div>

        <div class="error-message"></div>
      </div>
    `;

    this.setContent(html);
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
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('question-screen', QuestionScreen);

