import { BaseComponent } from './base-component';
import { api, ApiError, cancelAllRequests } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import type { Player } from '@quizzquizz/common';

/**
 * Lobby screen - Display PIN and show joining players
 * Optimized for projector display with large text
 */
export class LobbyScreen extends BaseComponent {
  private pollingInterval: number | null = null;
  private sessionId = '';
  private hostToken = '';
  private pin = '';
  private players: Player[] = [];
  private previousPlayerCount = 0;

  protected onMount(): void {
    // Get session info from state
    const currentState = state.getState();
    this.sessionId = currentState.sessionId || '';
    this.hostToken = currentState.hostToken || '';
    this.pin = currentState.pin || '';

    // Debug logging
    console.log('🎮 Lobby Screen - State:', {
      sessionId: this.sessionId,
      hasToken: !!this.hostToken,
      pin: this.pin,
      fullState: currentState,
    });

    // Validate we have required info
    if (!this.sessionId || !this.hostToken) {
      console.error('Missing session credentials, redirecting to create');
      router.navigate('/create');
      return;
    }

    // Re-render with loaded state
    this.render();

    // Start polling for players
    this.startPolling();
  }

  protected onUnmount(): void {
    this.stopPolling();
    cancelAllRequests();
  }

  protected render(): void {
    const canStart = this.players.length > 0;

    console.log('🎨 Rendering lobby:', {
      playerCount: this.players.length,
      players: this.players.map(p => p.nickname),
      pin: this.pin,
    });

    this.setContent(`
      <div class="screen">
        <div class="container">
          <!-- Large PIN Display -->
          <div class="pin-display">
            <div class="pin-label">Join at localhost:3003 with PIN</div>
            <div class="pin-code">${this.pin || '(No PIN - Check console)'}</div>
          </div>

          <!-- Player List -->
          <div class="card">
            <h2 class="text-center">
              ${this.players.length} Player${this.players.length !== 1 ? 's' : ''} Joined
            </h2>
            
            ${this.players.length === 0 ? `
              <div class="waiting-message">
                <div class="waiting-icon">👥</div>
                <p>Waiting for players to join...</p>
              </div>
            ` : `
              <div class="players-grid">
                ${this.players
                  .sort((a, b) => Number(a.joinedAt) - Number(b.joinedAt))
                  .map((player, index) => `
                    <div class="player-card" data-player-id="${player.id}" style="animation-delay: ${index * 0.1}s">
                      <div class="player-avatar">${this.getPlayerEmoji(index)}</div>
                      <div class="player-name">${this.escapeHtml(player.nickname)}</div>
                    </div>
                  `).join('')}
              </div>
            `}
          </div>

          <!-- Control Buttons -->
          <div class="lobby-controls">
            <button 
              type="button" 
              id="start-button" 
              class="primary"
              ${!canStart ? 'disabled title="At least one player must join before starting"' : ''}
            >
              ${canStart ? 'Start Quiz' : 'Waiting for Players'}
            </button>
            <button type="button" id="cancel-button" class="danger">
              Cancel Session
            </button>
          </div>
          ${!canStart ? `
            <p class="help-text" style="text-align: center; margin-top: var(--spacing-md); color: var(--color-text-secondary);">
              💡 Share the PIN with players to let them join
            </p>
          ` : ''}
        </div>
      </div>
    `);

    // Add inline styles for lobby-specific components
    if (!document.getElementById('lobby-styles')) {
      const style = document.createElement('style');
      style.id = 'lobby-styles';
      style.textContent = `
        .waiting-message {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--color-text-secondary);
        }

        .waiting-icon {
          font-size: 80px;
          margin-bottom: var(--spacing-md);
          opacity: 0.7;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }

        .player-card {
          background: var(--color-bg);
          border: 2px solid var(--color-primary);
          border-radius:var(--border-radius);
          padding: var(--spacing-lg);
          text-align: center;
          animation: slideIn 0.4s ease-out backwards;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .player-avatar {
          font-size: 48px;
          margin-bottom: var(--spacing-sm);
        }

        .player-name {
          font-size: var(--font-size-large);
          font-weight: 600;
          color: var(--color-text);
          word-break: break-word;
        }

        .lobby-controls {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-xl);
          justify-content: center;
        }

        .lobby-controls button {
          flex: 1;
          max-width: 400px;
        }
      `;
      document.head.appendChild(style);
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const startButton = this.qs<HTMLButtonElement>('#start-button');
    const cancelButton = this.qs<HTMLButtonElement>('#cancel-button');

    if (startButton && !startButton.disabled) {
      startButton.addEventListener('click', () => {
        this.handleStart();
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.handleCancel();
      });
    }
  }

  private startPolling(): void {
    // Poll immediately
    this.pollPlayers();

    // Then poll every 2 seconds
    this.pollingInterval = window.setInterval(() => {
      this.pollPlayers();
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollPlayers(): Promise<void> {
    try {
      const players = await api.getPlayers(this.sessionId);
      
      // Check if player count changed
      const newPlayerCount = players.length;
      const playerCountChanged = newPlayerCount !== this.previousPlayerCount;
      
      // Check if any player IDs changed (someone left/joined)
      const currentPlayerIds = this.players.map(p => p.id).sort().join(',');
      const newPlayerIds = players.map(p => p.id).sort().join(',');
      const playerListChanged = currentPlayerIds !== newPlayerIds;
      
      // Only update and re-render if something actually changed
      if (playerCountChanged || playerListChanged) {
        this.players = players;
        this.previousPlayerCount = newPlayerCount;
        this.render();

        // Log new players joining
        if (playerCountChanged && newPlayerCount > this.previousPlayerCount) {
          console.log(`✨ New player(s) joined! Total: ${newPlayerCount}`);
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          // Session deleted
          console.error('Session not found - was it deleted?');
          this.stopPolling();
          state.clearState();
          router.navigate('/create');
        } else {
          console.error('Polling error:', error);
        }
      } else {
        console.error('Network error polling players:', error);
      }
    }
  }

  private async handleStart(): Promise<void> {
    if (this.players.length === 0) {
      return;
    }

    this.showLoading('Starting quiz...');
    this.stopPolling();

    try {
      await api.startQuiz(this.sessionId, this.hostToken);
      
      console.log('✅ Quiz started');
      
      // Navigate to question display screen
      router.navigate(`/question/${this.sessionId}`);
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert('Failed to start quiz. Please try again.');
      this.startPolling(); // Resume polling on error
    }
  }

  private async handleCancel(): Promise<void> {
    // Confirm cancellation
    const confirmed = confirm(
      `Cancel this quiz session?\n\n` +
      `PIN: ${this.pin}\n` +
      `${this.players.length} player(s) will be disconnected.`
    );

    if (!confirmed) {
      return;
    }

    this.showLoading('Cancelling session...');
    this.stopPolling();

    try {
      await api.deleteSession(this.sessionId, this.hostToken);
      
      console.log('✅ Session deleted');
      
      // Clear state and return to create
      state.clearState();
      router.navigate('/create');
    } catch (error) {
      console.error('Failed to delete session:', error);
      
      if (error instanceof ApiError) {
        this.showError(`Failed to cancel session: ${error.message}`);
      } else {
        this.showError('Could not cancel session. Please try again.');
      }

      // Restart polling
      this.startPolling();
    }
  }

  /**
   * Get a fun emoji for each player based on their join order
   */
  private getPlayerEmoji(index: number): string {
    const emojis = [
      '🦁', '🐯', '🐻', '🦊', '🐼',
      '🐨', '🐮', '🐷', '🐸', '🐵',
      '🦄', '🦋', '🐝', '🐙', '🦀',
      '🐧', '🦅', '🦉', '🦆', '🐣',
    ];
    return emojis[index % emojis.length] || '🦁';
  }
}

// Register custom element
customElements.define('lobby-screen', LobbyScreen);
