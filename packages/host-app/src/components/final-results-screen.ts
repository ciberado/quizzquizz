/**
 * Final Results Screen Component
 * Displays final leaderboard with winner celebration
 * Shows complete rankings and session summary
 */

import { router } from '../router';
import { state } from '../state';
import { api } from '../api-client';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  playerId: string;
}

export class FinalResultsScreen extends HTMLElement {
  private leaderboard: LeaderboardEntry[] = [];
  private totalPlayers: number = 0;
  private totalQuestions: number = 0;
  private confettiRendered: boolean = false;

  async connectedCallback() {
    const sessionId = state.getState().sessionId;
    const hostToken = state.getState().hostToken;

    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    this.render();
    await this.loadFinalResults();
    
    // Trigger confetti animation after render
    if (this.leaderboard.length > 0 && !this.confettiRendered) {
      this.showConfetti();
      this.confettiRendered = true;
    }
  }

  private async loadFinalResults() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    try {
      // Get session details
      const session = await api.getSession(sessionId, hostToken);
      this.totalQuestions = session.questions.length;

      // Get final leaderboard
      const data = await api.getLeaderboard(sessionId);
      this.leaderboard = data.leaderboard || [];
      this.totalPlayers = this.leaderboard.length;
      
      this.render();
    } catch (error) {
      console.error('Error loading final results:', error);
      this.showError();
    }
  }

  private getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  private handleCreateNewQuiz() {
    // Clear session state
    state.setState({
      sessionId: null,
      hostToken: null,
      pin: null,
    });
    
    router.navigate('/');
  }

  private showError() {
    this.innerHTML = `
      <div class="error-screen">
        <h1>❌ Error Loading Results</h1>
        <p>Could not fetch final results</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  private showConfetti() {
    // Simple CSS-based confetti animation
    const confettiContainer = this.querySelector('.confetti-container');
    if (!confettiContainer) return;

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.animationDelay = `${Math.random() * 3}s`;
      confetti.style.backgroundColor = this.getRandomColor();
      confettiContainer.appendChild(confetti);
    }

    // Remove confetti after animation
    setTimeout(() => {
      confettiContainer.innerHTML = '';
    }, 5000);
  }

  private getRandomColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#6bcf7f', '#a29bfe'];
    const index = Math.floor(Math.random() * colors.length);
    const color = colors[index];
    return color ?? colors[0] ?? '#ff6b6b'; // Fallback to known values
  }

  private render() {
    const winner = this.leaderboard[0];
    
    this.innerHTML = `
      <div class="final-results-screen">
        <div class="confetti-container"></div>
        
        <div class="results-header">
          <h1>🎉 Quiz Complete! 🎉</h1>
          
          ${winner ? `
            <div class="winner-announcement">
              <div class="trophy">🏆</div>
              <div class="winner-name">${this.escapeHtml(winner.nickname)}</div>
              <div class="winner-subtitle">is the champion!</div>
              <div class="winner-score">${winner.score.toLocaleString()} points</div>
            </div>
          ` : `
            <p class="no-players">No players participated in this quiz</p>
          `}
        </div>

        ${this.leaderboard.length > 0 ? `
          <div class="final-leaderboard">
            <h2>Final Standings</h2>
            <div class="leaderboard-list">
              ${this.leaderboard.map((entry) => this.renderLeaderboardEntry(entry)).join('')}
            </div>
          </div>
        ` : ''}

        <div class="session-summary">
          <h3>Session Summary</h3>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">Total Players:</span>
              <span class="stat-value">${this.totalPlayers}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Questions:</span>
              <span class="stat-value">${this.totalQuestions}</span>
            </div>
            ${winner ? `
              <div class="stat">
                <span class="stat-label">Winning Score:</span>
                <span class="stat-value">${winner.score.toLocaleString()} pts</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="final-actions">
          <button class="btn-primary btn-large" data-action="new-quiz">
            Create New Quiz 🎮
          </button>
        </div>
      </div>
    `;

    // Add event listener
    this.querySelector('[data-action="new-quiz"]')?.addEventListener('click', () => {
      this.handleCreateNewQuiz();
    });
  }

  private renderLeaderboardEntry(entry: LeaderboardEntry): string {
    const medal = this.getMedalEmoji(entry.rank);
    const isPodium = entry.rank <= 3;
    
    return `
      <div class="leaderboard-entry ${isPodium ? 'podium' : ''}" data-rank="${entry.rank}">
        <div class="entry-rank">
          ${medal ? `<span class="medal">${medal}</span>` : `<span class="rank-number">${entry.rank}</span>`}
        </div>
        <div class="entry-nickname">${this.escapeHtml(entry.nickname)}</div>
        <div class="entry-score">${entry.score.toLocaleString()} pts</div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('final-results-screen', FinalResultsScreen);
