import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';
import type { LeaderboardEntry } from '@quizzquizz/common';

/**
 * Results Screen Component
 * Displayed when the quiz ends.
 * Shows final leaderboard with player's position highlighted.
 */
export class ResultsScreen extends BaseComponent {
  private leaderboard: LeaderboardEntry[] = [];
  private loading: boolean = true;
  private error: string | null = null;

  protected async onMount(): Promise<void> {
    await this.loadLeaderboard();
    this.render();
  }

  private async loadLeaderboard(): Promise<void> {
    const currentState = state.getState();
    
    if (!currentState.sessionId) {
      router.navigate('/');
      return;
    }

    try {
      this.loading = true;
      this.render();

      const response = await api.getLeaderboard(currentState.sessionId);
      this.leaderboard = response.entries;
      this.loading = false;
      this.error = null;
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Failed to load leaderboard';
    }

    this.render();
  }

  protected render(): string {
    const currentState = state.getState();
    const playerId = currentState.playerId;

    if (this.loading) {
      return `
        <div class="screen results-screen">
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading results...</p>
          </div>
        </div>
      `;
    }

    if (this.error) {
      return `
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
    }

    // Find player's position
    const playerEntry = this.leaderboard.find(e => e.playerId === playerId);

    // Generate leaderboard HTML
    const leaderboardHtml = this.leaderboard.map((entry) => {
      const isCurrentPlayer = entry.playerId === playerId;
      const medal = this.getMedalForRank(entry.rank);
      
      return `
        <div class="leaderboard-entry ${isCurrentPlayer ? 'current-player' : ''}" data-rank="${entry.rank}">
          <div class="entry-rank">
            ${medal || `<span class="rank-number">#${entry.rank}</span>`}
          </div>
          <div class="entry-nickname">
            ${this.escapeHtml(entry.nickname)}
            ${isCurrentPlayer ? '<span class="you-badge">You</span>' : ''}
          </div>
          <div class="entry-score">${entry.score}</div>
        </div>
      `;
    }).join('');

    // Player's summary
    let summaryHtml = '';
    if (playerEntry) {
      summaryHtml = `
        <div class="player-summary">
          <h2>Your Results</h2>
          <div class="summary-stats">
            <div class="stat">
              <div class="stat-label">Rank</div>
              <div class="stat-value">#${playerEntry.rank}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Score</div>
              <div class="stat-value">${playerEntry.score}</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="screen results-screen">
        <div class="results-container">
          <h1>🏆 Quiz Complete!</h1>
          
          ${summaryHtml}
          
          <div class="final-leaderboard">
            <h3>Final Standings</h3>
            <div class="leaderboard-list">
              ${leaderboardHtml}
            </div>
          </div>

          <div class="results-actions">
            <button class="play-again-btn">Play Again</button>
          </div>
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
        router.navigate('/');
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadLeaderboard();
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        state.clearState();
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
