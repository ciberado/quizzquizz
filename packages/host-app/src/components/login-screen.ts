import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';

/**
 * Login/Signup screen for host authentication
 */
export class LoginScreen extends BaseComponent {
  private mode: 'login' | 'signup' | 'imap' = 'login';
  private error: string = '';
  private loading: boolean = false;
  private imapEnabled: boolean = false;

  async connectedCallback() {
    const { imapEnabled } = await api.getAuthCapabilities();
    this.imapEnabled = imapEnabled;
    this.render();
  }

  toggleMode(newMode: 'login' | 'signup' | 'imap') {
    this.mode = newMode;
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
      } else if (this.mode === 'imap') {
        await api.imapSignIn(email, password);
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
    const isImap = this.mode === 'imap';
    const isSignup = this.mode === 'signup';

    const html = `
      <div class="screen">
        <div class="login-card">
          <h1 style="color: var(--color-primary); margin-bottom: 0.5rem; text-align: center; font-size: var(--font-size-large);">
            ${isSignup ? 'Create Account' : isImap ? 'IMAP Sign In' : 'Welcome Back'}
          </h1>
          <p style="color: var(--color-text-secondary); text-align: center; margin-bottom: 2rem; font-size: var(--font-size-base);">
            ${isSignup ? 'Sign up to save your quiz history' : isImap ? 'Sign in with your corporate email' : 'Sign in to manage your quizzes'}
          </p>

          ${this.error ? `
            <div style="background: var(--color-error); color: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem;">
              ${this.error}
            </div>
          ` : ''}

          <form class="auth-form">
            ${isSignup ? `
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
              <input type="password" name="password" required ${!isImap ? 'minlength="8"' : ''} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              class="primary"
              ${this.loading ? 'disabled' : ''}
              style="width: 100%; margin-bottom: 1rem; font-size: var(--font-size-base);"
            >
              ${this.loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <hr class="login-card-divider" style="margin-bottom: 1rem;" />
          <div style="text-align: center; display: flex; flex-direction: column; gap: 0.5rem;">
            ${!isSignup ? `
              <button class="btn-toggle-signup secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
                Don't have an account? Sign up
              </button>
            ` : `
              <button class="btn-toggle-login secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
                Already have an account? Sign in
              </button>
            `}
            ${this.imapEnabled && !isSignup ? `
              <button class="btn-toggle-imap secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
                ${isImap ? 'Use email + password instead' : 'Sign in with IMAP (corporate)'}
              </button>
            ` : ''}
            <button class="skip-btn secondary" style="font-size: var(--font-size-small); min-height: auto; padding: 6px 12px;">
              Continue without account →
            </button>
          </div>
        </div>
      </div>
    `;

    this.patchContent(html);

    const form = this.querySelector('.auth-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    this.querySelector('.btn-toggle-signup')?.addEventListener('click', () => this.toggleMode('signup'));
    this.querySelector('.btn-toggle-login')?.addEventListener('click', () => this.toggleMode('login'));
    this.querySelector('.btn-toggle-imap')?.addEventListener('click', () =>
      this.toggleMode(this.mode === 'imap' ? 'login' : 'imap')
    );
    this.querySelector('.skip-btn')?.addEventListener('click', () => router.navigate('/'));
  }
}

customElements.define('login-screen', LoginScreen);
