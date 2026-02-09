import { BaseComponent } from './base-component';
import { api, ApiError } from '../api-client';
import { router } from '../router';
import { state } from '../state';

/**
 * Lobby screen - Waiting for host to start the quiz
 */
export class LobbyScreen extends BaseComponent {
  private playerCountElement: HTMLSpanElement | null = null;
  private statusElement: HTMLParagraphElement | null = null;
  private pollingInterval: number | null = null;
  private sessionId = '';
  private playerId = '';

  protected onMount(): void {
    // Get session info from state
    const currentState = state.getState();
    this.sessionId = currentState.sessionId || '';
    this.playerId = currentState.playerId || '';

    // Validate we have required info
    if (!this.sessionId || !this.playerId) {
      // No session info, go back to join
      router.navigate('/join');
      return;
    }

    // Start polling for game state
    this.startPolling();
  }

  protected onUnmount(): void {
    // Stop polling when leaving screen
    this.stopPolling();
  }

  protected render(): void {
    const nickname = state.getState().nickname || 'Player';

    this.setContent(`
      <div class="screen">
        <div class="card">
          <h1>Lobby</h1>
          <p class="nickname-display">Playing as: <strong>${nickname}</strong></p>
          
          <div class="lobby-status">
            <div class="status-icon">⏳</div>
            <p id="status-message">Waiting for host to start...</p>
            <p class="player-count">
              <span id="player-count">...</span> player(s) joined
            </p>
          </div>
          
          <button type="button" id="leave-button" class="secondary">
            Leave Quiz
          </button>
        </div>
      </div>
    `);

    // Cache DOM elements
    this.playerCountElement = this.qs<HTMLSpanElement>('#player-count');
    this.statusElement = this.qs<HTMLParagraphElement>('#status-message');

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const leaveButton = this.qs<HTMLButtonElement>('#leave-button');
    
    if (leaveButton) {
      leaveButton.addEventListener('click', () => {
        this.handleLeave();
      });
    }
  }

  private startPolling(): void {
    // Poll every 2 seconds
    this.pollGameState();
    this.pollingInterval = window.setInterval(() => {
      this.pollGameState();
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollGameState(): Promise<void> {
    try {
      const gameState = await api.getGameState(this.sessionId, this.playerId);

      // Update player count (from leaderboard)
      const leaderboard = await api.getLeaderboard(this.sessionId);
      if (this.playerCountElement) {
        this.playerCountElement.textContent = String(leaderboard.entries.length);
      }

      // Check if game has started
      if (gameState.status === 'playing') {
        // Game started! Stop polling and navigate to question screen
        this.stopPolling();
        router.navigate(`/question/${this.sessionId}`);
      } else if (gameState.status === 'finished') {
        // Game finished (shouldn't happen in lobby but handle it)
        this.stopPolling();
        router.navigate(`/results/${this.sessionId}`);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          // Session not found - host deleted it
          this.stopPolling();
          this.showError('Quiz was cancelled by the host');
          setTimeout(() => {
            router.navigate('/join');
          }, 3000);
        } else {
          console.error('Polling error:', error);
          // Continue polling on other errors
        }
      } else {
        console.error('Network error:', error);
        // Continue polling on network errors
      }
    }
  }

  private handleLeave(): void {
    // Clear state and go back to join screen
    state.clearState();
    this.stopPolling();
    router.navigate('/join');
  }

  private showError(message: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.style.color = 'var(--color-error)';
    }
  }
}

// Register custom element
customElements.define('lobby-screen', LobbyScreen);
