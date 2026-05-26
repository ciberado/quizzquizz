/**
 * Flashcard Lobby Screen
 * Shows the session PIN for sharing + a "Play Now" button for the host to start immediately.
 * Design mirrors the quiz lobby screen: gradient PIN banner, QR code, action buttons.
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
    const flashcardBaseUrl = this.getFlashcardBaseUrl();
    const displayUrl = flashcardBaseUrl.replace(/^https?:\/\//, '');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(flashcardUrl)}`;

    this.setContent(`
      <div class="screen">
        <div class="container">

          <!-- PIN banner — identical layout to quiz lobby -->
          <div class="pin-display" id="pin-display" title="Click to copy join link">
            <div class="pin-content">
              <div class="pin-url-section">
                <div class="pin-label">Flashcard session — join at</div>
                <div class="player-url">${displayUrl}</div>
              </div>
              <div class="pin-center-section">
                <div class="pin-label">PIN</div>
                <div class="pin-code">${this.pin}</div>
              </div>
              <div class="qr-section">
                <img src="${qrUrl}" alt="QR code to join flashcard session" class="qr-code" />
                <div class="qr-label">Scan to join</div>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="lobby-controls">
            <button type="button" id="play-now-btn" class="primary">
              Play Now
            </button>
            <button type="button" id="back-btn" class="danger">
              Cancel Session
            </button>
          </div>

          <!-- Share link card -->
          <div class="card" style="margin-top: var(--spacing-lg);">
            <h2 style="margin-bottom: var(--spacing-md); font-size: var(--font-size-large);">Share Link</h2>
            <div class="share-row">
              <input
                type="text"
                id="share-link"
                value="${flashcardUrl}"
                readonly
                class="share-input"
              />
              <button id="copy-btn" class="secondary">
                Copy Link
              </button>
            </div>
            <p class="help-text" style="margin-top: var(--spacing-md); color: var(--color-text-secondary);">
              Share this link or the PIN with participants. "Play Now" opens the flashcard player in this window.
            </p>
          </div>

        </div>
      </div>
    `);

    this.injectStyles();
    this.attachEventListeners();
  }

  private injectStyles(): void {
    if (document.getElementById('flashcard-lobby-styles')) return;
    const style = document.createElement('style');
    style.id = 'flashcard-lobby-styles';
    style.textContent = `
      /* Reuse lobby-screen pin-display layout */
      .pin-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-xl);
        flex-wrap: wrap;
      }

      .pin-url-section {
        flex: 1;
        min-width: 0;
      }

      .pin-center-section {
        flex: 0 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 220px;
      }

      .pin-label {
        font-size: var(--font-size-small);
        color: rgba(255, 255, 255, 0.85);
        margin-bottom: var(--spacing-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 500;
      }

      .pin-code {
        font-size: 5rem;
        font-weight: 800;
        color: #fff;
        letter-spacing: 0.15em;
        font-family: 'Courier New', monospace;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      }

      .player-url {
        font-size: var(--font-size-large);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        word-break: break-all;
      }

      .qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
        min-width: 0;
      }

      .qr-code {
        width: 150px;
        height: 150px;
        border: 3px solid rgba(255, 255, 255, 0.8);
        border-radius: var(--border-radius);
        background: white;
        padding: 6px;
      }

      .qr-label {
        font-size: var(--font-size-small);
        color: rgba(255, 255, 255, 0.85);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .lobby-controls {
        display: flex;
        gap: var(--spacing-md);
        justify-content: center;
        margin: var(--spacing-xl) 0;
        flex-wrap: wrap;
      }

      .lobby-controls button {
        min-width: 200px;
        font-size: var(--font-size-large);
        padding: var(--spacing-md) var(--spacing-xl);
        border-radius: var(--border-radius);
        border: none;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.2s ease;
      }

      .lobby-controls button.primary {
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
        color: white;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
      }

      .lobby-controls button.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
      }

      .lobby-controls button.danger {
        background: var(--color-bg-alt, #151932);
        color: var(--color-error);
        border: 2px solid var(--color-error);
      }

      .lobby-controls button.danger:hover {
        background: var(--color-error);
        color: white;
        transform: translateY(-2px);
      }

      .share-row {
        display: flex;
        gap: var(--spacing-sm);
        align-items: stretch;
      }

      .share-input {
        flex: 1;
        padding: var(--spacing-sm);
        background: var(--color-bg-alt, #151932);
        border: 2px solid var(--color-border);
        border-radius: var(--border-radius);
        color: var(--color-text);
        font-size: var(--font-size-base);
        min-width: 0;
      }

      .share-input:focus {
        outline: none;
        border-color: var(--color-primary);
      }

      .share-row button.secondary {
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-bg-alt, #151932);
        border: 2px solid var(--color-primary);
        border-radius: var(--border-radius);
        color: var(--color-primary);
        font-size: var(--font-size-base);
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }

      .share-row button.secondary:hover {
        background: var(--color-primary);
        color: white;
      }

      @media (max-width: 768px) {
        .pin-content {
          flex-direction: column;
          text-align: center;
        }

        .pin-center-section {
          min-width: unset;
          width: 100%;
        }

        .pin-code {
          font-size: 3.5rem;
        }

        .player-url {
          font-size: var(--font-size-base);
        }

        .qr-section {
          width: 100%;
        }

        .lobby-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .lobby-controls button {
          min-width: unset;
        }

        .share-row {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private attachEventListeners(): void {
    this.qs('#back-btn')?.addEventListener('click', () => {
      const bankId = state.getState().questionBankId;
      if (bankId) router.navigate(`/preview/${encodeURIComponent(bankId)}`);
      else router.navigate('/create');
    });

    this.qs('#play-now-btn')?.addEventListener('click', () => {
      // Store current URL so the summary screen can navigate back here
      try { localStorage.setItem('qz-flashcard-return-url', window.location.href); } catch { /* ignore */ }
      window.location.href = this.getFlashcardPlayUrl();
    });

    this.qs('#pin-display')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.getFlashcardPlayerUrl());
        const el = this.qs('#pin-display');
        if (el) {
          const orig = (el as HTMLElement).title;
          (el as HTMLElement).title = 'Copied!';
          setTimeout(() => { (el as HTMLElement).title = orig; }, 2000);
        }
      } catch { /* ignore */ }
    });

    this.qs('#copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.getFlashcardPlayerUrl());
        const btn = this.qs<HTMLButtonElement>('#copy-btn');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => { if (btn) btn.textContent = 'Copy Link'; }, 2000);
        }
      } catch {
        this.qs<HTMLInputElement>('#share-link')?.select();
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
