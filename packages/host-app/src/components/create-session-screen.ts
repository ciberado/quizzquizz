import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { handleApiError } from '../error-handler';

// Use a simpler type for the question bank summary (from GET /api/question-banks)
interface QuestionBankSummary {
  id: string;
  name: string;
  description?: string;
  topics?: string[];
  questionCount: number;
}

/**
 * Create Session Screen
 * Host selects a question bank and creates a new quiz session
 */
export class CreateSessionScreen extends BaseComponent {
  private questionBanks: QuestionBankSummary[] = [];
  private isReloading: boolean = false;

  protected async onMount(): Promise<void> {
    await this.loadQuestionBanks();
  }

  private async loadQuestionBanks(): Promise<void> {
    this.showLoading('Loading question banks...');
    
    try {
      this.questionBanks = await api.getQuestionBanks();
      this.render();
    } catch (error) {
      console.error('Failed to load question banks:', error);
      handleApiError(error, 'Loading question banks');
      this.showError('Could not load question banks. Please check if the API server is running.');
    }
  }

  private async reloadQuestionBanks(): Promise<void> {
    if (this.isReloading) return;
    
    this.isReloading = true;
    const button = this.querySelector('.reload-btn') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.textContent = '🔄 Reloading...';
    }

    try {
      const result = await api.reloadQuestionBanks();
      console.log('✅ Question banks reloaded:', result);
      
      // Reload the list
      this.questionBanks = await api.getQuestionBanks();
      this.render();
      
      // Show success message briefly
      if (button) {
        button.textContent = '✅ Reloaded!';
        setTimeout(() => {
          if (button) {
            button.textContent = '🔄 Refresh Banks';
            button.disabled = false;
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to reload question banks:', error);
      handleApiError(error, 'Reloading question banks');
      
      if (button) {
        button.textContent = '❌ Failed';
        button.disabled = false;
        setTimeout(() => {
          if (button) {
            button.textContent = '🔄 Refresh Banks';
          }
        }, 2000);
      }
    } finally {
      this.isReloading = false;
    }
  }

  protected render(): void {
    if (this.questionBanks.length === 0 && !this.errorMessage) {
      // Still loading or no banks
      return;
    }

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
            
            ${this.questionBanks.length === 0 ? `
              <div class="error-container">
                <p class="error-message">No question banks available</p>
                <p>Add question bank files to the <code>question-banks/</code> directory, then click "Refresh Banks".</p>
              </div>
            ` : `
              <div class="question-banks-grid">
                ${this.questionBanks.map(bank => `
                  <div class="question-bank-card" data-bank-id="${this.escapeHtml(bank.id)}">
                    <h3>${this.escapeHtml(bank.name)}</h3>
                    <p>${this.escapeHtml(bank.description || 'No description')}</p>
                    <div class="bank-meta">
                      <span>📚 ${bank.questionCount} questions</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `);

    // Set up event listener for reload button
    const reloadBtn = this.querySelector('.reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => this.reloadQuestionBanks());
    }

    // Set up event listeners for question bank cards
    this.qsa('.question-bank-card').forEach(card => {
      card.addEventListener('click', () => {
        const bankId = card.getAttribute('data-bank-id');
        if (bankId) {
          // Navigate to preview screen instead of immediate creation
          router.navigate(`/preview/${bankId}`);
        }
      });
    });
  }

  // Removed createSession method - now handled in question-preview-screen
}

// Register custom element
customElements.define('create-session-screen', CreateSessionScreen);
