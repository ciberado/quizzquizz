import { BaseComponent } from './base-component';
import { changePassword, ApiError } from '../api-client';
import { navigate } from '../router';

export class ChangePasswordScreen extends BaseComponent {
  private error = '';
  private loading = false;

  protected render(): void {
    this.setContent(`
      <div class="auth-screen">
        <div class="auth-card">
          <h1>Change Password</h1>
          <p>You must set a new password before continuing.</p>

          ${this.error ? `<div class="alert-error">${this.error}</div>` : ''}

          <form class="change-pw-form">
            <div class="form-group">
              <label for="current">Current Password</label>
              <input type="password" id="current" name="current" required placeholder="Current password" autofocus />
            </div>
            <div class="form-group">
              <label for="newpw">New Password</label>
              <input type="password" id="newpw" name="newpw" required minlength="8" placeholder="At least 8 characters" />
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="confirm">Confirm New Password</label>
              <input type="password" id="confirm" name="confirm" required minlength="8" placeholder="Repeat new password" />
            </div>
            <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    `);

    const form = this.querySelector('.change-pw-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const current = (form.elements.namedItem('current') as HTMLInputElement).value;
    const newpw = (form.elements.namedItem('newpw') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;

    if (newpw !== confirm) {
      this.error = 'Passwords do not match';
      this.render();
      return;
    }

    this.error = '';
    this.loading = true;
    this.render();

    try {
      await changePassword(current, newpw);
      navigate('/users');
    } catch (err) {
      this.error = err instanceof ApiError ? err.message : 'Failed to change password';
      this.loading = false;
      this.render();
    }
  }
}

customElements.define('admin-change-password-screen', ChangePasswordScreen);
