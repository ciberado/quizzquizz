/**
 * Leaderboard Screen Component
 * Displays rankings between questions
 * Shows top players with medals and scores
 */

import { router } from '../router';
import { state } from '../state';
import { api } from '../api-client';
import morphdom from 'morphdom';
import { connectToSession, type SessionDocState } from '../yjs-provider';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  playerId: string;
}

export class LeaderboardScreen extends HTMLElement {
  private disconnectYjs: (() => void) | null = null;
  private leaderboard: LeaderboardEntry[] = [];
  private sessionStatus: 'lobby' | 'playing' | 'finished' = 'playing';
  private currentQuestionIndex: number = 0;
  private totalQuestions: number = 0;
  private automaticPace: boolean = false;
  private autoNavigateTimeout: number | null = null;
  private isNavigating: boolean = false;
  private initialized: boolean = false;

  async connectedCallback() {
    const sessionId = state.getState().sessionId;
    const hostToken = state.getState().hostToken;

    if (!sessionId || !hostToken) {
      router.navigate('/');
      return;
    }

    this.render();

    // Load initial data from REST (for totalQuestions and initial state)
    await this.loadInitialData();

    // Subscribe to Yjs doc for real-time updates
    this.disconnectYjs = connectToSession(sessionId, hostToken, (docState) => {
      this.handleDocState(docState);
    });
  }

  disconnectedCallback() {
    if (this.disconnectYjs) {
      this.disconnectYjs();
      this.disconnectYjs = null;
    }
    if (this.autoNavigateTimeout) {
      clearTimeout(this.autoNavigateTimeout);
      this.autoNavigateTimeout = null;
    }
  }

  private async loadInitialData() {
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    try {
      const session = await api.getSession(sessionId, hostToken);
      this.totalQuestions = session.questions.length;
      this.currentQuestionIndex = session.currentQuestionIndex;
      this.sessionStatus = session.status;
      this.automaticPace = session.pace === 'normal' ? true : (session.automaticPace || false);

      const data = await api.getLeaderboard(sessionId);
      this.leaderboard = data.leaderboard || [];
      this.initialized = true;
      console.log(`[HOST][Leaderboard] Loaded: Q${this.currentQuestionIndex + 1}/${this.totalQuestions}, status=${this.sessionStatus}, autoPace=${this.automaticPace}, players=${this.leaderboard.length}`);
      this.render();

      this.scheduleAutoNavigateIfNeeded(true);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.showError();
    }
  }

  private handleDocState(docState: SessionDocState) {
    if (!this.initialized) return;

    const newLeaderboard = (docState.leaderboard ?? []) as LeaderboardEntry[];
    const newStatus = (docState.status ?? this.sessionStatus) as 'lobby' | 'playing' | 'finished';
    const newQIndex = docState.currentQuestionIndex ?? this.currentQuestionIndex;
    const newTotal = docState.totalQuestions ?? this.totalQuestions;
    const newAutoPace = docState.automaticPace ?? this.automaticPace;

    const leaderboardChanged =
      this.sessionStatus !== newStatus ||
      this.currentQuestionIndex !== newQIndex ||
      this.totalQuestions !== newTotal ||
      this.automaticPace !== newAutoPace ||
      this.leaderboard.length !== newLeaderboard.length ||
      JSON.stringify(this.leaderboard.map(e => ({ rank: e.rank, score: e.score }))) !==
      JSON.stringify(newLeaderboard.map(e => ({ rank: e.rank, score: e.score })));

    if (leaderboardChanged) {
      this.sessionStatus = newStatus;
      this.currentQuestionIndex = newQIndex;
      this.totalQuestions = newTotal;
      this.automaticPace = newAutoPace;
      this.leaderboard = newLeaderboard;
      this.render();
      this.scheduleAutoNavigateIfNeeded(false);
    }
  }

  private scheduleAutoNavigateIfNeeded(isFirstLoad: boolean) {
    if (isFirstLoad && this.automaticPace && this.sessionStatus === 'playing' && !this.autoNavigateTimeout) {
      const hasMoreQuestions = this.currentQuestionIndex < this.totalQuestions - 1;
      if (hasMoreQuestions) {
        console.log(`[HOST][Leaderboard] Auto-pace: advancing to Q${this.currentQuestionIndex + 2} in 4s`);
        this.autoNavigateTimeout = window.setTimeout(() => {
          console.log('[HOST][Leaderboard] Auto-navigating → /question');
          this.handleNextQuestion();
        }, 4000);
      } else {
        console.log('[HOST][Leaderboard] Auto-pace: final results in 4s');
        this.autoNavigateTimeout = window.setTimeout(() => {
          console.log('[HOST][Leaderboard] Auto-navigating → final results');
          this.handleViewFinalResults();
        }, 4000);
      }
    }
  }

  private getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  private async handleNextQuestion() {
    if (this.isNavigating) {
      console.log('⚠️ Already navigating, skipping duplicate call');
      return;
    }
    
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    this.isNavigating = true;
    try {
      await api.nextQuestion(sessionId, hostToken);
      router.navigate(`/question/${sessionId}`);
    } catch (error) {
      console.error('Error advancing to next question:', error);
      this.isNavigating = false;
    }
  }

  private async handleViewFinalResults() {
    if (this.isNavigating) {
      console.log('⚠️ Already navigating, skipping duplicate call');
      return;
    }
    
    const { sessionId, hostToken } = state.getState();
    if (!sessionId || !hostToken) return;

    this.isNavigating = true;
    try {
      await api.nextQuestion(sessionId, hostToken);
      router.navigate('/results');
    } catch (error) {
      console.error('Error finalizing quiz:', error);
      router.navigate('/results');
    }
  }

  private async handleEndQuiz() {
    if (!confirm('End the quiz now? The final leaderboard will be shown.')) {
      return;
    }

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
      this.isNavigating = false;
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

    const html = `
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
              <div class="autopace-status" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center;">
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

    if (this.firstElementChild) {
      const template = document.createElement('div');
      template.innerHTML = html;
      if (template.firstElementChild) {
        morphdom(this.firstElementChild, template.firstElementChild);
      }
    } else {
      this.innerHTML = html;
    }

    // Use onclick assignment (not addEventListener) so morphdom-reused elements
    // never accumulate duplicate listeners across re-renders.
    const nextBtn = this.querySelector<HTMLElement>('[data-action="next"]');
    if (nextBtn) nextBtn.onclick = () => this.handleNextQuestion();
    const finalBtn = this.querySelector<HTMLElement>('[data-action="final"]');
    if (finalBtn) finalBtn.onclick = () => this.handleViewFinalResults();
    const endBtn = this.querySelector<HTMLElement>('[data-action="end"]');
    if (endBtn) endBtn.onclick = () => this.handleEndQuiz();
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
