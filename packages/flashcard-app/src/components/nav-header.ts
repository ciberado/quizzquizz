/**
 * Nav Header — top bar with hamburger menu for cross-app navigation.
 * Shows a login/logout button in the top bar and an about dialog via the drawer.
 */
import { api } from '../api-client';
import { theme } from '../theme';

export class NavHeader extends HTMLElement {
  private menuOpen = false;
  private aboutDialogOpen = false;
  private user: { name: string; email: string } | null = null;

  private readonly boundCheckAuth = (): void => { void this.checkAuth(); };
  private readonly boundRender = (): void => { this.render(); };

  connectedCallback(): void {
    void this.checkAuth();
    window.addEventListener('auth-changed', this.boundCheckAuth);
    window.addEventListener('theme-changed', this.boundRender);
  }

  disconnectedCallback(): void {
    window.removeEventListener('auth-changed', this.boundCheckAuth);
    window.removeEventListener('theme-changed', this.boundRender);
  }

  private async checkAuth(): Promise<void> {
    try {
      const session = await api.getAuthSession();
      this.user = session?.user ?? null;
    } catch {
      this.user = null;
    }
    this.render();
  }

  private async handleLogout(): Promise<void> {
    try {
      await api.signOut();
      this.user = null;
      window.dispatchEvent(new CustomEvent('auth-changed'));
      window.location.hash = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  private render(): void {
    const currentTheme = theme.load();
    const isDark = currentTheme === 'dark';
    const themeIcon = isDark ? '☀️' : '🌙';
    const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    this.innerHTML = `
      <header class="app-nav-bar">
        <button class="app-nav-hamburger" aria-label="Open navigation menu" title="Menu">☰</button>
        <div class="app-nav-brand">
          <a href="/" class="app-nav-title">🎯 QuizzQuizz</a>
          <span class="app-nav-label">Flashcard</span>
        </div>
        <div class="app-nav-actions">
          ${this.user
            ? `<span class="app-nav-user">👤 ${this.user.name || this.user.email}</span>
               <button class="app-nav-logout-btn app-nav-action-btn">Logout</button>`
            : `<button class="app-nav-login-btn app-nav-action-btn">Login</button>`
          }
          <button class="app-nav-theme-btn" aria-label="${themeLabel}" title="${themeLabel}">${themeIcon}</button>
        </div>
      </header>
      <div class="nav-drawer-overlay${this.menuOpen ? ' open' : ''}"></div>
      <nav class="nav-drawer${this.menuOpen ? ' open' : ''}" aria-label="App navigation">
        <div class="nav-drawer-header">
          <span class="nav-drawer-title">Navigation</span>
          <button class="nav-drawer-close" aria-label="Close menu">✕</button>
        </div>
        <div class="nav-drawer-section-title">Switch App</div>
        <a href="/" class="nav-drawer-link">🎮 Player</a>
        <a href="/host" class="nav-drawer-link">📽️ Host</a>
        <a href="/flashcard" class="nav-drawer-link">🃏 Flashcard</a>
        <a href="/analytics" class="nav-drawer-link">📊 Analytics</a>
        <a href="/admin" class="nav-drawer-link">⚙️ Admin</a>
        <hr class="nav-drawer-divider" />
        <button class="about-drawer-link" aria-label="About QuizzQuizz">❓ About</button>
      </nav>
      <div class="about-dialog-overlay${this.aboutDialogOpen ? ' open' : ''}"></div>
      <div class="about-dialog${this.aboutDialogOpen ? ' open' : ''}" role="dialog" aria-label="About QuizzQuizz">
        <div class="about-dialog-header">
          <h2>About QuizzQuizz</h2>
          <button class="about-dialog-close" aria-label="Close">✕</button>
        </div>
        <div class="about-dialog-content">
          <p class="about-version">Version 0.17.0</p>
          <p class="about-text">A real-time competitive quiz platform for engaging classroom experiences. Teachers create quizzes, students compete on their devices, and everyone has fun.</p>
          <a href="https://github.com/ciberado/quizzquizz" target="_blank" rel="noopener noreferrer" class="about-link">
            View on GitHub →
          </a>
        </div>
      </div>
    `;

    this.querySelector('.app-nav-hamburger')?.addEventListener('click', () => {
      this.menuOpen = true;
      this.render();
    });
    this.querySelector('.nav-drawer-close')?.addEventListener('click', () => {
      this.menuOpen = false;
      this.render();
    });
    this.querySelector('.nav-drawer-overlay')?.addEventListener('click', () => {
      this.menuOpen = false;
      this.render();
    });
    this.querySelector('.app-nav-theme-btn')?.addEventListener('click', () => theme.toggle());
    this.querySelector('.about-drawer-link')?.addEventListener('click', () => {
      this.menuOpen = false;
      this.aboutDialogOpen = true;
      this.render();
    });
    this.querySelector('.about-dialog-close')?.addEventListener('click', () => {
      this.aboutDialogOpen = false;
      this.render();
    });
    this.querySelector('.about-dialog-overlay')?.addEventListener('click', () => {
      this.aboutDialogOpen = false;
      this.render();
    });
    this.querySelector('.app-nav-login-btn')?.addEventListener('click', () => {
      window.location.hash = '/login';
    });
    this.querySelector('.app-nav-logout-btn')?.addEventListener('click', () => {
      void this.handleLogout();
    });
  }
}

customElements.define('nav-header', NavHeader);
