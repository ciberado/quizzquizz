import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';
import type { PlayerReviewResponse } from '@quizzquizz/common';

/**
 * Results Screen Component
 * Displayed when the quiz ends.
 * Shows detailed review: stats, relative leaderboard, and complete question breakdown.
 */
export class ResultsScreen extends BaseComponent {
  private reviewData: PlayerReviewResponse | null = null;
  private loading: boolean = true;
  private error: string | null = null;

  protected async onMount(): Promise<void> {
    await this.loadReview();
    this.render();
  }

  private async loadReview(): Promise<void> {
    const currentState = state.getState();
    
    if (!currentState.sessionId || !currentState.playerId) {
      router.navigate('/');
      return;
    }

    try {
      this.loading = true;
      this.render();

      const response = await api.getPlayerReview(currentState.sessionId, currentState.playerId);
      this.reviewData = response;
      this.loading = false;
      this.error = null;
    } catch (error) {
      console.error('Error loading review:', error);
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Failed to load review';
    }

    this.render();
  }

  protected render(): void {
    let html = '';

    if (this.loading) {
      html = `
        <div class="screen results-screen">
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading your results...</p>
          </div>
        </div>
      `;
      this.setContent(html);
      this.attachEventListeners();
      return;
    }

    if (this.error) {
      html = `
        <div class="screen results-screen">
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2>Unable to Load Results</h2>
            <p>${this.error}</p>
            <button class="retry-btn">Retry</button>
            <button class="home-btn secondary">Back to Home</button>
          </div>
        </div>
      `;
      this.setContent(html);
      this.attachEventListeners();
      return;
    }

    if (!this.reviewData) {
      this.setContent('<div class="screen results-screen"><p>No data available</p></div>');
      return;
    }

    // Build the enhanced results view
    html = `
      <div class="screen results-screen">
        <div class="results-container">
          <h1>🏆 Quiz Complete!</h1>
          
          ${this.renderStats()}
          ${this.renderRelativeLeaderboard()}
          ${this.renderQuestionReview()}
          
          <div class="results-actions">
            <button class="play-again-btn">Play Again</button>
            <a class="analytics-link" href="/analytics/#/player/dashboard"
               target="_blank" rel="noopener noreferrer">
              View My Analytics 📊
            </a>
          </div>
        </div>
      </div>
    `;
    
    this.setContent(html);
    this.attachEventListeners();
  }

  /**
   * Render stats summary section
   */
  private renderStats(): string {
    if (!this.reviewData) return '';

    const { stats } = this.reviewData;
    
    return `
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${stats.correctAnswers}/${stats.totalQuestions}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${stats.accuracyPercentage}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value">${stats.totalScore}</div>
          <div class="stat-label">Total Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏅</div>
          <div class="stat-value">#${stats.rank}</div>
          <div class="stat-label">of ${stats.totalPlayers}</div>
        </div>
      </div>
    `;
  }

  /**
   * Render relative leaderboard section (1 above + you + 1 below)
   */
  private renderRelativeLeaderboard(): string {
    if (!this.reviewData) return '';

    const { relativeLeaderboard } = this.reviewData;
    
    const leaderboardHtml = relativeLeaderboard.map((entry) => {
      const medal = this.getMedalForRank(entry.rank);
      
      return `
        <div class="leaderboard-entry ${entry.isCurrentPlayer ? 'current-player' : ''}">
          <div class="entry-rank">
            ${medal || `<span class="rank-number">#${entry.rank}</span>`}
          </div>
          <div class="entry-nickname">
            ${this.escapeHtml(entry.nickname)}
            ${entry.isCurrentPlayer ? '<span class="you-badge">You</span>' : ''}
          </div>
          <div class="entry-score">${entry.score}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="relative-leaderboard-section">
        <h3>Your Position</h3>
        <div class="relative-leaderboard">
          ${leaderboardHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render complete question review section
   */
  private renderQuestionReview(): string {
    if (!this.reviewData) return '';

    const { questions } = this.reviewData;
    
    const questionsHtml = questions.map((question, index) => {
      const icon = question.isCorrect 
        ? '<span class="result-icon correct">✓</span>' 
        : '<span class="result-icon incorrect">✗</span>';
      
      const answersHtml = question.answers.map((answer) => {
        const isPlayerAnswer = question.playerSelectedAnswerIds.includes(answer.id);
        const isCorrect = question.correctAnswerIds.includes(answer.id);
        
        let classes = 'answer-option';
        if (isCorrect) classes += ' correct-answer';
        if (isPlayerAnswer) classes += ' player-answer';
        
        return `
          <div class="${classes}">
            <span class="answer-indicator">
              ${isPlayerAnswer ? (question.isCorrect ? '✓' : '✗') : ''}
            </span>
            <span class="answer-text">${this.escapeHtml(answer.text)}</span>
            ${isCorrect ? '<span class="correct-badge">Correct</span>' : ''}
          </div>
        `;
      }).join('');
      
      return `
        <div class="question-review-card ${question.isCorrect ? 'correct' : 'incorrect'}">
          <div class="question-header">
            <div class="question-number">Question ${index + 1}</div>
            ${icon}
            <div class="points-earned">+${question.pointsEarned} pts</div>
          </div>
          <div class="question-text">${this.escapeHtml(question.questionText)}</div>
          <div class="answers-list">
            ${answersHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="question-review-section">
        <h3>Question Review</h3>
        <div class="question-review-list">
          ${questionsHtml}
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    const playAgainBtn = this.querySelector('.play-again-btn');
    const retryBtn = this.querySelector('.retry-btn');
    const homeBtn = this.querySelector('.home-btn');

    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        // Clear state and go back to join screen
        state.clearState();
        api.clearCache();
        api.cancelAllRequests();
        router.navigate('/');
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadReview();
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        state.clearState();
        api.clearCache();
        api.cancelAllRequests();
        router.navigate('/');
      });
    }
  }

  /**
   * Get medal emoji for top 3 ranks
   */
  private getMedalForRank(rank: number): string | null {
    switch (rank) {
      case 1:
        return '<span class="medal gold">🥇</span>';
      case 2:
        return '<span class="medal silver">🥈</span>';
      case 3:
        return '<span class="medal bronze">🥉</span>';
      default:
        return null;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('results-screen', ResultsScreen);
