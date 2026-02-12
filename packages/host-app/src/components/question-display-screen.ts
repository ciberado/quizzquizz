/**
 * Question Display Screen Component
 * Displays current question with answers, timer, and game controls
 * Projector-optimized with large text
 */

import { router } from '../router';
import { state } from '../state';
import { api, cancelAllRequests } from '../api-client';

// Local interface for game state (matches API response)
interface HostGameState {
  status: 'lobby' | 'playing' | 'finished';
  currentQuestion: {
    id: string;
    text: string;
    answers: Array<{ id: string; text: string }>;
    correctAnswerIds: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    topics?: string[];
    tags?: string[];
    timeLimit?: number;
  } | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number | null;
}

export class QuestionDisplayScreen extends HTMLElement {
  private pollInterval: number | null = null;
  private currentGameState: HostGameState | null = null;
  private timerInterval: number | null = null;
  private timeRemaining: number = 0;
  private currentTimeLimit: number = 20; // Actual time limit being used for current question
  private wasTimerActive: boolean = false; // Track timer state to detect when it expires
  private playerCount: number = 0;
  private answeredCount: number = 0;
  private autoNavigateTimeout: number | null = null;
  private automaticPace: boolean = false; // Auto-advance enabled

  async connectedCallback() {
    const sessionId = state.getState().sessionId;
    const hostToken = state.getState().hostToken;

    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    this.render();
    await this.loadGameState();
    this.startPolling();
  }

  disconnectedCallback() {
    this.stopPolling();
    this.stopTimer();
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
      this.autoNavigateTimeout = null;
    }
    cancelAllRequests();
  }

  private async loadGameState() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    try {
      // Get session state from API (we'll use the player state endpoint for now)
      const session = await api.getSession(sessionId, hostToken);
      const players = await api.getPlayers(sessionId);
      
      // Store automatic pace setting
      this.automaticPace = session.automaticPace || false;
      
      // Build game state from session data
      const currentQ = session.currentQuestionIndex >= 0 && session.questions.length > 0
        ? session.questions[session.currentQuestionIndex]
        : null;
      
      const newGameState: HostGameState = {
        status: session.status,
        currentQuestion: currentQ ? {
          id: currentQ.id,
          text: currentQ.text,
          answers: currentQ.answers,
          correctAnswerIds: currentQ.correctAnswerIds,
          difficulty: currentQ.difficulty,
          topics: currentQ.topics,
          tags: currentQ.tags,
          timeLimit: currentQ.timeLimit,
        } : null,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
        timeRemaining: null, // Calculate from questionStartedAt
      };
      
      // Calculate time remaining
      if (newGameState.currentQuestion && session.questionStartedAt) {
        // Use computed timeLimit from API (matches question bank default) instead of hardcoded fallback
        const timeLimit = session.currentQuestionTimeLimit ?? newGameState.currentQuestion.timeLimit ?? 20;
        this.currentTimeLimit = timeLimit; // Store actual time limit for progress bar
        const elapsed = Math.floor((Date.now() - Number(session.questionStartedAt)) / 1000);
        this.timeRemaining = Math.max(0, timeLimit - elapsed);
        newGameState.timeRemaining = this.timeRemaining;
        
        if (this.timeRemaining > 0 && !this.timerInterval) {
          this.startTimer();
        } else if (this.timeRemaining <= 0) {
          // Timer already expired from server - just stop timer and show correct answers
          this.stopTimer();
        }
      }

      // Get player stats
      const newPlayerCount = players.length;
      // Count how many players have answered the current question
      const newAnsweredCount = players.filter(p => p.hasAnswered).length;

      // Check timer state
      const isTimerActive = this.timeRemaining > 0;
      const timerStateChanged = this.wasTimerActive !== isTimerActive;
      
      // If timer just expired and automatic pace is enabled, schedule navigation to leaderboard
      if (timerStateChanged && !isTimerActive && this.automaticPace) {
        // Timer just expired - show correct answers for 4 seconds then navigate
        if (!this.autoNavigateTimeout) {
          console.log('⏱️ Timer expired with automatic pace - will show leaderboard in 4s');
          this.autoNavigateTimeout = window.setTimeout(() => {
            console.log('🚀 Auto-navigating to leaderboard');
            router.navigate('/leaderboard');
          }, 4000); // 4 seconds
        }
      }

      // Check what changed
      const structuralChange = 
        !this.currentGameState ||
        this.currentGameState.status !== newGameState.status ||
        this.currentGameState.currentQuestionIndex !== newGameState.currentQuestionIndex ||
        timerStateChanged; // Timer expiring/starting is a structural change

      const statsChanged = 
        this.playerCount !== newPlayerCount ||
        this.answeredCount !== newAnsweredCount;

      if (structuralChange) {
        // Full re-render needed for structural changes
        this.currentGameState = newGameState;
        this.playerCount = newPlayerCount;
        this.answeredCount = newAnsweredCount;
        this.wasTimerActive = isTimerActive;
        this.render();
      } else if (statsChanged) {
        // Only update player stats without full re-render
        this.playerCount = newPlayerCount;
        this.answeredCount = newAnsweredCount;
        this.updatePlayerStats();
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
      this.renderError('Failed to load question. Please try again.');
    }
  }

  private startPolling() {
    this.pollInterval = window.setInterval(async () => {
      await this.loadGameState();
    }, 2000); // Poll every 2 seconds
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private startTimer() {
    this.stopTimer(); // Clear any existing timer
    this.wasTimerActive = true; // Mark timer as active
    
    this.timerInterval = window.setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining -= 1;
        this.updateTimerDisplay();
      } else {
        this.stopTimer();
        this.wasTimerActive = false; // Mark timer as expired
        // Timer expired - render to show correct answers with Continue button
        this.render();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay() {
    const timerEl = this.querySelector('.timer-value');
    if (timerEl) {
      timerEl.textContent = this.formatTime(this.timeRemaining);
      
      // Add warning class when time is low
      if (this.timeRemaining <= 5) {
        timerEl.classList.add('warning');
      }
    }

    // Update progress bar
    const progressEl = this.querySelector('.timer-progress') as HTMLElement;
    if (progressEl) {
      const percentage = (this.timeRemaining / this.currentTimeLimit) * 100;
      progressEl.style.width = `${percentage}%`;
    }
  }

  private formatTime(seconds: number): string {
    return Math.floor(seconds).toString();
  }

  private updatePlayerStats() {
    // Update only the answered count display without full re-render
    const answeredCountEl = this.querySelector('.answered-count');
    if (answeredCountEl) {
      answeredCountEl.textContent = `${this.answeredCount}/${this.playerCount}`;
    }
  }

  private async handleNextQuestion() {
    // Navigate to leaderboard instead of directly advancing
    // Leaderboard will handle the actual next question API call
    router.navigate('/leaderboard');
  }

  private async handleEndQuiz() {
    const confirmed = confirm('Are you sure you want to end the quiz? This will show the final leaderboard.');
    if (!confirmed) return;

    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    try {
      await api.endQuiz(sessionId, hostToken);
      // Navigate to leaderboard
      router.navigate(`/leaderboard/${sessionId}`);
    } catch (error) {
      console.error('Failed to end quiz:', error);
      alert('Failed to end quiz. Please try again.');
    }
  }

  private getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D, ...
  }

  private renderError(message: string) {
    this.innerHTML = `
      <div class="screen error-screen">
        <div class="error-message">
          <h2>⚠️ Error</h2>
          <p>${message}</p>
          <button class="btn-secondary" onclick="history.back()">Go Back</button>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.currentGameState || !this.currentGameState.currentQuestion) {
      this.innerHTML = `
        <div class="screen">
          <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading question...</p>
          </div>
        </div>
      `;
      return;
    }

    const question = this.currentGameState.currentQuestion;
    const isTimerActive = this.timeRemaining > 0;
    const questionNumber = this.currentGameState.currentQuestionIndex + 1;
    const totalQuestions = this.currentGameState.totalQuestions;

    this.innerHTML = `
      <div class="screen question-display-screen">
        <div class="question-header">
          <div class="question-number">
            Question ${questionNumber} of ${totalQuestions}
          </div>
          <div class="player-stats">
            <span class="answered-count">${this.answeredCount}/${this.playerCount}</span>
            <span class="label">answered</span>
          </div>
        </div>

        <div class="question-content">
          <div class="question-text">
            ${this.escapeHtml(question.text)}
          </div>
        </div>

        <div class="answers-grid">
          ${question.answers.map((answer, index) => {
            const isCorrect = question.correctAnswerIds.includes(answer.id);
            return `
              <div class="answer-card ${!isTimerActive && isCorrect ? 'correct' : ''}">
                <div class="answer-label">${this.getAnswerLabel(index)}</div>
                <div class="answer-text">${this.escapeHtml(answer.text)}</div>
                ${!isTimerActive && isCorrect ? '<div class="correct-indicator">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="timer-section ${!isTimerActive ? 'expired' : ''}">
          <div class="timer-bar">
            <div class="timer-progress" style="width: ${isTimerActive ? (this.timeRemaining / this.currentTimeLimit) * 100 : 0}%"></div>
          </div>
          <div class="timer-value ${this.timeRemaining <= 5 ? 'warning' : ''}">
            ${this.formatTime(this.timeRemaining)}
          </div>
          <div class="timer-label">${isTimerActive ? 'seconds remaining' : 'Time\'s up!'}</div>
        </div>

        <div class="controls">
          ${!isTimerActive ? `
            <button class="btn-primary" id="next-button">
              Show Leaderboard
            </button>
          ` : ''}
          <button class="btn-secondary" id="end-button">End Quiz</button>
        </div>
      </div>
    `;

    // Add event listeners
    const nextButton = this.querySelector('#next-button');
    if (nextButton) {
      nextButton.addEventListener('click', () => this.handleNextQuestion());
    }

    const endButton = this.querySelector('#end-button');
    if (endButton) {
      endButton.addEventListener('click', () => this.handleEndQuiz());
    }

    // Add inline styles for component-specific styling
    this.addStyles();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private addStyles() {
    const existingStyle = this.querySelector('style');
    if (existingStyle) return;

    const style = document.createElement('style');
    style.textContent = `
      .question-display-screen {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 2rem;
        min-height: 100vh;
      }

      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .question-number {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .player-stats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .answered-count {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-primary);
      }

      .player-stats .label {
        font-size: 1rem;
        color: var(--color-text-secondary);
      }

      .question-content {
        background: var(--color-surface);
        padding: 3rem;
        border-radius: 1rem;
        box-shadow: var(--shadow-lg);
      }

      .question-text {
        font-size: var(--font-size-question);
        font-weight: 600;
        line-height: 1.4;
        text-align: center;
        color: var(--color-text);
      }

      .answers-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin: 2rem 0;
      }

      .answer-card {
        background: var(--color-surface);
        padding: 2rem;
        border-radius: 1rem;
        border: 3px solid var(--color-border);
        display: flex;
        align-items: center;
        gap: 1.5rem;
        transition: all 0.3s ease;
        position: relative;
      }

      .answer-card.correct {
        background: var(--color-success-light);
        border-color: var(--color-success);
        animation: pulse-correct 0.6s ease;
      }

      @keyframes pulse-correct {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .answer-label {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--color-primary);
        min-width: 3rem;
        text-align: center;
      }

      .answer-text {
        font-size: 1.5rem;
        line-height: 1.4;
        flex: 1;
      }

      .correct-indicator {
        font-size: 3rem;
        color: var(--color-success);
        position: absolute;
        right: 1.5rem;
        animation: bounce-in 0.5s ease;
      }

      @keyframes bounce-in {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      .timer-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .timer-bar {
        width: 100%;
        height: 1rem;
        background: var(--color-border);
        border-radius: 0.5rem;
        overflow: hidden;
      }

      .timer-progress {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
        transition: width 1s linear;
      }

      .timer-value {
        font-size: 6rem;
        font-weight: 700;
        color: var(--color-text);
        line-height: 1;
      }

      .timer-value.warning {
        color: var(--color-error);
        animation: pulse-warning 0.5s ease infinite;
      }

      @keyframes pulse-warning {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .timer-label {
        font-size: 1.5rem;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .timer-section.expired .timer-label {
        color: var(--color-error);
        font-weight: 600;
      }

      .controls {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: auto;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        min-height: 50vh;
      }

      .loading-spinner {
        width: 4rem;
        height: 4rem;
        border: 4px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .error-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }

      .error-message {
        text-align: center;
        max-width: 40rem;
      }

      .error-message h2 {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .error-message p {
        font-size: 1.5rem;
        margin-bottom: 2rem;
        color: var(--color-text-secondary);
      }

      /* Single column on smaller screens */
      @media (max-width: 768px) {
        .answers-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    this.appendChild(style);
  }
}

customElements.define('question-display-screen', QuestionDisplayScreen);
