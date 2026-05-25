/**
 * Base class for Web Components with lifecycle helpers
 */
export abstract class BaseComponent extends HTMLElement {
  private _isReady = false;

  constructor() {
    super();
  }

  connectedCallback(): void {
    // Render component first
    this.render();
    
    // Mark as ready immediately after render (tests can proceed)
    this.markAsReady();
    
    // Then run onMount (which may be async, e.g., start polling)
    const mountResult = this.onMount();
    if (mountResult instanceof Promise) {
      mountResult.catch((error) => {
        console.error('Error during component mount:', error);
      });
    }
  }

  disconnectedCallback(): void {
    this.onUnmount();
    this._isReady = false;
    this.removeAttribute('data-ready');
  }

  /**
   * Called when component is added to DOM
   */
  protected onMount(): void | Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Called when component is removed from DOM
   */
  protected onUnmount(): void {
    // Override in subclasses if needed
  }

  /**
   * Mark component as ready for testing
   */
  protected markAsReady(): void {
    this._isReady = true;
    this.setAttribute('data-ready', 'true');
  }

  /**
   * Check if component is ready
   */
  public get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Render the component. Override this in subclasses.
   */
  protected abstract render(): void;

  /**
   * Helper to update DOM content
   */
  protected setContent(html: string): void {
    this.innerHTML = html;
  }

  /**
   * Helper to create and attach event listeners
   * Returns cleanup function to remove listener
   */
  protected on<K extends keyof HTMLElementEventMap>(
    selector: string,
    event: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
  ): () => void {
    const element = this.querySelector<HTMLElement>(selector);
    if (element) {
      const boundHandler = handler.bind(element);
      element.addEventListener(event, boundHandler as EventListener);
      return () => element.removeEventListener(event, boundHandler as EventListener);
    }
    return () => {}; // No-op cleanup
  }

  /**
   * Helper to attach event listener to component itself
   */
  protected onSelf<K extends keyof HTMLElementEventMap>(
    event: K,
    handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
  ): () => void {
    const boundHandler = handler.bind(this);
    this.addEventListener(event, boundHandler as EventListener);
    return () => this.removeEventListener(event, boundHandler as EventListener);
  }

  /**
   * Safe query selector with type assertion
   */
  protected qs<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.querySelector<T>(selector);
  }

  /**
   * Safe query selector all
   */
  protected qsAll<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> {
    return this.querySelectorAll<T>(selector);
  }
}
