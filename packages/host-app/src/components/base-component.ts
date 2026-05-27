import morphdom from 'morphdom';

/**
 * Base component class for host app web components
 * Provides common functionality for all screen components
 */

export abstract class BaseComponent extends HTMLElement {
  private unsubscribers: (() => void)[] = [];
  protected isLoading = false;
  protected errorMessage: string | null = null;

  /**
   * Called when component is added to DOM
   */
  connectedCallback(): void {
    this.render();
    this.onMount();
  }

  /**
   * Called when component is removed from DOM
   */
  disconnectedCallback(): void {
    this.onUnmount();
    this.cleanup();
  }

  /**
   * Render the component's HTML
   * Override this in subclasses
   */
  protected abstract render(): void;

  /**
   * Called after component is mounted
   * Override this for initialization logic
   */
  protected onMount(): void | Promise<void> {
    // Override in subclasses
  }

  /**
   * Called before component is unmounted
   * Override this for cleanup logic
   */
  protected onUnmount(): void {
    // Override in subclasses
  }

  /**
   * Set the component's HTML content (full replace — use for initial render)
   */
  protected setContent(html: string): void {
    this.innerHTML = html;
  }

  /**
   * Patch the component's DOM in-place using morphdom.
   * Only elements that actually changed are updated, preserving focus,
   * scroll position, and CSS animations on unchanged nodes.
   */
  protected patchContent(html: string): void {
    if (!this.firstElementChild) {
      // No existing DOM to diff against — fall back to full replace
      this.innerHTML = html;
      return;
    }

    // Wrap incoming HTML in a temporary container for morphdom
    const template = document.createElement('div');
    template.innerHTML = html;

    // If single root element, morph it directly
    if (template.children.length === 1 && this.children.length === 1) {
      morphdom(this.firstElementChild, template.firstElementChild!, {
        onBeforeElUpdated(fromEl, toEl) {
          // Preserve focused elements to avoid losing user input
          if (fromEl === document.activeElement) {
            if (fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA' || fromEl.tagName === 'SELECT') {
              return false;
            }
          }
          // Skip elements with CSS animations in progress
          if (fromEl.getAnimations && fromEl.getAnimations().length > 0) {
            // Still update data attributes and text if changed
            return true;
          }
          return !fromEl.isEqualNode(toEl);
        },
      });
    } else {
      // Multiple root elements — morph the container itself
      morphdom(this, template, {
        childrenOnly: true,
        onBeforeElUpdated(fromEl, toEl) {
          if (fromEl === document.activeElement) {
            if (fromEl.tagName === 'INPUT' || fromEl.tagName === 'TEXTAREA' || fromEl.tagName === 'SELECT') {
              return false;
            }
          }
          return !fromEl.isEqualNode(toEl);
        },
      });
    }
  }

  /**
   * Query selector helper
   */
  protected qs<T extends Element>(selector: string): T | null {
    return this.querySelector<T>(selector);
  }

  /**
   * Query selector all helper
   */
  protected qsa<T extends Element>(selector: string): NodeListOf<T> {
    return this.querySelectorAll<T>(selector);
  }

  /**
   * Add an event listener that will be automatically cleaned up
   */
  protected addManagedListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
  ): void {
    element.addEventListener(event, handler as EventListener);
    this.unsubscribers.push(() => {
      element.removeEventListener(event, handler as EventListener);
    });
  }

  /**
   * Clean up all managed resources
   */
  private cleanup(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Show loading state
   */
  protected showLoading(message = 'Loading...'): void {
    this.isLoading = true;
    this.setContent(`
      <div class="screen">
        <div class="container">
          <div class="loading-container">
            <div class="spinner"></div>
            <p>${message}</p>
          </div>
        </div>
      </div>
    `);
  }

  /**
   * Show error state
   */
  protected showError(message: string): void {
    this.errorMessage = message;
    const content = this.querySelector('.error-container');
    
    if (content) {
      // Update existing error
      content.innerHTML = `
        <p class="error-message">${message}</p>
      `;
    } else {
      // Show full error screen
      this.setContent(`
        <div class="screen">
          <div class="container">
            <div class="error-container">
              <p class="error-message">${message}</p>
              <button class="primary" id="retry-button">
                Try Again
              </button>
            </div>
          </div>
        </div>
      `);

      const retryButton = this.qs<HTMLButtonElement>('#retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.errorMessage = null;
          this.render();
          this.onMount();
        });
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  protected escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
