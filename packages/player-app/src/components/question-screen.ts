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
    
    // Calculate initial time remaining
    const elapsed = Date.now() - (this.questionStartedAt || 0);
    this.timeRemaining = Math.max(0, this.timeLimit - Math.floor(elapsed / 1000));
    
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
      
      // Add warning class when < 5 seconds
      if (this.timeRemaining < 5) {
        timerEl.classList.add('timer-warning');
      } else {
        timerEl.classList.remove('timer-warning');
      }
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
          this.currentQuestionIndex = gameState.currentQuestionIndex;
          this.questionStartedAt = gameState.questionStartedAt;
          this.timeLimit = gameState.timeLimit || 20;
          this.selectedAnswerIds.clear();
          this.hasSubmitted = false;
          
          // Render once with the question data
          if (!this.hasRenderedQuestion) {
            this.hasRenderedQuestion = true;
            this.render();
            this.startTimer();
          }
        } else if (gameState.currentQuestion.id !== this.currentQuestion.id) {
          // Question changed - navigate to waiting screen (host will advance)
          // The host shows results between questions
          router.navigate(`/waiting`);
        }
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      // Continue polling even on error
    }
  }

  private toggleAnswer(answerId: string): void {
    if (this.hasSubmitted) return; // Don't allow changes after submission
    
    if (this.selectedAnswerIds.has(answerId)) {
      this.selectedAnswerIds.delete(answerId);
    } else {
      this.selectedAnswerIds.add(answerId);
    }
    
    this.updateAnswerButtons();
  }

  private updateAnswerButtons(): void {
    const buttons = this.querySelectorAll('.answer-btn');
    buttons.forEach((btn) => {
      const answerId = (btn as HTMLElement).dataset.answerId;
      if (answerId) {
        if (this.selectedAnswerIds.has(answerId)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      }
    });
  }

  private updateQuestionDisplay(): void {
    // Update question text
    const questionTextEl = this.querySelector('.question-text');
    if (questionTextEl && this.currentQuestion) {
      questionTextEl.textContent = this.currentQuestion.text;
    }

    // Update question number
    const questionNumberEl = this.querySelector('.question-number');
    if (questionNumberEl) {
      questionNumberEl.textContent = `Question ${this.currentQuestionIndex + 1}`;
    }

    // Update answers
    const answersGrid = this.querySelector('.answers-grid');
    if (answersGrid && this.currentQuestion) {
      answersGrid.innerHTML = this.currentQuestion.answers.map((answer) => `
        <button 
          class="answer-btn" 
          data-answer-id="${answer.id}"
          ${this.hasSubmitted ? 'disabled' : ''}
        >
          ${this.escapeHtml(answer.text)}
        </button>
      `).join('');
      
      // Reattach event listeners to new answer buttons
      const answerButtons = answersGrid.querySelectorAll('.answer-btn');
      answerButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const answerId = (btn as HTMLElement).dataset.answerId;
          if (answerId) {
            this.toggleAnswer(answerId);
          }
        });
      });
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
          console.error('  HTTP status:', (error as any).status);
        }
        if ('data' in error) {
          console.error('  Error data:', JSON.stringify((error as any).data, null, 2));
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
          const questionId = this.currentQuestion?.id || '';
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
            Select one or more answers
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
          this.toggleAnswer(answerId);
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
