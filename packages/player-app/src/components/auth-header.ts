import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { theme } from '../theme';

/**
 * Authentication header component for player app
 * Shows login/logout button and current user info
 */
export class AuthHeader extends BaseComponent {
  private user: { name: string; email: string } | null = null;

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
  }
}

customElements.define('auth-header', AuthHeader);
