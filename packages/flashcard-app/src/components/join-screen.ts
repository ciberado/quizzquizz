/**
 * Join Screen — PIN entry and optional nickname input.
 * Supports direct URL access with pre-filled sessionId.
 */
import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { state } from '../state';
import { router } from '../router';

export class FlashcardJoinScreen extends BaseComponent {
  private sessionId: string | null = null;
  private pin: string | null = null;
  private error: string | null = null;
  private loading = false;

  protected onMount(): void {
    // Support direct URL: /join/:sessionId or /play/:sessionId (host play now)
    const hash = window.location.hash;
    const sessionMatch = hash.match(/#\/play\/([^/?]+)/);
    if (sessionMatch) {
      this.sessionId = decodeURIComponent(sessionMatch[1]!);
    }

    // Support PIN from query string: ?pin=123456
    const pinMatch = hash.match(/pin=(\d{6})/);
    if (pinMatch) {
      this.pin = pinMatch[1]!;
    }

    this.render();
  }

  protected render(): void {
    this.setContent(`
      <div class="screen">
        <div class="container">
          <div class="card">
            <h1 class="text-center" style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-sm);">
              🃏 Flashcard Study
            </h1>
            <p class="text-center text-secondary" style="margin-bottom: var(--spacing-xl);">
              Enter a PIN to start a flashcard session
            </p>

            ${this.error ? `<div class="error-message" style="margin-bottom: var(--spacing-md);">${this.error}</div>` : ''}

            <div class="form-group" style="margin-bottom: var(--spacing-md);">
              <label for="pin-input" style="display:block; margin-bottom: var(--spacing-xs); font-weight: 600;">Session PIN</label>
              <input
                id="pin-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="Enter 6-digit PIN"
                class="input"
                style="width: 100%; font-size: var(--font-size-xl); text-align: center; letter-spacing: 0.3em;"
                value="${this.pin || ''}"
              />
            </div>

            <div class="form-group" style="margin-bottom: var(--spacing-lg);">
              <label for="nickname-input" style="display:block; margin-bottom: var(--spacing-xs); font-weight: 600;">Your Name</label>
              <input
                id="nickname-input"
                type="text"
                maxlength="20"
                placeholder="Enter your name"
                class="input"
                style="width: 100%; font-size: var(--font-size-lg); text-align: center;"
              />
            </div>

            <button
              id="join-btn"
              class="btn-primary"
              style="width: 100%; padding: var(--spacing-md); font-size: var(--font-size-lg);"
              ${this.loading ? 'disabled' : ''}
            >
              ${this.loading ? 'Joining...' : '▶ Start Studying'}
            </button>
          </div>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  protected attachEventListeners(): void {
    const pinInput = this.qs<HTMLInputElement>('#pin-input');
    const nicknameInput = this.qs<HTMLInputElement>('#nickname-input');
    const joinBtn = this.qs<HTMLButtonElement>('#join-btn');

    // If sessionId in URL, we still need a PIN — but we have the sessionId for the flashcard state
    // For simplicity, if sessionId is in URL, we can bypass PIN join by using a dummy nickname
    // (host "play now" scenario - the host joins with their own name)
    if (this.sessionId) {
      // Pre-fill session id info
      if (pinInput) pinInput.setAttribute('placeholder', 'Enter PIN shown on host screen');
    }

    joinBtn?.addEventListener('click', () => this.handleJoin());
    nicknameInput?.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') this.handleJoin();
    });
    pinInput?.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') nicknameInput?.focus();
    });
  }

  private async handleJoin(): Promise<void> {
    const pin = this.qs<HTMLInputElement>('#pin-input')?.value.trim();
    const nickname = this.qs<HTMLInputElement>('#nickname-input')?.value.trim();

    if (!pin || pin.length !== 6) {
      this.error = 'Please enter a valid 6-digit PIN';
      this.render();
      return;
    }

    if (!nickname || nickname.length === 0) {
      this.error = 'Please enter your name';
      this.render();
      return;
    }

    this.loading = true;
    this.error = null;
    this.render();

    try {
      const result = await api.joinSession(pin, nickname);

      if (result.mode !== 'flashcard') {
        this.error = 'This session is not a flashcard session';
        this.loading = false;
        this.render();
        return;
      }

      state.set({
        sessionId: result.sessionId,
        playerId: result.playerId,
        nickname: result.nickname,
        pin,
      });

      router.navigate(`/play/${result.sessionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join session';
      this.error = msg.includes('404') ? 'Session not found — check your PIN' : msg;
      this.loading = false;
      this.render();
    }
  }
}

customElements.define('flashcard-join-screen', FlashcardJoinScreen);
