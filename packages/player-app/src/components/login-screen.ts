import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';

/**
 * Login/Signup screen for player authentication
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
    this.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 2rem;">
        <div style="background: #2a2a2a; padding: 3rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); max-width: 400px; width: 100%;">
          <h1 style="color: #00d4ff; margin-bottom: 0.5rem; text-align: center;">
            ${this.mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style="color: #aaa; text-align: center; margin-bottom: 2rem;">
            ${this.mode === 'login' ? 'Sign in to track your quiz stats' : 'Sign up to save your performance history'}
          </p>

          ${this.error ? `
            <div style="background: #ff4444; color: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem;">
              ${this.error}
            </div>
          ` : ''}

          <form class="auth-form">
            ${this.mode === 'signup' ? `
              <div style="margin-bottom: 1rem;">
                <label style="display: block; color: #ccc; margin-bottom: 0.5rem; font-size: 0.9rem;">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="John Doe"
                  style="width: 100%; padding: 0.75rem; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; color: white; font-size: 1rem;"
                />
              </div>
              <div style="margin-bottom: 1rem;">
                <label style="display: block; color: #ccc; margin-bottom: 0.5rem; font-size: 0.9rem;">Username</label>
                <input 
                  type="text" 
                  name="username" 
                  required
                  placeholder="johndoe"
                  style="width: 100%; padding: 0.75rem; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; color: white; font-size: 1rem;"
                />
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; color: #ccc; margin-bottom: 0.5rem; font-size: 0.9rem;">Email</label>
              <input 
                type="email" 
                name="email" 
                required
                placeholder="you@example.com"
                style="width: 100%; padding: 0.75rem; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; color: white; font-size: 1rem;"
              />
            </div>

            <div style="margin-bottom: 1.5rem;">
              <label style="display: block; color: #ccc; margin-bottom: 0.5rem; font-size: 0.9rem;">Password</label>
              <input 
                type="password" 
                name="password" 
                required
                minlength="8"
                placeholder="••••••••"
                style="width: 100%; padding: 0.75rem; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; color: white; font-size: 1rem;"
              />
            </div>

            <button 
              type="submit"
              ${this.loading ? 'disabled' : ''}
              style="width: 100%; background: #00d4ff; color: black; border: none; padding: 0.875rem; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; margin-bottom: 1rem;"
            >
              ${this.loading ? 'Please wait...' : (this.mode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div style="text-align: center; padding-top: 1rem; border-top: 1px solid #444;">
            <button 
              class="toggle-mode-btn"
              style="background: none; border: none; color: #00d4ff; cursor: pointer; font-size: 0.9rem; text-decoration: underline;"
            >
              ${this.mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          <div style="text-align: center; margin-top: 1rem;">
            <button 
              class="skip-btn"
              style="background: none; border: none; color: #888; cursor: pointer; font-size: 0.9rem;"
            >
              Continue without account →
            </button>
          </div>
        </div>
      </div>
    `;

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
