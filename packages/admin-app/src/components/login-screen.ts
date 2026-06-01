import { BaseComponent } from './base-component';
import { signIn, ApiError } from '../api-client';
import { navigate } from '../router';

export class LoginScreen extends BaseComponent {
  private error = '';
  private loading = false;

  protected render(): void {
    this.setContent(`
      <div class="auth-screen">
        <div class="auth-card">
          <h1>QuizzQuizz Admin</h1>
          <p>Sign in with your admin credentials</p>

          ${this.error ? `<div class="alert-error">${this.error}</div>` : ''}

          <form class="login-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required placeholder="admin@example.com" autofocus />
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required placeholder="••••••••" />
            </div>
            <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    `);

    const form = this.querySelector('.login-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    this.error = '';
    this.loading = true;
    this.render();

    try {
      const { user } = await signIn(email, password);

      if (!user.isAdmin) {
        this.error = 'Access denied — this account does not have admin privileges.';
        this.loading = false;
        this.render();
        return;
      }

      window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));

      if (user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/users');
      }
    } catch (err) {
      this.error = err instanceof ApiError ? err.message : 'Authentication failed';
      this.loading = false;
      this.render();
    }
  }
}

customElements.define('admin-login-screen', LoginScreen);
