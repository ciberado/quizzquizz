/**
 * Flashcard Lobby Screen
 * Shows the session PIN for sharing + a "Play Now" button for the host to start immediately.
 * The host can optionally wait for players to join (they use the flashcard-app via PIN).
 */
import { BaseComponent } from './base-component';
import { state } from '../state';
import { router } from '../router';

// Injected by Vite at build time (see vite.config.ts define).
// In dev: 'http://localhost:3004'; in production builds: ''.
declare const __FLASHCARD_ORIGIN__: string;

export class FlashcardLobbyScreen extends BaseComponent {
  private sessionId: string = '';
  private pin: string = '';

  protected onMount(): void {
    const hash = window.location.hash;
    const match = hash.match(/#\/flashcard-lobby\/([^/?]+)/);
    this.sessionId = match ? match[1]! : (state.getState().sessionId || '');
    this.pin = state.getState().pin || '';

    if (!this.sessionId || !this.pin) {
      router.navigate('/create');
      return;
    }

    this.render();
  }

  protected render(): void {
    const flashcardUrl = this.getFlashcardPlayerUrl();

    this.setContent(`
      <div class="screen">
        <div class="container">
          <div class="card">
            <div style="text-align: center; margin-bottom: var(--spacing-xl);">
              <div style="font-size: 3rem; margin-bottom: var(--spacing-sm);">🃏</div>
              <h1 style="margin-bottom: var(--spacing-xs);">Flashcard Session Ready!</h1>
              <p class="text-muted">Share the PIN or link so others can join</p>
            </div>

            <!-- PIN Display -->
            <div style="
              background: var(--color-bg-secondary);
              border-radius: var(--radius-lg);
              padding: var(--spacing-xl);
              text-align: center;
              margin-bottom: var(--spacing-lg);
            ">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--spacing-xs); text-transform: uppercase; letter-spacing: 0.1em;">
                Session PIN
              </div>
              <div style="
                font-size: 3rem;
                font-weight: 900;
                letter-spacing: 0.3em;
                color: var(--color-primary);
                font-family: monospace;
              ">${this.pin}</div>
              <div style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-muted);">
                Players go to: <strong>${this.getFlashcardBaseUrl()}</strong>
              </div>
            </div>

            <!-- Share Link -->
            <div style="margin-bottom: var(--spacing-lg);">
              <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: var(--spacing-xs);">Share Link</div>
              <div style="display: flex; gap: var(--spacing-xs);">
                <input
                  type="text"
                  id="share-link"
                  value="${flashcardUrl}"
                  readonly
                  style="
                    flex: 1;
                    padding: var(--spacing-sm);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    background: var(--color-bg-secondary);
                  "
                />
                <button id="copy-btn" class="btn-secondary" style="white-space: nowrap;">
                  📋 Copy
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <button id="back-btn" class="btn-secondary" style="padding: var(--spacing-md);">
                ← Back to Setup
              </button>
              <button id="play-now-btn" class="btn" style="padding: var(--spacing-md); font-size: var(--font-size-lg);">
                ▶ Play Now
              </button>
            </div>

            <p style="text-align: center; margin-top: var(--spacing-md); font-size: var(--font-size-sm); color: var(--color-text-muted);">
              "Play Now" opens the flashcard player in this window
            </p>
          </div>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.qs('#back-btn')?.addEventListener('click', () => {
      const bankId = state.getState().questionBankId;
      if (bankId) router.navigate(`/preview/${encodeURIComponent(bankId)}`);
      else router.navigate('/create');
    });

    this.qs('#play-now-btn')?.addEventListener('click', () => {
      // Navigate to flashcard-app, passing sessionId in URL
      // This replaces the current window — host becomes a player
      window.location.href = this.getFlashcardPlayUrl();
    });

    this.qs('#copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.getFlashcardPlayerUrl());
        const btn = this.qs<HTMLButtonElement>('#copy-btn');
        if (btn) {
          btn.textContent = '✓ Copied!';
          setTimeout(() => { if (btn) btn.textContent = '📋 Copy'; }, 2000);
        }
      } catch {
        // Fallback
        const input = this.qs<HTMLInputElement>('#share-link');
        input?.select();
      }
    });
  }

  private getFlashcardBaseUrl(): string {
    const origin = (typeof __FLASHCARD_ORIGIN__ !== 'undefined' && __FLASHCARD_ORIGIN__)
      ? __FLASHCARD_ORIGIN__
      : window.location.origin;
    return `${origin}/flashcard/`;
  }

  private getFlashcardPlayerUrl(): string {
    return `${this.getFlashcardBaseUrl()}#/?pin=${this.pin}`;
  }

  private getFlashcardPlayUrl(): string {
    return `${this.getFlashcardBaseUrl()}#/play/${this.sessionId}`;
  }
}

customElements.define('flashcard-lobby-screen', FlashcardLobbyScreen);
