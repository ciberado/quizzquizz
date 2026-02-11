import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import { handleApiError, getErrorMessage } from '../error-handler';

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

  protected async onMount(): Promise<void> {
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

  protected render(): void {
    if (this.questionBanks.length === 0 && !this.errorMessage) {
      // Still loading or no banks
      return;
    }

    this.setContent(`
      <div class="screen">
        <div class="container">
          <div class="card">
            <h1 class="text-center">Create Quiz</h1>
            <p class="text-center" style="font-size: var(--font-size-large); margin-bottom: var(--spacing-xl);">
              Select a question bank to start
            </p>
            
            ${this.questionBanks.length === 0 ? `
              <div class="error-container">
                <p class="error-message">No question banks available</p>
                <p>Add question bank files to the <code>question-banks/</code> directory.</p>
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
