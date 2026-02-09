import { BaseComponent } from './base-component';
import { state } from '../state';
import { api } from '../api-client';
import { router } from '../router';

/**
 * Waiting Screen Component
 * Displayed after a player submits an answer.
 * Shows feedback (correct/incorrect, points earned) and polls for next question.
 */
export class WaitingScreen extends BaseComponent {
  private pollInterval: number | null = null;
  private isCorrect: boolean | null = null;
  private pointsEarned: number = 0;

  protected onMount(): void {
    // Get query parameters
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const correctParam = params.get('correct');
    const scoreParam = params.get('score');

    if (correctParam !== null) {
      this.isCorrect = correctParam === 'true';
    }

    if (scoreParam !== null) {
      this.pointsEarned = parseInt(scoreParam, 10);
    }

    this.startPolling();
    this.render();
  }

  protected onUnmount(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollGameState(); // Immediate first call
    this.pollInterval = window.setInterval(() => {
      this.pollGameState();
    }, 2000); // Poll every 2 seconds
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollGameState(): Promise<void> {
    const currentState = state.getState();
    
    if (!currentState.sessionId || !currentState.playerId) {
      router.navigate('/');
      return;
    }

    try {
      const gameState = await api.getGameState(
        currentState.sessionId,
        currentState.playerId
      );

      // Check if quiz ended
      if (gameState.status === 'finished') {
        router.navigate(`/results?sessionId=${currentState.sessionId}`);
        return;
      }

      // Check if back in lobby (shouldn't happen, but handle it)
      if (gameState.status === 'lobby') {
        router.navigate(`/lobby?sessionId=${currentState.sessionId}`);
        return;
      }

      // Check if new question started
      // Note: This is detected when questionStartedAt changes
      // We could track the previous questionStartedAt to detect changes more reliably
      // For now, we'll just check if the question is different from what we expect
      if (gameState.currentQuestion) {
        // Navigate back to question screen for new question
        router.navigate(`/question?sessionId=${currentState.sessionId}`);
        return;
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      // Continue polling even on error
    }
  }

  protected render(): string {
    let feedbackHtml = '';
    
    if (this.isCorrect !== null) {
      if (this.isCorrect) {
        feedbackHtml = `
          <div class="feedback feedback-correct">
            <div class="feedback-icon">✓</div>
            <h2>Correct!</h2>
            <p class="points">+${this.pointsEarned} points</p>
          </div>
        `;
      } else {
        feedbackHtml = `
          <div class="feedback feedback-incorrect">
            <div class="feedback-icon">✗</div>
            <h2>Incorrect</h2>
            <p class="points">${this.pointsEarned} points</p>
          </div>
        `;
      }
    }

    return `
      <div class="screen waiting-screen">
        ${feedbackHtml || '<div class="feedback"><h2>Answer Submitted</h2></div>'}
        
        <div class="waiting-indicator">
          <div class="spinner"></div>
          <p>Waiting for other players...</p>
        </div>

        <div class="waiting-message">
          <p>The host will advance to the next question soon</p>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // No interactive elements on this screen
  }
}

customElements.define('waiting-screen', WaitingScreen);
