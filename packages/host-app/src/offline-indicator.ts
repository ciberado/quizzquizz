import { addOnlineListener } from './network-utils';

/**
 * Offline indicator component
 * Shows a banner when the user loses internet connection
 */
export class OfflineIndicator {
  private element: HTMLDivElement | null = null;
  private removeListener: (() => void) | null = null;
  private isOffline: boolean = !navigator.onLine;

  constructor() {
    // Skip in test environments (Playwright sets window.playwright)
    if ((window as { playwright?: unknown }).playwright) {
      console.log('[OfflineIndicator] Skipping in test environment');
      return;
    }
    
    this.render();
    this.attachListeners();
  }

  private render(): void {
    // Create indicator element
    this.element = document.createElement('div');
    this.element.className = 'offline-indicator';
    this.element.innerHTML = `
      <span class="offline-icon">⚠️</span>
      <span class="offline-text">No internet connection</span>
    `;

    // Add to DOM
    document.body.appendChild(this.element);

    // Show/hide based on initial state
    this.updateVisibility();
  }

  private attachListeners(): void {
    this.removeListener = addOnlineListener((online) => {
      this.isOffline = !online;
      this.updateVisibility();
      
      if (online) {
        this.showReconnectedMessage();
      }
    });
  }

  private updateVisibility(): void {
    if (!this.element) return;

    if (this.isOffline) {
      this.element.classList.add('visible');
    } else {
      this.element.classList.remove('visible');
    }
  }

  private showReconnectedMessage(): void {
    if (!this.element) return;

    // Temporarily show "Reconnected" message
    const originalText = this.element.querySelector('.offline-text');
    if (originalText) {
      originalText.textContent = 'Connection restored';
    }

    // Reset after 3 seconds
    setTimeout(() => {
      if (originalText) {
        originalText.textContent = 'No internet connection';
      }
    }, 3000);
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    if (this.removeListener) {
      this.removeListener();
      this.removeListener = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
