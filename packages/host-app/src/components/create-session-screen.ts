import { BaseComponent } from './base-component';
import { api, ApiError } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import type { QuestionBank } from '@quizzquizz/common';

/**
 * Create Session Screen
 * Host selects a question bank and creates a new quiz session
 */
export class CreateSessionScreen extends BaseComponent {
  private questionBanks: QuestionBank[] = [];

  protected async onMount(): Promise<void> {
    this.showLoading('Loading question banks...');
    
    try {
      this.questionBanks = await api.getQuestionBanks();
      this.render();
    } catch (error) {
      console.error('Failed to load question banks:', error);
      
      if (error instanceof ApiError) {
        this.showError(`Failed to load question banks: ${error.message}`);
      } else {
        this.showError('Could not connect to server. Please check if the API server is running.');
      }
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
                      <span>📝 ${bank.questions.length} questions</span>
                      ${bank.difficulty ? `<span>⭐ ${this.escapeHtml(bank.difficulty)}</span>` : ''}
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
          this.createSession(bankId);
        }
      });
    });
  }

  private async createSession(questionBankId: string): Promise<void> {
    // Find the selected bank for display purposes
    const selectedBank = this.questionBanks.find(b => b.id === questionBankId);
    
    this.showLoading(`Creating quiz with ${selectedBank?.name || 'selected bank'}...`);

    try {
      const session = await api.createSession(questionBankId);

      // Store session info in state (CRITICAL: store hostToken!)
      state.setState({
        sessionId: session.id,
        hostToken: session.hostToken,
        pin: session.pin,
        questionBankId,
      });

      console.log('✅ Session created:', {
        id: session.id,
        pin: session.pin,
        hasToken: !!session.hostToken,
      });

      // Navigate to lobby
      router.navigate(`/lobby/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      this.render(); // Re-render to show banks again
      
      if (error instanceof ApiError) {
        this.showError(`Failed to create session: ${error.message}`);
      } else {
        this.showError('Could not create session. Please try again.');
      }
    }
  }
}

// Register custom element
customElements.define('create-session-screen', CreateSessionScreen);
