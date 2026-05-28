import { BaseComponent } from './base-component';
import { state } from '../state';
import { router } from '../router';
import { connectToSession } from '../yjs-provider';

/**
 * Waiting Screen Component
 * Displayed after a player submits an answer.
 * Shows feedback (correct/incorrect, points earned) and waits via Yjs for next question.
 */
export class WaitingScreen extends BaseComponent {
  private disconnectYjs: (() => void) | null = null;
  private isCorrect: boolean | null = null;
  private pointsEarned: number = 0;
  private lastQuestionId: string | null = null;

  protected onMount(): void {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const correctParam = params.get('correct');
    const scoreParam = params.get('score');
    const lastQuestionIdParam = params.get('lastQuestionId');

    if (correctParam !== null) {
      this.isCorrect = correctParam === 'true';
    }
    if (scoreParam !== null) {
      this.pointsEarned = parseInt(scoreParam, 10);
    }
    if (lastQuestionIdParam) {
      this.lastQuestionId = lastQuestionIdParam;
    }

    const currentState = state.getState();
    if (!currentState.sessionId || !currentState.playerId) {
      router.navigate('/');
      return;
    }

    this.disconnectYjs = connectToSession(
      currentState.sessionId,
      currentState.playerId,
      (docState) => {
        if (docState.status === 'finished') {
          router.navigate(`/results?sessionId=${currentState.sessionId}`);
          return;
        }
        if (docState.status === 'lobby') {
          router.navigate(`/lobby?sessionId=${currentState.sessionId}`);
          return;
        }
        if (docState.currentQuestion) {
          const qId = docState.currentQuestion.id;
          if (!this.lastQuestionId || qId !== this.lastQuestionId) {
            this.lastQuestionId = qId;
            router.navigate(`/question?sessionId=${currentState.sessionId}`);
          }
        }
      }
    );

    this.render();
  }

  protected onUnmount(): void {
    if (this.disconnectYjs) {
      this.disconnectYjs();
      this.disconnectYjs = null;
    }
  }

  protected render(): void {
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

    const html = `
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

    this.setContent(html);
    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    // No interactive elements on this screen
  }
}

customElements.define('waiting-screen', WaitingScreen);
