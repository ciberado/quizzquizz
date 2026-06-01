import { BaseComponent } from './base-component';
import {
  listUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  signOut,
  getSession,
  AdminUser,
  ApiError,
} from '../api-client';
import { navigate } from '../router';

export class UserListScreen extends BaseComponent {
  private users: AdminUser[] = [];
  private total = 0;
  private page = 1;
  private limit = 20;
  private search = '';
  private loading = false;
  private error = '';
  private currentUserId = '';

  // Modal state
  private modal: null | { type: 'delete'; user: AdminUser } | { type: 'resetDone'; tempPassword: string; username: string } = null;

  protected render(): void {
    const totalPages = Math.ceil(this.total / this.limit) || 1;

    this.setContent(`
      <div class="page">
        <header class="page-header">
          <h1>👥 User Management</h1>
          <button class="btn-secondary btn-sm logout-btn">Sign Out</button>
        </header>

        <div class="page-body">
          ${this.error ? `<div class="alert-error">${this.error}</div>` : ''}

          <div class="toolbar">
            <input
              type="search"
              class="search-input"
              placeholder="Search by name, email or username…"
              value="${this.search}"
            />
            <button class="btn-secondary btn-sm refresh-btn">↻ Refresh</button>
            <span style="color: var(--color-text-secondary); font-size: 0.85rem; margin-left: auto;">
              ${this.total} user${this.total !== 1 ? 's' : ''}
            </span>
          </div>

          ${this.loading ? '<p style="color: var(--color-text-secondary);">Loading…</p>' : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.users.map((u) => `
                  <tr data-id="${u.id}">
                    <td>${this.esc(u.email)}</td>
                    <td>${this.esc(u.username)}</td>
                    <td>${this.esc(u.name ?? '—')}</td>
                    <td>
                      ${u.isAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
                      ${u.mustChangePassword ? '<span class="badge badge-reset">Reset req.</span>' : ''}
                    </td>
                    <td style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                      <button class="btn-secondary btn-sm toggle-admin-btn" data-id="${u.id}" data-is-admin="${u.isAdmin}">
                        ${u.isAdmin ? 'Revoke admin' : 'Make admin'}
                      </button>
                      <button class="btn-secondary btn-sm reset-pw-btn" data-id="${u.id}">
                        Reset pwd
                      </button>
                      <button class="btn-danger btn-sm delete-btn" data-id="${u.id}" ${u.id === this.currentUserId ? 'disabled title="Cannot delete yourself"' : ''}>
                        Delete
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <div class="pagination">
            <button class="btn-secondary btn-sm prev-btn" ${this.page <= 1 ? 'disabled' : ''}>← Prev</button>
            <span>Page ${this.page} / ${totalPages}</span>
            <button class="btn-secondary btn-sm next-btn" ${this.page >= totalPages ? 'disabled' : ''}>Next →</button>
          </div>
        </div>
      </div>

      ${this.modal ? this.renderModal() : ''}
    `);

    this.attachEvents();
  }

  private renderModal(): string {
    if (!this.modal) return '';

    if (this.modal.type === 'delete') {
      const u = this.modal.user;
      return `
        <div class="modal-overlay">
          <div class="modal">
            <h2>Delete user?</h2>
            <p>This will permanently delete <strong>${this.esc(u.email)}</strong> and all their data. This cannot be undone.</p>
            <div class="modal-actions">
              <button class="btn-secondary modal-cancel-btn">Cancel</button>
              <button class="btn-danger modal-confirm-delete-btn" data-id="${u.id}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.modal.type === 'resetDone') {
      return `
        <div class="modal-overlay">
          <div class="modal">
            <h2>Password Reset</h2>
            <p>Temporary password for <strong>${this.esc(this.modal.username)}</strong>:</p>
            <div class="temp-password-box">${this.esc(this.modal.tempPassword)}</div>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              Share this with the user. They must change it on next login.
            </p>
            <div class="modal-actions">
              <button class="btn-primary modal-close-btn">Done</button>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  private attachEvents(): void {
    // Search
    const searchInput = this.querySelector('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.search = searchInput.value;
      this.page = 1;
      this.loadUsers();
    });

    // Refresh
    this.querySelector('.refresh-btn')?.addEventListener('click', () => this.loadUsers());

    // Pagination
    this.querySelector('.prev-btn')?.addEventListener('click', () => {
      if (this.page > 1) { this.page--; this.loadUsers(); }
    });
    this.querySelector('.next-btn')?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.total / this.limit) || 1;
      if (this.page < totalPages) { this.page++; this.loadUsers(); }
    });

    // Sign out
    this.querySelector('.logout-btn')?.addEventListener('click', async () => {
      await signOut().catch(() => {});
      navigate('/login');
    });

    // Toggle admin
    this.querySelectorAll('.toggle-admin-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset['id']!;
        const isAdmin = (btn as HTMLElement).dataset['isAdmin'] === 'true';
        try {
          await updateUser(id, { isAdmin: !isAdmin });
          await this.loadUsers();
        } catch (err) {
          this.error = err instanceof ApiError ? err.message : 'Update failed';
          this.render();
        }
      });
    });

    // Reset password
    this.querySelectorAll('.reset-pw-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset['id']!;
        const user = this.users.find((u) => u.id === id);
        try {
          const { tempPassword } = await resetUserPassword(id);
          this.modal = { type: 'resetDone', tempPassword, username: user?.email ?? id };
          this.render();
        } catch (err) {
          this.error = err instanceof ApiError ? err.message : 'Reset failed';
          this.render();
        }
      });
    });

    // Delete
    this.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset['id']!;
        const user = this.users.find((u) => u.id === id);
        if (user) {
          this.modal = { type: 'delete', user };
          this.render();
        }
      });
    });

    // Modal actions
    this.querySelector('.modal-cancel-btn')?.addEventListener('click', () => {
      this.modal = null;
      this.render();
    });

    const confirmDeleteBtn = this.querySelector('.modal-confirm-delete-btn') as HTMLElement | null;
    confirmDeleteBtn?.addEventListener('click', async () => {
      const id = confirmDeleteBtn.dataset['id']!;
      try {
        await deleteUser(id);
        this.modal = null;
        await this.loadUsers();
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Delete failed';
        this.modal = null;
        this.render();
      }
    });

    this.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      this.modal = null;
      this.render();
    });
  }

  protected async onMount(): Promise<void> {
    const session = await getSession();
    this.currentUserId = session?.user.id ?? '';
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.render();

    try {
      const result = await listUsers({ page: this.page, limit: this.limit, search: this.search });
      this.users = result.users;
      this.total = result.total;
    } catch (err) {
      this.error = err instanceof ApiError ? err.message : 'Failed to load users';
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

customElements.define('admin-user-list-screen', UserListScreen);
