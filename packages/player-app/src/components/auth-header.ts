import { BaseComponent } from './base-component';
import { api } from '../api-client';

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
    this.innerHTML = `
      <div style="background: #1a1a1a; padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; font-size: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <h2 style="margin: 0; font-size: 24px; color: #00d4ff;">QuizzQuizz</h2>
          <span style="color: #666; font-size: 16px;">Player</span>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          ${this.user ? `
            <span style="color: #aaa; font-size: 16px;">
              👤 ${this.user.name || this.user.email}
            </span>
            <button 
              class="auth-logout-btn"
              style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;"
            >
              Logout
            </button>
          ` : `
            <button 
              class="auth-login-btn"
              style="background: #00d4ff; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;"
            >
              Login / Sign Up
            </button>
          `}
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
  }
}

customElements.define('auth-header', AuthHeader);
