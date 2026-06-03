import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { theme } from '../theme';

/**
 * Authentication header component for player app
 * Shows login/logout button and current user info
 */
export class AuthHeader extends BaseComponent {
  private user: { name: string; email: string } | null = null;
  private menuOpen = false;
  private aboutDialogOpen = false;

  constructor() {
    super();
    this.checkAuth();

    // Listen for auth changes
    window.addEventListener('auth-changed', () => this.checkAuth());
    window.addEventListener('theme-changed', () => this.render());
  }

  async checkAuth() {
    try {
      const session = await api.getAuthSession();
      if (session?.user) {
        this.user = session.user;
      } else {
        this.user = null;
      }
      this.render();
    } catch (error) {
      this.user = null;
      this.render();
    }
  }

  async handleLogout() {
    try {
      await api.signOut();
      this.user = null;
      this.render();
      // Redirect to home
      window.location.hash = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  handleLogin() {
    window.location.hash = '/login';
  }

  render() {
    const currentTheme = theme.load();
    const isDark = currentTheme === 'dark';
    const themeIcon = isDark ? '☀️' : '🌙';
    const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

    this.innerHTML = `
      <div class="top-bar">
        <button class="top-bar-hamburger-btn" aria-label="Open navigation menu" title="Menu">☰</button>
        <div class="top-bar-brand">
          <a href="#/">QuizzQuizz</a>
          <span class="top-bar-label">Player</span>
        </div>
        <div class="top-bar-actions">
          ${this.user ? `
            <span class="top-bar-user">👤 ${this.user.name || this.user.email}</span>
            <button class="auth-logout-btn top-bar-btn logout">Logout</button>
          ` : `
            <button class="auth-login-btn top-bar-btn login">Login / Sign Up</button>
          `}
          <button
            class="theme-toggle-btn top-bar-theme-btn"
            aria-label="${themeLabel}"
            title="${themeLabel}"
          >${themeIcon}</button>
          <button class="about-btn top-bar-btn" aria-label="About QuizzQuizz" title="About">ℹ️</button>
        </div>
      </div>
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
          <p class="about-version">Version ${this.getVersion()}</p>
          <p class="about-text">A real-time competitive quiz platform for engaging classroom experiences. Teachers create quizzes, students compete on their devices, and everyone has fun.</p>
          <a href="https://github.com/ciberado/quizzquizz" target="_blank" rel="noopener noreferrer" class="about-link">
            View on GitHub →
          </a>
        </div>
      </div>
    `;

    // Attach event listeners
    const logoutBtn = this.querySelector('.auth-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    const loginBtn = this.querySelector('.auth-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    const themeBtn = this.querySelector('.theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => theme.toggle());
    }

    const hamburgerBtn = this.querySelector('.top-bar-hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => { this.menuOpen = true; this.render(); });
    }

    const closeBtn = this.querySelector('.nav-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => { this.menuOpen = false; this.render(); });
    }

    const overlay = this.querySelector('.nav-drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => { this.menuOpen = false; this.render(); });
    }

    const aboutBtn = this.querySelector('.about-btn');
    if (aboutBtn) {
      aboutBtn.addEventListener('click', () => { this.aboutDialogOpen = true; this.render(); });
    }

    const aboutDrawerLink = this.querySelector('.about-drawer-link');
    if (aboutDrawerLink) {
      aboutDrawerLink.addEventListener('click', () => { 
        this.menuOpen = false;
        this.aboutDialogOpen = true;
        this.render();
      });
    }

    const aboutDialogClose = this.querySelector('.about-dialog-close');
    if (aboutDialogClose) {
      aboutDialogClose.addEventListener('click', () => { this.aboutDialogOpen = false; this.render(); });
    }

    const aboutDialogOverlay = this.querySelector('.about-dialog-overlay');
    if (aboutDialogOverlay) {
      aboutDialogOverlay.addEventListener('click', () => { this.aboutDialogOpen = false; this.render(); });
    }
  }

  private getVersion(): string {
    return '0.17.0';
  }
}

customElements.define('auth-header', AuthHeader);
