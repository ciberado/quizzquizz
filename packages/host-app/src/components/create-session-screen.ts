import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { handleApiError } from '../error-handler';
import type { BankBrowser } from './bank-browser';

/**
 * Create Session Screen
 * Host selects a question bank via the folder browser and is sent to the preview screen.
 */
export class CreateSessionScreen extends BaseComponent {
  private isReloading = false;

  protected onMount(): void {
    this.render();
  }

  private browser(): BankBrowser | null {
    return this.qs<BankBrowser>('qz-bank-browser');
  }

  private async reloadQuestionBanks(): Promise<void> {
    if (this.isReloading) return;
    this.isReloading = true;

    const button = this.qs<HTMLButtonElement>('.reload-btn');
    if (button) { button.disabled = true; button.textContent = '🔄 Reloading...'; }

    try {
      const result = await api.reloadQuestionBanks();
      console.log('✅ Question banks reloaded:', result);
      await this.browser()?.loadTree();
      if (button) {
        button.textContent = '✅ Reloaded!';
        setTimeout(() => { if (button) { button.textContent = '🔄 Refresh Banks'; button.disabled = false; } }, 2000);
      }
    } catch (error) {
      console.error('Failed to reload question banks:', error);
      handleApiError(error, 'Reloading question banks');
      if (button) {
        button.textContent = '❌ Failed';
        button.disabled = false;
        setTimeout(() => { if (button) button.textContent = '🔄 Refresh Banks'; }, 2000);
      }
    } finally {
      this.isReloading = false;
    }
  }

  protected render(): void {
    this.setContent(`
      <div class="screen">
        <div class="container">
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
              <h1 style="margin: 0;">Create Quiz</h1>
              <button class="reload-btn btn-secondary" style="padding: var(--spacing-sm) var(--spacing-md);">
                🔄 Refresh Banks
              </button>
            </div>
            <p class="text-center" style="font-size: var(--font-size-large); margin-bottom: var(--spacing-xl);">
              Select a question bank to start
            </p>
            <qz-bank-browser></qz-bank-browser>
          </div>
        </div>
      </div>
    `);

    this.qs('.reload-btn')?.addEventListener('click', () => this.reloadQuestionBanks());

    this.addEventListener('bank-selected', (e: Event) => {
      const { bankId } = (e as CustomEvent<{ bankId: string }>).detail;
      if (bankId) router.navigate(`/preview/${encodeURIComponent(bankId)}`);
    });
  }
}

customElements.define('create-session-screen', CreateSessionScreen);

