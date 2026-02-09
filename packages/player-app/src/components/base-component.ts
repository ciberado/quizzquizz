/**
 * Base class for Web Components with lifecycle helpers
 */
export abstract class BaseComponent extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback(): void {
    this.onMount();
    this.render();
  }

  disconnectedCallback(): void {
    this.onUnmount();
  }

  /**
   * Called when component is added to DOM
   */
  protected onMount(): void {
    // Override in subclasses if needed
  }

  /**
   * Called when component is removed from DOM
   */
  protected onUnmount(): void {
    // Override in subclasses if needed
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
