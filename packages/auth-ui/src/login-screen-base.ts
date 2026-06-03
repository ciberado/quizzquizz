/**
 * Shared login / signup / IMAP base component.
 *
 * Extend this class and implement the single abstract method `navigateHome()`
 * to wire in app-specific routing after successful auth. All auth API calls
 * go to the shared `/api/auth/*` endpoints by default and can be overridden
 * per-app by overriding the protected methods.
 *
 * Optionally override `getSignInSubtitle()` / `getSignUpSubtitle()` for
 * per-app copy.
 *
 * @example
 * ```ts
 * import { LoginScreenBase } from '@quizzquizz/auth-ui';
 * import { router } from '../router';
 *
 * export class LoginScreen extends LoginScreenBase {
 *   protected navigateHome() { router.navigate('/'); }
 *   // optional:
 *   protected getSignInSubtitle() { return 'Sign in to manage your quizzes'; }
 * }
 * customElements.define('login-screen', LoginScreen);
 * ```
 */

/** Minimal auth-specific fetch helper used by LoginScreenBase. */
async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = JSON.parse(text) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

export abstract class LoginScreenBase extends HTMLElement {
  protected mode: 'login' | 'signup' | 'imap' = 'login';
  protected error = '';
  protected loading = false;
  protected imapEnabled = false;

  async connectedCallback(): Promise<void> {
    const { imapEnabled } = await this.getAuthCapabilities();
    this.imapEnabled = imapEnabled;
    this.render();
  }

  // ─── Abstract: must implement in subclass ──────────────────────────────────

  protected abstract navigateHome(): void;

  // ─── Concrete auth methods: override only if your app uses different endpoints

  protected async getAuthCapabilities(): Promise<{ imapEnabled: boolean }> {
    try {
      return await authRequest<{ imapEnabled: boolean }>('/api/auth/capabilities');
    } catch {
      return { imapEnabled: false };
    }
  }

  protected async signIn(email: string, password: string): Promise<void> {
    await authRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  protected async signUp(
    email: string,
    password: string,
    username: string,
    name: string,
  ): Promise<void> {
    await authRequest('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, name }),
    });
  }

  protected async imapSignIn(email: string, password: string): Promise<void> {
    await authRequest('/api/auth/imap-sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ─── Optional copy overrides ────────────────────────────────────────────────

  protected getSignInSubtitle(): string {
    return 'Sign in to continue';
  }

  protected getSignUpSubtitle(): string {
    return 'Sign up to get started';
  }

  // ─── Internal logic ─────────────────────────────────────────────────────────

  protected toggleMode(newMode: 'login' | 'signup' | 'imap'): void {
    this.mode = newMode;
    this.error = '';
    this.render();
  }

  protected async handleSubmit(event: Event): Promise<void> {
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
        if (!name || !username) throw new Error('Name and username are required');
        await this.signUp(email, password, username, name);
      } else if (this.mode === 'imap') {
        await this.imapSignIn(email, password);
      } else {
        await this.signIn(email, password);
      }

      // Dispatch auth-changed BEFORE navigation so nav headers update correctly
      window.dispatchEvent(new CustomEvent('auth-changed'));
      this.navigateHome();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Authentication failed';
      this.loading = false;
      this.render();
    }
  }

  protected render(): void {
    const isImap = this.mode === 'imap';
    const isSignup = this.mode === 'signup';

    this.innerHTML = `
      <div class="screen">
        <div class="login-card">
          <h1 style="color: var(--color-primary); margin-bottom: 0.5rem; text-align: center;">
            ${isSignup ? 'Create Account' : isImap ? 'IMAP Sign In' : 'Welcome Back'}
          </h1>
          <p style="color: var(--color-text-secondary, var(--color-text-light)); text-align: center; margin-bottom: 2rem;">
            ${isSignup ? this.getSignUpSubtitle() : isImap ? 'Sign in with your corporate email' : this.getSignInSubtitle()}
          </p>

          ${
            this.error
              ? `<div class="auth-error" style="background: var(--color-error, #ef4444); color: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.875rem;">${this.error}</div>`
              : ''
          }

          <form class="auth-form">
            ${
              isSignup
                ? `
              <div style="margin-bottom: 1rem;">
                <label>Full Name</label>
                <input type="text" name="name" required placeholder="John Doe" />
              </div>
              <div style="margin-bottom: 1rem;">
                <label>Username</label>
                <input type="text" name="username" required placeholder="johndoe" />
              </div>
            `
                : ''
            }
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
              ${this.loading ? 'disabled' : ''}
              style="width: 100%; margin-bottom: 1rem;"
            >
              ${this.loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <hr class="login-card-divider" style="margin-bottom: 1rem;" />
          <div style="text-align: center; display: flex; flex-direction: column; gap: 0.5rem;">
            ${
              !isSignup
                ? `<button class="btn-toggle-signup secondary" style="min-height: auto; padding: 6px 12px;">Don't have an account? Sign up</button>`
                : `<button class="btn-toggle-login secondary" style="min-height: auto; padding: 6px 12px;">Already have an account? Sign in</button>`
            }
            ${
              this.imapEnabled && !isSignup
                ? `<button class="btn-toggle-imap secondary" style="min-height: auto; padding: 6px 12px;">
                    ${isImap ? 'Use email + password instead' : 'Sign in with IMAP (corporate)'}
                   </button>`
                : ''
            }
            <button class="skip-btn secondary" style="min-height: auto; padding: 6px 12px;">
              Continue without account →
            </button>
          </div>
        </div>
      </div>
    `;

    this.querySelector('.auth-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.querySelector('.btn-toggle-signup')?.addEventListener('click', () =>
      this.toggleMode('signup'),
    );
    this.querySelector('.btn-toggle-login')?.addEventListener('click', () =>
      this.toggleMode('login'),
    );
    this.querySelector('.btn-toggle-imap')?.addEventListener('click', () =>
      this.toggleMode(this.mode === 'imap' ? 'login' : 'imap'),
    );
    this.querySelector('.skip-btn')?.addEventListener('click', () => this.navigateHome());
  }
}
