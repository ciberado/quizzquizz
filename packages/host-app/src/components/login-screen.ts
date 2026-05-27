import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';

/**
 * Login/Signup screen for host authentication
 */
export class LoginScreen extends BaseComponent {
  private mode: 'login' | 'signup' = 'login';
  private error: string = '';
  private loading: boolean = false;

  connectedCallback() {
    this.render();
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? 'signup' : 'login';
    this.error = '';
    this.render();
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.error = '';
    this.loading = true;
    this.render();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (this.mode === 'signup') {
        const name = formData.get('name') as string;
        const username = formData.get('username') as string;
        
        if (!name || !username) {
          throw new Error('Name and username are required');
        }

        await api.signUp(email, password, username, name);
      } else {
        await api.signIn(email, password);
      }

      // Success - redirect to home
      router.navigate('/');
      // Trigger auth header refresh
      window.dispatchEvent(new CustomEvent('auth-changed'));
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Authentication failed';
      this.loading = false;
      this.render();
    }
  }

  render() {
    const html = `
      <div class="screen">
        <div class="login-card">
          <h1 style="color: var(--color-primary); margin-bottom: 0.5rem; text-align: center; font-size: var(--font-size-large);">
            ${this.mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style="color: var(--color-text-secondary); text-align: center; margin-bottom: 2rem; font-size: var(--font-size-base);">
            ${this.mode === 'login' ? 'Sign in to manage your quizzes' : 'Sign up to save your quiz history'}
          </p>

          ${this.error ? `
            <div style="background: var(--color-error); color: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem;">
              ${this.error}
            </div>
          ` : ''}

          <form class="auth-form">
            ${this.mode === 'signup' ? `
              <div style="margin-bottom: 1rem;">
                <label>Full Name</label>
                <input type="text" name="name" required placeholder="John Doe" />
              </div>
              <div style="margin-bottom: 1rem;">
                <label>Username</label>
                <input type="text" name="username" required placeholder="johndoe" />
              </div>
            ` : ''}

            <div style="margin-bottom: 1rem;">
              <label>Email</label>
              <input type="email" name="email" required placeholder="you@example.com" />
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label>Password</label>
              <input type="password" name="password" required minlength="8" placeholder="••••••••" />
            </div>

            <button
              type="submit"
              class="primary"
              ${this.loading ? 'disabled' : ''}
              style="width: 100%; margin-bottom: 1rem; font-size: var(--font-size-base);"
            >
              ${this.loading ? 'Please wait...' : (this.mode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <hr class="login-card-divider" style="margin-bottom: 1rem;" />
          <div style="text-align: center; display: flex; flex-direction: column; gap: 0.5rem;">
            <button class="toggle-mode-btn secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
              ${this.mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            <button class="skip-btn secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
              Continue without account →
            </button>
          </div>
        </div>
      </div>
    `;

    this.patchContent(html);

    // Attach event listeners
    const form = this.querySelector('.auth-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    const toggleBtn = this.querySelector('.toggle-mode-btn');
    toggleBtn?.addEventListener('click', () => this.toggleMode());

    const skipBtn = this.querySelector('.skip-btn');
    skipBtn?.addEventListener('click', () => router.navigate('/'));
  }
}

customElements.define('login-screen', LoginScreen);
