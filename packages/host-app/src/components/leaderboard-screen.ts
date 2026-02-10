/**
 * Leaderboard Screen Component
 * Displays rankings between questions
 * Shows top players with medals and scores
 */

import { router } from '../router';
import { state } from '../state';
import { api, cancelAllRequests } from '../api-client';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  playerId: string;
}

export class LeaderboardScreen extends HTMLElement {
  private pollInterval: number | null = null;
  private leaderboard: LeaderboardEntry[] = [];
  private sessionStatus: 'lobby' | 'playing' | 'finished' = 'playing';
  private currentQuestionIndex: number = 0;
  private totalQuestions: number = 0;

  async connectedCallback() {
    const sessionId = state.getState().sessionId;
    const hostToken = state.getState().hostToken;

    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    this.render();
    await this.loadLeaderboard();
    this.startPolling();
  }

  disconnectedCallback() {
    this.stopPolling();
    cancelAllRequests();
  }

  private async loadLeaderboard() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    try {
      // Get session status
      const session = await api.getSession(sessionId, hostToken);
      const newSessionStatus = session.status;
      const newCurrentQuestionIndex = session.currentQuestionIndex;
      const newTotalQuestions = session.questions.length;

      // Get leaderboard data
      const data = await api.getLeaderboard(sessionId);
      const newLeaderboard = data.leaderboard || [];
      
      // Check if anything changed
      const leaderboardChanged = 
        this.sessionStatus !== newSessionStatus ||
        this.currentQuestionIndex !== newCurrentQuestionIndex ||
        this.totalQuestions !== newTotalQuestions ||
        this.leaderboard.length !== newLeaderboard.length ||
        JSON.stringify(this.leaderboard.map(e => ({ rank: e.rank, score: e.score }))) !== 
        JSON.stringify(newLeaderboard.map(e => ({ rank: e.rank, score: e.score })));

      // Only update and re-render if something changed
      if (leaderboardChanged) {
        this.sessionStatus = newSessionStatus;
        this.currentQuestionIndex = newCurrentQuestionIndex;
        this.totalQuestions = newTotalQuestions;
        this.leaderboard = newLeaderboard;
        this.render();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.showError();
    }
  }

  private startPolling() {
    this.pollInterval = window.setInterval(() => {
      this.loadLeaderboard();
    }, 2000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  private async handleNextQuestion() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    try {
      await api.nextQuestion(sessionId, hostToken);
      router.navigate('/question');
    } catch (error) {
      console.error('Error advancing to next question:', error);
      alert('Failed to advance to next question');
    }
  }

  private handleViewFinalResults() {
    router.navigate('/results');
  }

  private async handleEndQuiz() {
    if (!confirm('End the quiz now? The final leaderboard will be shown.')) {
      return;
    }

    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    try {
      await api.endQuiz(sessionId, hostToken);
      router.navigate('/results');
    } catch (error) {
      console.error('Error ending quiz:', error);
      alert('Failed to end quiz');
    }
  }

  private showError() {
    this.innerHTML = `
      <div class="error-screen">
        <h1>❌ Error Loading Leaderboard</h1>
        <p>Could not fetch leaderboard data</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  private render() {
    const top10 = this.leaderboard.slice(0, 10);
    const hasMoreQuestions = this.currentQuestionIndex < this.totalQuestions - 1;
    const showNextButton = this.sessionStatus === 'playing' && hasMoreQuestions;

    this.innerHTML = `
      <div class="leaderboard-screen">
        <div class="leaderboard-header">
          <h1>🏆 Leaderboard</h1>
          <p class="question-progress">After Question ${this.currentQuestionIndex + 1} of ${this.totalQuestions}</p>
        </div>

        ${top10.length === 0 ? `
          <div class="empty-leaderboard">
            <p>No players yet!</p>
          </div>
        ` : `
          <div class="leaderboard-list">
            ${top10.map((entry) => this.renderLeaderboardEntry(entry)).join('')}
          </div>
        `}

        <div class="leaderboard-actions">
          ${showNextButton ? `
            <button class="btn-primary btn-large" data-action="next">
              Next Question →
            </button>
          ` : `
            <button class="btn-primary btn-large" data-action="final">
              View Final Results 🎉
            </button>
          `}
          
          ${this.sessionStatus === 'playing' ? `
            <button class="btn-secondary" data-action="end">
              End Quiz Now
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Add event listeners
    this.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      this.handleNextQuestion();
    });

    this.querySelector('[data-action="final"]')?.addEventListener('click', () => {
      this.handleViewFinalResults();
    });

    this.querySelector('[data-action="end"]')?.addEventListener('click', () => {
      this.handleEndQuiz();
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

customElements.define('leaderboard-screen', LeaderboardScreen);
