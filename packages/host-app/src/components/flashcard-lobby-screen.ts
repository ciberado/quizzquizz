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
            <button type="button" id="back-btn" class="primary">
              Cancel Session
            </button>
          </div>

          <!-- Benefits card -->
          <div class="card" style="margin-top: var(--spacing-md);">
            <h3 style="margin: 0 0 var(--spacing-sm); font-size: var(--font-size-base); opacity: 0.7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Why Flashcards?</h3>
            <ul class="benefits-list">
              <li><span class="benefit-icon">🔁</span><strong>Spaced repetition</strong> — hard cards repeat, mastered ones retire</li>
              <li><span class="benefit-icon">🧠</span><strong>Active recall</strong> — retrieval beats re-reading for memory</li>
              <li><span class="benefit-icon">🚀</span><strong>Self-paced</strong> — no timer, every player finishes every card</li>
              <li><span class="benefit-icon">📊</span><strong>Session report</strong> — per-card stats, downloadable as JSON or CSV</li>
            </ul>
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
      #pin-display {
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: var(--border-radius);
      }

      #pin-display:hover {
        transform: scale(1.02);
        filter: brightness(1.08);
      }

      #pin-display:active {
        transform: scale(0.98);
      }

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

      .benefits-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xs) var(--spacing-md);
      }

      .benefits-list li {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      .benefit-icon {
        flex-shrink: 0;
      }

      .benefits-list strong {
        color: var(--color-text);
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

        .benefits-list {
          grid-template-columns: 1fr;
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
      const url = this.getFlashcardPlayerUrl();
      try {
        await navigator.clipboard.writeText(url);
        const el = this.qs<HTMLElement>('#pin-display');
        if (el) {
          const orig = el.title;
          el.title = '✅ Copied to clipboard!';
          setTimeout(() => { el.title = orig; }, 2000);
        }
      } catch {
        alert(`Join link:\n${url}`);
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
