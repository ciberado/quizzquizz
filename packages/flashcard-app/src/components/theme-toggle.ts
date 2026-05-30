import { theme } from '../theme';

/**
 * Floating theme toggle button — fixed in the bottom-right corner.
 * Always accessible regardless of scroll position or which screen is active.
 */
export class ThemeToggle extends HTMLElement {
  private btn: HTMLButtonElement | null = null;

  connectedCallback(): void {
    this.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
    `;

    this.btn = document.createElement('button');
    this.updateButton();
    this.appendChild(this.btn);

    this.btn.addEventListener('click', () => {
      theme.toggle();
      this.updateButton();
    });

    window.addEventListener('theme-changed', () => this.updateButton());
  }

  disconnectedCallback(): void {
    window.removeEventListener('theme-changed', () => this.updateButton());
  }

  private updateButton(): void {
    if (!this.btn) return;
    const isDark = theme.load() === 'dark';
    const icon = isDark ? '☀️' : '🌙';
    const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    this.btn.textContent = icon;
    this.btn.setAttribute('aria-label', label);
    this.btn.setAttribute('title', label);
    this.btn.style.cssText = `
      background: rgba(128, 128, 128, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(128, 128, 128, 0.25);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      min-height: 40px;
      padding: 0;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.15s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    `;

    this.btn.addEventListener('mouseenter', () => {
      if (this.btn) {
        this.btn.style.background = 'rgba(128, 128, 128, 0.3)';
        this.btn.style.transform = 'scale(1.1)';
      }
    }, { once: false });

    this.btn.addEventListener('mouseleave', () => {
      if (this.btn) {
        this.btn.style.background = 'rgba(128, 128, 128, 0.15)';
        this.btn.style.transform = 'scale(1)';
      }
    }, { once: false });
  }
}

customElements.define('theme-toggle', ThemeToggle);
