/**
 * Global error boundary
 * Catches unhandled errors and displays a recovery screen
 */

import { router } from './router';
import { state } from './state';

export class ErrorBoundary {
  private errorElement: HTMLDivElement | null = null;
  private originalErrorHandler: OnErrorEventHandler | null = null;

  constructor() {
    this.setupGlobalErrorHandler();
  }

  private setupGlobalErrorHandler(): void {
    // Save original handler
    this.originalErrorHandler = window.onerror;

    // Set up new handler
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('[ErrorBoundary] Caught error:', { message, source, lineno, colno, error });
      
      this.showErrorScreen(error || new Error(String(message)));
      
      // Call original handler if it exists
      if (this.originalErrorHandler) {
        this.originalErrorHandler(message, source, lineno, colno, error);
      }
      
      // Prevent default browser error handling
      return true;
    };

    // Also handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ErrorBoundary] Unhandled promise rejection:', event.reason);
      this.showErrorScreen(event.reason);
      event.preventDefault();
    });
  }

  private showErrorScreen(error: Error | unknown): void {
    // Clear any existing error screen
    if (this.errorElement) {
      this.errorElement.remove();
    }

    // Create error screen
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'error-screen';
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.errorElement.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1 class="error-title">Something went wrong</h1>
        <p class="error-message">An unexpected error occurred. You can try restarting the app.</p>
        ${process.env.NODE_ENV === 'development' ? `
          <details class="error-details">
            <summary>Error details (development only)</summary>
            <pre>${errorMessage}\n\n${errorStack || 'No stack trace'}</pre>
          </details>
        ` : ''}
        <div class="error-actions">
          <button class="btn btn-primary restart-btn">Restart App</button>
          <button class="btn btn-secondary home-btn">Go to Home</button>
        </div>
      </div>
    `;

    // Add event listeners
    const restartBtn = this.errorElement.querySelector('.restart-btn');
    const homeBtn = this.errorElement.querySelector('.home-btn');

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.restart();
      });
    }

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this.goHome();
      });
    }

    // Add to DOM
    document.body.appendChild(this.errorElement);
  }

  private restart(): void {
    // Clear all state
    state.clearState();
    
    // Reload the page
    window.location.reload();
  }

  private goHome(): void {
    // Hide error screen
    if (this.errorElement) {
      this.errorElement.remove();
      this.errorElement = null;
    }

    // Clear state and navigate home
    state.clearState();
    router.navigate('/');
  }

  /**
   * Clean up error boundary
   */
  destroy(): void {
    // Restore original error handler
    window.onerror = this.originalErrorHandler;
    
    // Remove error screen if present
    if (this.errorElement) {
      this.errorElement.remove();
      this.errorElement = null;
    }
  }
}
