/**
 * Minimal BaseComponent for the admin app.
 * Web Component base class — no Yjs/morphdom dependencies.
 */

export abstract class BaseComponent extends HTMLElement {
  connectedCallback(): void {
    this.render();
    this.onMount();
  }

  disconnectedCallback(): void {
    this.onUnmount();
  }

  protected abstract render(): void;

  protected onMount(): void | Promise<void> {}
  protected onUnmount(): void {}

  protected setContent(html: string): void {
    this.innerHTML = html;
  }
}
