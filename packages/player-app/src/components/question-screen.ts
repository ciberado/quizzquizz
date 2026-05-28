import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';
import type { GameState } from '@quizzquizz/common';

/**
 * Question Screen Component
 * Displays the current question with answers, timer, and submit button.
 * Polls for game state to detect when question changes or quiz ends.
 */
export class QuestionScreen extends BaseComponent {
  private pollInterval: number | null = null;
  private timerInterval: number | null = null;
  private selectedAnswerIds: Set<string> = new Set();
  private timeRemaining: number = 0;
  private currentQuestion: GameState['currentQuestion'] = null;
  private currentQuestionIndex: number = 0; // Track question index for display
  private questionStartedAt: number | null = null;
  private serverTime: number = 0; // Server's current time for clock synchronization
  private timeLimit: number = 0;
  private hasSubmitted: boolean = false;
  private hasRenderedQuestion: boolean = false; // Track if we've rendered with actual question data
  private errorNavigationTimeout: number | null = null; // Track error navigation timeout

  protected onMount(): void {
    this.startPolling();
  }

  protected onUnmount(): void {
    // Stop polling when leaving screen
    this.stopPolling();
    this.stopTimer();
    if (this.errorNavigationTimeout !== null) {
      clearTimeout(this.errorNavigationTimeout);
      this.errorNavigationTimeout = null;
    }
    this.stopPolling();
    this.stopTimer();
  }

  private startPolling(): void {
    this.pollGameState(); // Immediate first call
    this.pollInterval = window.setInterval(() => {
      this.pollGameState();
    }, 1500); // Poll every 1.5 seconds
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private startTimer(): void {
    this.stopTimer(); // Clear any existing timer
    
    // Calculate initial time remaining using server time (not client clock)
    // This prevents clock drift issues between devices
    const elapsed = this.serverTime - (this.questionStartedAt || 0);
    this.timeRemaining = Math.max(0, this.timeLimit - Math.floor(elapsed / 1000));
    
    this.resumeTimerInterval();
  }

  /** Start the countdown interval without recalculating timeRemaining (used for resume). */
  private resumeTimerInterval(): void {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining -= 1;
      
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (!this.hasSubmitted) {
          this.submitAnswer(); // Auto-submit when time runs out
        }
      } else {
        this.updateTimerDisplay();
      }
    }, 1000);
    
    this.updateTimerDisplay();
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(): void {
    const timerEl = this.querySelector('.timer');
    if (timerEl) {
      timerEl.textContent = `${this.timeRemaining}s`;
      
      // Update timer color based on remaining time
      const percentRemaining = this.timeRemaining / this.timeLimit;
      
      timerEl.classList.remove('timer-warning', 'timer-caution');
      
      if (this.timeRemaining <= 5) {
        timerEl.classList.add('timer-warning'); // Red + pulse
      } else if (percentRemaining <= 0.3) {
        timerEl.classList.add('timer-caution'); // Yellow
      }
      // else: green (default)
    }
  }

  private async pollGameState(): Promise<void> {
    const currentState = state.getState();
    
    if (!currentState.sessionId || !currentState.playerId) {
      router.navigate('/');
      return;
    }

    try {
      const gameState = await api.getGameState(
        currentState.sessionId,
        currentState.playerId
      );

      // Check if quiz ended
      if (gameState.status === 'finished') {
        router.navigate(`/results?sessionId=${currentState.sessionId}`);
        return;
      }

      // Check if we're in lobby (shouldn't happen, but handle it)
      if (gameState.status === 'lobby') {
        router.navigate(`/lobby?sessionId=${currentState.sessionId}`);
        return;
      }

      // Initial question load or question changed - navigate to force component remount
      if (gameState.currentQuestion) {
        if (!this.currentQuestion) {
          // First time loading question data
          this.currentQuestion = gameState.currentQuestion;
          this.currentQuestionIndex = (gameState.currentQuestionNumber || 1) - 1; // Convert 1-based to 0-based
          this.questionStartedAt = gameState.questionStartedAt;
          this.serverTime = gameState.serverTime; // Store server time for synchronized timer
          this.timeLimit = gameState.timeLimit || 20;
          this.selectedAnswerIds.clear();
          this.hasSubmitted = false;
          
          // Render once with the question data
          if (!this.hasRenderedQuestion) {
            this.hasRenderedQuestion = true;
            this.render();
            if (!gameState.timerPaused) {
              this.startTimer();
            }
          }
        } else if (gameState.currentQuestion.id !== this.currentQuestion.id) {
          // Question changed - navigate to waiting screen (host will advance)
          // The host shows results between questions
          router.navigate(`/waiting`);
        } else {
          // Same question — sync timer state from server
          const newTimeLimit = gameState.timeLimit || 20;
          const timerPaused = gameState.timerPaused ?? false;
          const timerPausedAt = (gameState as { timerPausedAt?: number | null }).timerPausedAt ?? null;
          this.serverTime = gameState.serverTime;
          this.questionStartedAt = gameState.questionStartedAt;

          if (newTimeLimit !== this.timeLimit) {
            // Time limit changed (host used +5/-5 or end) — recalculate
            this.timeLimit = newTimeLimit;
            // When paused, freeze elapsed at the moment of pause
            const effectiveNow = timerPaused && timerPausedAt ? timerPausedAt : this.serverTime;
            const elapsed = effectiveNow - (this.questionStartedAt || 0);
            const serverRemaining = Math.max(0, this.timeLimit - Math.floor(elapsed / 1000));
            // Only hard-reset if drift > 2s to avoid visual jitter
            if (Math.abs(this.timeRemaining - serverRemaining) > 2) {
              this.timeRemaining = serverRemaining;
              this.updateTimerDisplay();
            }
            if (this.timeRemaining <= 0 && !this.hasSubmitted) {
              this.stopTimer();
              this.submitAnswer();
            }
          }

          // Handle pause/resume from host
          if (timerPaused && this.timerInterval !== null) {
            this.stopTimer();
            this.updateTimerDisplay();
          } else if (!timerPaused && this.timerInterval === null && this.timeRemaining > 0 && !this.hasSubmitted) {
            // Resume: restart interval at current timeRemaining without recalculating
            this.resumeTimerInterval();
          }
        }
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      // Continue polling even on error
    }
  }

  private toggleAnswer(answerId: string, button: HTMLElement): void {
    if (this.hasSubmitted) return; // Don't allow changes after submission
    
    // Add visual feedback (ripple effect)
    this.addRippleEffect(button);
    
    if (this.selectedAnswerIds.has(answerId)) {
      this.selectedAnswerIds.delete(answerId);
    } else {
      this.selectedAnswerIds.add(answerId);
    }
    
    this.updateAnswerButtons();
    
    // Enable/disable submit button based on selection
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

      // If already submitted, keep disabled
      if (this.hasSubmitted) {
        submitBtn.disabled = true;
        return;
      }
      
      // Must have at least one answer selected
      if (this.selectedAnswerIds.size === 0) {
        submitBtn.disabled = true;
        return;
      }
      
      // If multiple correct answers exist, must select exact count
      // Note: correctAnswerIds may not be available before submission (security)
      if (this.currentQuestion && this.currentQuestion.correctAnswerIds) {
        const correctCount = this.currentQuestion.correctAnswerIds.length;
        if (correctCount > 1 && this.selectedAnswerIds.size !== correctCount) {
          submitBtn.disabled = true;
          return;
        }
      }
      
      // All validations passed
      submitBtn.disabled = false;
    }
  }

  private async submitAnswer(): Promise<void> {
    if (this.hasSubmitted) return; // Prevent double submission
    
    const currentState = state.getState();
    if (!currentState.sessionId || !currentState.playerId || !this.currentQuestion) {
      return;
    }

    this.hasSubmitted = true;
    this.stopTimer();
    this.stopPolling();

    // Show loading state on submit button
    const submitBtn = this.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.classList.add('loading');
      (submitBtn as HTMLButtonElement).disabled = true;
    }

    // Disable all answer buttons
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

      // Navigate to waiting screen
      router.navigate(`/waiting?correct=${result.correct}&score=${result.score}&lastQuestionId=${this.currentQuestion.id}`);
    } catch (error) {
      // Enhanced error logging
      console.error('Error submitting answer:', error);
      if (error instanceof Error) {
        console.error('  Error name:', error.name);
        console.error('  Error message:', error.message);
        if ('status' in error) {
          console.error('  HTTP status:', (error as { status: number }).status);
        }
        if ('data' in error) {
          console.error('  Error data:', JSON.stringify((error as { data: unknown }).data, null, 2));
        }
      }
      
      // Show error message but don't retry
      const errorEl = this.querySelector('.error-message');
      if (errorEl) {
        errorEl.textContent = 'Failed to submit answer. Moving to next question...';
      }
      
      // Navigate to waiting screen anyway after a delay (track timeout to prevent duplicates)
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
    // Answer button clicks
    const answerButtons = this.querySelectorAll('.answer-btn');
    answerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const answerId = (btn as HTMLElement).dataset.answerId;
        if (answerId) {
          this.toggleAnswer(answerId, btn as HTMLElement);
        }
      });
    });

    // Submit button
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
