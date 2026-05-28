import { BaseComponent } from './base-component';
import { router } from '../router';
import { state } from '../state';
import { connectToSession } from '../yjs-provider';

/**
 * Lobby screen - Waiting for host to start the quiz
 */
export class LobbyScreen extends BaseComponent {
  private playerCountElement: HTMLSpanElement | null = null;
  private disconnectYjs: (() => void) | null = null;
  private sessionId = '';
  private playerId = '';
  private lastPlayerCount: number = 0;

  protected onMount(): void {
    const currentState = state.getState();
    this.sessionId = currentState.sessionId || '';
    this.playerId = currentState.playerId || '';

    if (!this.sessionId || !this.playerId) {
      router.navigate('/join');
      return;
    }

    this.disconnectYjs = connectToSession(this.sessionId, this.playerId, (docState) => {
      if (docState.status === 'playing') {
        router.navigate(`/question/${this.sessionId}`);
        return;
      }
      if (docState.status === 'finished') {
        router.navigate(`/results/${this.sessionId}`);
        return;
      }

      const players = docState.players ?? [];
      const playerCount = players.length;
      if (playerCount !== this.lastPlayerCount && this.playerCountElement) {
        this.playerCountElement.textContent = String(playerCount);
        this.lastPlayerCount = playerCount;
      }
    });
  }

  protected onUnmount(): void {
    if (this.disconnectYjs) {
      this.disconnectYjs();
      this.disconnectYjs = null;
    }
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

    this.playerCountElement = this.qs<HTMLSpanElement>('#player-count');

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

  private handleLeave(): void {
    state.clearState();
    router.navigate('/join');
  }
}

// Register custom element
customElements.define('lobby-screen', LobbyScreen);
