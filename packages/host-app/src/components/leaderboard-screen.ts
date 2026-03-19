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
  private automaticPace: boolean = false; // Auto-advance enabled
  private autoNavigateTimeout: number | null = null;
  private isNavigating: boolean = false; // Prevent concurrent API calls

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
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
      this.autoNavigateTimeout = null;
    }
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
      const newAutomaticPace = session.pace === 'normal' ? true : (session.automaticPace || false);

      // Get leaderboard data
      const data = await api.getLeaderboard(sessionId);
      const newLeaderboard = data.leaderboard || [];
      
      // Check if anything changed
      const leaderboardChanged = 
        this.sessionStatus !== newSessionStatus ||
        this.currentQuestionIndex !== newCurrentQuestionIndex ||
        this.totalQuestions !== newTotalQuestions ||
        this.automaticPace !== newAutomaticPace ||
        this.leaderboard.length !== newLeaderboard.length ||
        JSON.stringify(this.leaderboard.map(e => ({ rank: e.rank, score: e.score }))) !== 
        JSON.stringify(newLeaderboard.map(e => ({ rank: e.rank, score: e.score })));

      // Only update and re-render if something changed
      if (leaderboardChanged) {
        const wasFirstLoad = this.leaderboard.length === 0;
        
        this.sessionStatus = newSessionStatus;
        this.currentQuestionIndex = newCurrentQuestionIndex;
        this.totalQuestions = newTotalQuestions;
        this.automaticPace = newAutomaticPace;
        this.leaderboard = newLeaderboard;
        this.render();
        
        // If automatic pace is enabled and this is the first load, schedule auto-advance.
        // Guard with !this.autoNavigateTimeout to prevent double-scheduling when
        // leaderboardChanged fires multiple times (e.g. late scores, empty leaderboard race).
        if (wasFirstLoad && this.automaticPace && this.sessionStatus === 'playing' && !this.autoNavigateTimeout) {
          const hasMoreQuestions = this.currentQuestionIndex < this.totalQuestions - 1;
          if (hasMoreQuestions) {
            console.log('⏱️ Automatic pace enabled - will advance to next question in 4s');
            this.autoNavigateTimeout = window.setTimeout(() => {
              console.log('🚀 Auto-advancing to next question');
              this.handleNextQuestion();
            }, 4000); // 4 seconds
          } else {
            console.log('⏱️ Automatic pace enabled - will show final results in 4s');
            this.autoNavigateTimeout = window.setTimeout(() => {
              console.log('🚀 Auto-navigating to final results');
              this.handleViewFinalResults();
            }, 4000); // 4 seconds
          }
        }
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
    // Prevent concurrent calls
    if (this.isNavigating) {
      console.log('⚠️ Already navigating, skipping duplicate call');
      return;
    }
    
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    this.isNavigating = true;
    try {
      await api.nextQuestion(sessionId, hostToken);
      router.navigate('/question');
    } catch (error) {
      console.error('Error advancing to next question:', error);
      alert('Failed to advance to next question');
      this.isNavigating = false; // Reset on error
    }
  }

  private async handleViewFinalResults() {
    // Prevent concurrent calls
    if (this.isNavigating) {
      console.log('⚠️ Already navigating, skipping duplicate call');
      return;
    }
    
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    this.isNavigating = true;
    try {
      // Call next to mark session as finished (when at last question)
      await api.nextQuestion(sessionId, hostToken);
      router.navigate('/results');
    } catch (error) {
      console.error('Error finalizing quiz:', error);
      // Navigate anyway - might already be finished
      router.navigate('/results');
    }
    // Note: Don't reset isNavigating after success - component will unmount
  }

  private async handleEndQuiz() {
    if (!confirm('End the quiz now? The final leaderboard will be shown.')) {
      return;
    }

    // Prevent concurrent calls
    if (this.isNavigating) {
      console.log('⚠️ Already navigating, skipping duplicate call');
      return;
    }

    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    this.isNavigating = true;
    try {
      await api.endQuiz(sessionId, hostToken);
      router.navigate('/results');
    } catch (error) {
      console.error('Error ending quiz:', error);
      alert('Failed to end quiz');
      this.isNavigating = false; // Reset on error
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

        <div class="leaderboard-body">
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
            ${this.automaticPace ? `
              <div class="autopace-status">
                <div class="autopace-spinner"></div>
                <span>Auto-advancing…</span>
              </div>
            ` : showNextButton ? `
              <button class="btn-primary btn-action" data-action="next">
                Next Question →
              </button>
            ` : `
              <button class="btn-primary btn-action" data-action="final">
                View Final Results 🎉
              </button>
            `}

            ${this.sessionStatus === 'playing' ? `
              <button class="btn-secondary btn-action" data-action="end">
                End Quiz Now
              </button>
            ` : ''}
          </div>
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
