/**
 * Question Display Screen Component
 * Displays current question with answers, timer, and game controls
 * Projector-optimized with large text
 */

import { router } from '../router';
import { state } from '../state';
import { api, cancelAllRequests } from '../api-client';
import morphdom from 'morphdom';
import { connectToSession, type SessionDocState } from '../yjs-provider';

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
  private disconnectYjs: (() => void) | null = null;
  private currentGameState: HostGameState | null = null;
  private timerInterval: number | null = null;
  private timeRemaining: number = 0;
  private currentTimeLimit: number = 20;
  private wasTimerActive: boolean = false;
  private playerCount: number = 0;
  private answeredCount: number = 0;
  private autoNavigateTimeout: number | null = null;
  private automaticPace: boolean = false;
  private pace: 'normal' | 'calm' | 'manual' = 'normal';
  private serverTime: number = 0;
  private earlyStop: boolean = false;
  private paused: boolean = false;
  private optimisticUntil: number = 0;

  async connectedCallback() {
    const sessionId = state.getState().sessionId;
    const hostToken = state.getState().hostToken;

    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    this.render();
    await this.loadInitialGameState();

    // Subscribe to Yjs for real-time updates
    this.disconnectYjs = connectToSession(sessionId, hostToken, (docState) => {
      this.handleDocState(docState);
    });
  }

  disconnectedCallback() {
    if (this.disconnectYjs) {
      this.disconnectYjs();
      this.disconnectYjs = null;
    }
    this.stopTimer();
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
      this.autoNavigateTimeout = null;
    }
    cancelAllRequests();
  }

  private async loadInitialGameState() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    try {
      // Fetch full session (with correctAnswerIds) — this is the one REST call we keep
      const session = await api.getSession(sessionId, hostToken);
      const players = await api.getPlayers(sessionId);

      this.pace = (session.pace as 'normal' | 'calm' | 'manual') || 'normal';
      this.automaticPace = this.pace === 'normal' ? (session.automaticPace ?? true) : false;

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
        timeRemaining: null,
      };

      // Initial timer calculation
      if (newGameState.currentQuestion && session.questionStartedAt) {
        const isManualPace = this.pace === 'manual';
        const timeLimit = session.currentQuestionTimeLimit ?? newGameState.currentQuestion.timeLimit ?? 20;
        this.serverTime = session.serverTime;

        if (isManualPace) {
          this.stopTimer();
          this.currentTimeLimit = 0;
          this.timeRemaining = 0;
          newGameState.timeRemaining = 0;
        } else {
          this.currentTimeLimit = timeLimit;
          const serverPaused = !!session.timerPausedAt;
          const effectiveNow = serverPaused ? Number(session.timerPausedAt) : this.serverTime;
          const elapsed = Math.floor((effectiveNow - Number(session.questionStartedAt)) / 1000);
          const serverRemaining = Math.max(0, timeLimit - elapsed);

          this.paused = serverPaused;
          this.timeRemaining = serverRemaining;
          newGameState.timeRemaining = serverRemaining;

          if (serverRemaining > 0 && !serverPaused) {
            this.startTimer();
          }
        }
      }

      this.playerCount = players.length;
      this.answeredCount = players.filter(p => p.hasAnswered).length;
      this.currentGameState = newGameState;
      this.wasTimerActive = this.timeRemaining > 0;
      this.render();
    } catch (error) {
      console.error('Failed to load game state:', error);
      this.renderError('Failed to load question. Please try again.');
    }
  }

  private handleDocState(docState: SessionDocState) {
    if (!this.currentGameState) return;

    const inOptimisticWindow = Date.now() < this.optimisticUntil;

    // Update player counts from doc
    const newPlayerCount = (docState.players ?? []).length;
    const newAnsweredCount = docState.answeredCount ?? this.answeredCount;

    // Update timer state from server (unless in optimistic window)
    if (!inOptimisticWindow && !this.earlyStop && this.pace !== 'manual') {
      const serverPaused = docState.timerPaused ?? false;
      const timerPausedAt = docState.timerPausedAt ?? null;
      const serverTime = docState.serverTime ?? this.serverTime;
      const questionStartedAt = docState.questionStartedAt ?? null;
      const timeLimit = docState.timeLimit ?? this.currentTimeLimit;

      this.serverTime = serverTime;
      this.currentTimeLimit = timeLimit;

      if (questionStartedAt !== null) {
        const effectiveNow = serverPaused && timerPausedAt ? timerPausedAt : serverTime;
        const elapsed = Math.floor((effectiveNow - questionStartedAt) / 1000);
        const serverRemaining = Math.max(0, timeLimit - elapsed);

        if (serverPaused && !this.paused) {
          this.paused = true;
          this.timeRemaining = serverRemaining;
          this.stopTimer();
        } else if (!serverPaused && this.paused) {
          this.paused = false;
          this.timeRemaining = serverRemaining;
          if (this.timeRemaining > 0) this.startTimer();
        } else if (serverPaused) {
          this.timeRemaining = serverRemaining;
        } else {
          const drift = Math.abs(this.timeRemaining - serverRemaining);
          if (drift > 2 || !this.timerInterval) {
            this.timeRemaining = serverRemaining;
            if (this.timeRemaining > 0 && !this.timerInterval) this.startTimer();
          }
        }
      }
    }

    const isTimerActive = this.timeRemaining > 0;
    const timerStateChanged = this.wasTimerActive !== isTimerActive;
    const allPlayersAnswered = docState.allPlayersAnswered ?? false;

    // Auto-navigate logic
    if (this.automaticPace && !this.autoNavigateTimeout) {
      if (allPlayersAnswered && isTimerActive) {
        console.log('✅ All players answered - will show leaderboard in 4s');
        this.earlyStop = true;
        this.timeRemaining = 0;
        this.wasTimerActive = false;
        this.stopTimer();
        this.render();
        this.autoNavigateTimeout = window.setTimeout(() => {
          console.log('🚀 Auto-navigating to leaderboard');
          router.navigate('/leaderboard');
        }, 4000);
        return;
      } else if (timerStateChanged && !isTimerActive) {
        console.log('⏱️ Timer expired with automatic pace - will show leaderboard in 4s');
        this.autoNavigateTimeout = window.setTimeout(() => {
          console.log('🚀 Auto-navigating to leaderboard');
          router.navigate('/leaderboard');
        }, 4000);
      }
    }

    const statsChanged =
      this.playerCount !== newPlayerCount ||
      this.answeredCount !== newAnsweredCount;

    const structuralChange =
      !this.currentGameState ||
      timerStateChanged;

    this.wasTimerActive = isTimerActive;
    this.playerCount = newPlayerCount;
    this.answeredCount = newAnsweredCount;

    if (this.currentGameState) {
      this.currentGameState.timeRemaining = this.earlyStop ? 0 : this.timeRemaining;
    }

    if (structuralChange) {
      this.render();
    } else if (statsChanged) {
      this.updatePlayerStats();
    }
  }

  private startTimer() {
    this.stopTimer();
    this.wasTimerActive = true;

    this.timerInterval = window.setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining -= 1;
        this.updateTimerDisplay();
      } else {
        this.stopTimer();
        this.wasTimerActive = false;
        this.render();

        if (this.automaticPace && !this.autoNavigateTimeout) {
          console.log('⏱️ Timer expired with automatic pace - will show leaderboard in 4s');
          this.autoNavigateTimeout = window.setTimeout(() => {
            console.log('🚀 Auto-navigating to leaderboard');
            router.navigate('/leaderboard');
          }, 4000);
        }
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
      if (this.timeRemaining <= 5) {
        timerEl.classList.add('warning');
      }
    }

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
    const answeredCountEl = this.querySelector('.answered-count');
    if (answeredCountEl) {
      answeredCountEl.textContent = `${this.answeredCount}/${this.playerCount}`;
    }
  }

  private async handleNextQuestion() {
    router.navigate('/leaderboard');
  }

  private handleAddTime() {
    if (this.pace === 'manual') return;
    this.optimisticUntil = Date.now() + 3000;
    this.timeRemaining += 5;
    if (this.timeRemaining > this.currentTimeLimit) {
      this.currentTimeLimit = this.timeRemaining;
    }
    if (this.earlyStop) {
      this.earlyStop = false;
    }
    if (!this.timerInterval && this.timeRemaining > 0 && !this.paused) {
      this.wasTimerActive = true;
      this.startTimer();
      this.render();
    } else {
      this.updateTimerDisplay();
    }
    const { sessionId, hostToken } = state.getState();
    if (sessionId && hostToken) {
      api.adjustTimer(sessionId, hostToken, 'add', 5).catch(() => {});
    }
  }

  private handleRemoveTime() {
    if (this.pace === 'manual') return;
    this.optimisticUntil = Date.now() + 3000;
    this.timeRemaining = Math.max(0, this.timeRemaining - 5);
    if (this.timeRemaining === 0) {
      this.paused = false;
      this.stopTimer();
      this.wasTimerActive = false;
      this.render();
    } else {
      this.updateTimerDisplay();
    }
    const { sessionId, hostToken } = state.getState();
    if (sessionId && hostToken) {
      api.adjustTimer(sessionId, hostToken, 'remove', 5).catch(() => {});
    }
  }

  private handleJumpToScoreboard() {
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
      this.autoNavigateTimeout = null;
    }
    router.navigate('/leaderboard');
  }

  private handleEndTimer() {
    if (this.pace === 'manual') return;
    this.optimisticUntil = Date.now() + 3000;
    this.paused = false;
    this.timeRemaining = 0;
    this.stopTimer();
    this.wasTimerActive = false;
    this.render();

    if (this.automaticPace && !this.autoNavigateTimeout) {
      this.autoNavigateTimeout = window.setTimeout(() => {
        router.navigate('/leaderboard');
      }, 4000);
    }
    const { sessionId, hostToken } = state.getState();
    if (sessionId && hostToken) {
      api.adjustTimer(sessionId, hostToken, 'end').catch(() => {});
    }
  }

  private handlePause() {
    if (this.pace === 'manual') return;
    this.optimisticUntil = Date.now() + 3000;
    if (this.paused) {
      this.paused = false;
      if (this.timeRemaining > 0) {
        this.wasTimerActive = true;
        this.startTimer();
      }
      this.render();
      const { sessionId, hostToken } = state.getState();
      if (sessionId && hostToken) {
        api.adjustTimer(sessionId, hostToken, 'resume').catch(() => {});
      }
    } else {
      this.paused = true;
      this.stopTimer();
      this.render();
      const { sessionId, hostToken } = state.getState();
      if (sessionId && hostToken) {
        api.adjustTimer(sessionId, hostToken, 'pause').catch(() => {});
      }
    }
  }

  private getAnswerLabel(index: number): string {
    return String.fromCharCode(65 + index);
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

    const html = `
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
          ${question.correctAnswerIds.length > 1 ? `
            <div class="multiple-answers-info">
              ℹ️ This question has ${question.correctAnswerIds.length} correct answers
            </div>
          ` : ''}
        </div>

        <div class="answers-grid">
          ${question.answers.map((answer, index) => {
            const isCorrect = question.correctAnswerIds.includes(answer.id);
            const revealCorrect = !isTimerActive && isCorrect;
            return `
              <div class="answer-card ${revealCorrect ? 'correct' : ''}">
                <div class="answer-label">${this.getAnswerLabel(index)}</div>
                <div class="answer-text">${this.escapeHtml(answer.text)}</div>
                ${revealCorrect ? '<div class="correct-indicator">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="timer-controls-row">
          ${this.pace === 'manual' ? `
          <div class="timer-section manual-pace">
            <div class="timer-value">⏸ Manual pace</div>
          </div>
          ` : `
          <div class="timer-section ${!isTimerActive && !this.paused ? 'expired' : ''}">
            <div class="timer-bar">
              <div class="timer-progress" style="width: ${isTimerActive || this.paused ? (this.timeRemaining / this.currentTimeLimit) * 100 : 0}%"></div>
            </div>
            <div class="timer-value ${this.timeRemaining <= 5 && !this.paused ? 'warning' : ''} ${this.paused ? 'paused' : ''}">
              ${this.paused
                ? `⏸ ${this.formatTime(this.timeRemaining)}`
                : (isTimerActive
                  ? this.formatTime(this.timeRemaining)
                  : (this.earlyStop ? '✅ All players answered!' : 'Time\'s up!'))}
            </div>
          </div>
          `}

          <div class="controls">
            ${this.pace === 'manual'
              ? `<button class="btn-primary btn-action" id="next-button">Show Leaderboard</button>`
              : (!isTimerActive && !this.paused
                ? (this.automaticPace
                  ? `<div class="autopace-status">
                       <div class="autopace-spinner"></div>
                       <span>${this.earlyStop ? 'Showing leaderboard in a moment…' : 'Loading leaderboard…'}</span>
                     </div>`
                  : `<button class="btn-primary btn-action" id="next-button">Show Leaderboard</button>`)
                : `
                  <div class="timer-button-bar">
                    <button class="timer-btn timer-btn-adjust" id="minus-5-button" title="Remove 5 seconds">
                      <span class="timer-btn-icon">−5</span>
                      <span class="timer-btn-label">sec</span>
                    </button>
                    <button class="timer-btn timer-btn-pause ${this.paused ? 'active' : ''}" id="pause-button" title="${this.paused ? 'Resume timer' : 'Pause timer'}">
                      <span class="timer-btn-icon">${this.paused ? '▶' : '⏸'}</span>
                      <span class="timer-btn-label">${this.paused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button class="timer-btn timer-btn-end" id="end-timer-button" title="End timer now">
                      <span class="timer-btn-icon">⏹</span>
                      <span class="timer-btn-label">End</span>
                    </button>
                    <button class="timer-btn timer-btn-adjust" id="plus-5-button" title="Add 5 seconds">
                      <span class="timer-btn-icon">+5</span>
                      <span class="timer-btn-label">sec</span>
                    </button>
                    <button class="timer-btn timer-btn-skip" id="jump-button" title="Jump to scoreboard">
                      <span class="timer-btn-icon">⏭</span>
                      <span class="timer-btn-label">Skip</span>
                    </button>
                  </div>
                `)
            }
          </div>
        </div>
      </div>
    `;

    if (this.firstElementChild && this.querySelector('.question-display-screen')) {
      const template = document.createElement('div');
      template.innerHTML = html;
      if (template.firstElementChild) {
        morphdom(this.firstElementChild, template.firstElementChild);
      }
    } else {
      this.innerHTML = html;
    }

    const nextButton = this.querySelector('#next-button');
    if (nextButton) {
      nextButton.addEventListener('click', () => this.handleNextQuestion());
    }

    this.querySelector('#minus-5-button')?.addEventListener('click', () => this.handleRemoveTime());
    this.querySelector('#plus-5-button')?.addEventListener('click', () => this.handleAddTime());
    this.querySelector('#jump-button')?.addEventListener('click', () => this.handleJumpToScoreboard());
    this.querySelector('#pause-button')?.addEventListener('click', () => this.handlePause());
    this.querySelector('#end-timer-button')?.addEventListener('click', () => this.handleEndTimer());

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
        gap: clamp(0.5rem, 1vh, 1rem);
        padding: clamp(0.5rem, 1vh, 1rem);
        height: 100dvh;
        height: 100vh;
        overflow: hidden;
        box-sizing: border-box;
      }

      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .question-number {
        font-size: clamp(1rem, 1.5vw, 1.25rem);
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .player-stats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .answered-count {
        font-size: clamp(1.25rem, 2vw, 1.75rem);
        font-weight: 700;
        color: var(--color-primary);
      }

      .player-stats .label {
        font-size: clamp(0.75rem, 1vw, 0.875rem);
        color: var(--color-text-secondary);
      }

      .question-content {
        background: var(--color-surface);
        padding: clamp(0.75rem, 1.5vh, 1.25rem) clamp(1rem, 2vw, 2rem);
        border-radius: 1rem;
        box-shadow: var(--shadow-lg);
        flex: 0 1 auto;
        min-height: 0;
        overflow: hidden;
      }

      .question-text {
        font-size: clamp(1.125rem, 3vw, 2.5rem);
        font-weight: 600;
        line-height: 1.3;
        text-align: center;
        color: var(--color-text);
      }

      .answers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
        gap: clamp(0.5rem, 1vh, 0.75rem);
        margin: clamp(0.5rem, 1vh, 0.75rem) 0;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      
      /* Adaptive grid: 2 columns for ≤4 answers, 3 columns for 5-6 answers */
      .answers-grid:has(.answer-card:nth-child(5)) {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .answers-grid:has(.answer-card:nth-child(5):last-child) {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .answers-grid:has(.answer-card:nth-child(6)) {
        grid-template-columns: repeat(3, 1fr);
      }

      .answer-card {
        padding-left: clamp(4rem, 8vw, 5rem); /* push text right to clear the absolute-positioned label */
        display: flex;
        align-items: center;
        min-height: 0;
      }

      .answer-card.correct {
        background: var(--color-success-light);
        border-color: var(--color-success);
        animation: pulse-correct 0.6s ease;
      }

      .answer-card.correct .answer-text {
        color: #1a202c;
        font-weight: 600;
      }

      .answer-card.correct .answer-label {
        background: var(--color-success);
        color: white;
      }

      @keyframes pulse-correct {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .answer-label {
        position: absolute;
        left: clamp(0.5rem, 1vw, 1rem);
        top: 50%;
        transform: translateY(-50%);
        width: clamp(2rem, 4vw, 2.75rem);
        height: clamp(2rem, 4vw, 2.75rem);
        background: var(--color-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(1rem, 1.8vw, 1.4rem);
        font-weight: 700;
        color: white;
      }

      .answer-text {
        font-size: clamp(0.875rem, 1.5vw, 1.375rem);
        line-height: 1.3;
        flex: 1;
        padding-left: 0;
      }

      .correct-indicator {
        font-size: 2rem;
        color: var(--color-success);
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        animation: bounce-in 0.5s ease;
      }

      @keyframes bounce-in {
        0% { transform: translateY(-50%) scale(0); }
        50% { transform: translateY(-50%) scale(1.2); }
        100% { transform: translateY(-50%) scale(1); }
      }

      .timer-controls-row {
        display: flex;
        align-items: stretch;
        gap: clamp(0.75rem, 1.5vw, 1.5rem);
        flex-shrink: 0;
      }

      /* Reset global .timer-section styles */
      .timer-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        background: var(--color-surface);
        border-radius: var(--border-radius);
        padding: var(--spacing-md);
        margin: 0;
      }

      /* Keep background but drop the orange border when expired */
      .timer-section.expired {
        background: var(--color-surface);
        border: none;
      }

      /* Reset global .timer-bar margin */
      .timer-bar {
        width: 100%;
        height: 0.75rem;
        background: var(--color-border);
        border-radius: 0.5rem;
        overflow: hidden;
        margin: 0;
      }

      .timer-progress {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
        transition: width 1s linear;
      }

      /* Override global font-family and font-size on timer-value */
      .timer-value {
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: 700;
        color: var(--color-text);
        font-family: var(--font-family);
        line-height: 1;
        text-align: center;
      }

      .timer-section.expired .timer-value {
        font-size: clamp(1.25rem, 2vw, 1.75rem);
        color: var(--color-error);
        font-weight: 700;
        font-family: var(--font-family);
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
        font-size: 1rem;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .controls {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .btn-action {
        flex: 1;
        white-space: nowrap;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
        width: auto;
        min-width: 0;
      }

      .timer-button-bar {
        display: flex;
        align-items: stretch;
        gap: 0.5rem;
        width: 100%;
      }

      .timer-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.15rem;
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 2px solid var(--color-border);
        border-radius: 0.75rem;
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
        transition: all 0.15s ease;
        min-width: 3.5rem;
      }

      .timer-btn:hover {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .timer-btn:active {
        transform: translateY(0);
        box-shadow: none;
      }

      .timer-btn-icon {
        font-size: clamp(1rem, 2vw, 1.5rem);
        font-weight: 700;
        line-height: 1;
      }

      .timer-btn-label {
        font-size: clamp(0.6rem, 1vw, 0.75rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .timer-btn-adjust {
        border-color: var(--color-border);
      }

      .timer-btn-adjust:hover {
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
      }

      .timer-btn-pause {
        border-color: var(--color-warning, #f59e0b);
      }

      .timer-btn-pause:hover {
        background: color-mix(in srgb, var(--color-warning, #f59e0b) 12%, var(--color-surface));
      }

      .timer-btn-pause.active {
        background: var(--color-warning, #f59e0b);
        color: white;
        border-color: var(--color-warning, #f59e0b);
      }

      .timer-btn-pause.active .timer-btn-label {
        color: rgba(255,255,255,0.85);
      }

      .timer-btn-end {
        border-color: var(--color-error);
      }

      .timer-btn-end:hover {
        background: color-mix(in srgb, var(--color-error) 12%, var(--color-surface));
      }

      .timer-btn-skip {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: white;
      }

      .timer-btn-skip .timer-btn-label {
        color: rgba(255,255,255,0.85);
      }

      .timer-btn-skip:hover {
        background: color-mix(in srgb, var(--color-primary) 85%, black);
        border-color: color-mix(in srgb, var(--color-primary) 85%, black);
      }

      .timer-value.paused {
        color: var(--color-warning, #f59e0b);
        animation: pulse-warning 1.5s ease infinite;
      }

      .autopace-status {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: clamp(1rem, 1.8vw, 1.5rem);
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .autopace-spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 3px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
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
