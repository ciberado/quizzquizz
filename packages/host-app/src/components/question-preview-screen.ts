import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import { handleApiError, getErrorMessage } from '../error-handler';
import type { Question, Difficulty } from '@quizzquizz/common';

interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  topics?: string[];
  questionCount: number;
}

interface QuestionPreviewResponse {
  questions: Question[];
  pagination: {
    page: number;
    limit: number;
    totalQuestions: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    difficulty: string | null;
    topic: string | null;
    tag: string | null;
  };
}

/**
 * Question Preview & Configuration Screen
 * Allows host to preview questions, apply filters, and configure session options
 */
export class QuestionPreviewScreen extends BaseComponent {
  private bankId: string = '';
  private bank: QuestionBank | null = null;
  private preview: QuestionPreviewResponse | null = null;
  private selectedQuestionIds = new Set<string>();
  private selectAllMode = true; // By default, select all questions
  private randomOrder = false;
  private automaticPace = false;
  
  // Filter state
  private selectedDifficulties = new Set<Difficulty>();
  private selectedTopics = new Set<string>();
  private availableTopics: string[] = [];
  
  // Pagination state
  private currentPage = 1;
  private limit = 10;

  protected async onMount(): Promise<void> {
    // Extract bankId from path: /preview/:bankId
    const pathParts = window.location.hash.split('/');
    this.bankId = pathParts[2] || '';

    if (!this.bankId) {
      router.navigate('/create');
      return;
    }

    await this.loadBank();
    await this.loadQuestions();
  }

  private async loadBank(): Promise<void> {
    try {
      const banks = await api.getQuestionBanks();
      this.bank = banks.find(b => b.id === this.bankId) || null;
      
      if (!this.bank) {
        throw new Error('Question bank not found');
      }

      // Extract available topics from bank metadata
      this.availableTopics = this.bank.topics || [];
    } catch (error) {
      console.error('Failed to load question bank:', error);
      handleApiError(error, 'Loading question bank');
      router.navigate('/create');
    }
  }

  private async loadQuestions(): Promise<void> {
    if (!this.bankId) return;

    this.showLoading('Loading questions...');

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('page', this.currentPage.toString());
      params.set('limit', this.limit.toString());

      if (this.selectedDifficulties.size > 0) {
        params.set('difficulty', Array.from(this.selectedDifficulties).join(','));
      }

      if (this.selectedTopics.size > 0) {
        params.set('topic', Array.from(this.selectedTopics).join(','));
      }

      const apiBaseUrl = import.meta.env?.DEV ? 'http://localhost:3000' : window.location.origin;
      const url = `${apiBaseUrl}/api/question-banks/${this.bankId}/questions?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.preview = await response.json();
      
      // If selectAllMode, auto-select all questions in preview
      if (this.selectAllMode && this.preview) {
        this.preview.questions.forEach(q => this.selectedQuestionIds.add(q.id));
      }

      this.render();
    } catch (error) {
      console.error('Failed to load questions:', error);
      handleApiError(error, 'Loading questions');
      this.showError(`Failed to load questions: ${getErrorMessage(error)}`);
    }
  }

  protected render(): void {
    if (!this.bank || !this.preview) return;

    const selectedCount = this.selectAllMode 
      ? this.preview.pagination.totalQuestions 
      : this.selectedQuestionIds.size;

    this.setContent(`
      <div class="screen">
        <div class="container" style="max-width: 1200px;">
          <div class="card">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
              <div>
                <h1>${this.escapeHtml(this.bank.name)}</h1>
                <p style="color: var(--color-text-muted); margin: 0;">
                  ${this.escapeHtml(this.bank.description || '')}
                </p>
              </div>
              <button class="btn-secondary" data-action="back">
                ← Back
              </button>
            </div>

            <!-- Filter Panel -->
            <div class="filter-panel" style="background: var(--color-bg-alt); padding: var(--spacing-md); border-radius: var(--border-radius); margin-bottom: var(--spacing-lg);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <!-- Difficulty Filter -->
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: var(--spacing-sm);">
                    Difficulty
                  </label>
                  <div style="display: flex; gap: var(--spacing-sm);">
                    ${['easy', 'medium', 'hard'].map(diff => `
                      <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input 
                          type="checkbox" 
                          data-filter="difficulty" 
                          value="${diff}"
                          ${this.selectedDifficulties.has(diff as Difficulty) ? 'checked' : ''}
                        />
                        <span style="text-transform: capitalize;">${diff}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Topic Filter -->
                <div>
                  <label style="display: block; font-weight: 600; margin-bottom: var(--spacing-sm);">
                    Topics
                  </label>
                  <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
                    ${this.availableTopics.length > 0 ? this.availableTopics.map(topic => `
                      <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                        <input 
                          type="checkbox" 
                          data-filter="topic" 
                          value="${this.escapeHtml(topic)}"
                          ${this.selectedTopics.has(topic) ? 'checked' : ''}
                        />
                        <span>${this.escapeHtml(topic)}</span>
                      </label>
                    `).join('') : '<span style="color: var(--color-text-muted);">No topics available</span>'}
                  </div>
                </div>
              </div>

              <!-- Clear Filters Button -->
              ${(this.selectedDifficulties.size > 0 || this.selectedTopics.size > 0) ? `
                <button class="btn-secondary" data-action="clear-filters" style="margin-top: var(--spacing-md);">
                  Clear Filters
                </button>
              ` : ''}
            </div>

            <!-- Selection Options -->
            <div style="background: var(--color-bg-alt); padding: var(--spacing-md); border-radius: var(--border-radius); margin-bottom: var(--spacing-lg);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <div>
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input 
                      type="checkbox" 
                      data-action="toggle-select-all"
                      ${this.selectAllMode ? 'checked' : ''}
                    />
                    <span style="font-weight: 600;">Use all questions</span>
                  </label>
                  <p style="color: var(--color-text-muted); margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-small);">
                    ${this.selectAllMode 
                      ? `All ${this.preview.pagination.totalQuestions} questions will be used` 
                      : `Manually select questions (${selectedCount} selected)`}
                  </p>
                </div>
                <div>
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input 
                      type="checkbox" 
                      data-action="toggle-random"
                      ${this.randomOrder ? 'checked' : ''}
                    />
                    <span>Random order</span>
                  </label>
                </div>
              </div>
              
              <!-- Automatic Pace Option -->
              <div>
                <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                  <input 
                    type="checkbox" 
                    data-action="toggle-automatic"
                    ${this.automaticPace ? 'checked' : ''}
                  />
                  <span style="font-weight: 600;">Automatic pace</span>
                </label>
                <p style="color: var(--color-text-muted); margin: var(--spacing-xs) 0 0 24px; font-size: var(--font-size-small);">
                  No host interaction required - automatically shows correct answers (4s) and leaderboard (4s) before advancing
                </p>
              </div>
            </div>

            <!-- Question List -->
            <div style="margin-bottom: var(--spacing-lg);">
              <h3 style="margin-bottom: var(--spacing-md);">
                Questions Preview 
                <span style="color: var(--color-text-muted); font-weight: normal; font-size: var(--font-size-base);">
                  (${this.preview.pagination.totalQuestions} ${this.preview.pagination.totalQuestions === 1 ? 'question' : 'questions'} match filters)
                </span>
              </h3>

              ${this.preview.pagination.totalQuestions === 0 ? `
                <div class="error-container">
                  <p>No questions match the selected filters</p>
                  <p style="color: var(--color-text-muted);">Try adjusting your filter selection</p>
                </div>
              ` : `
                <div class="questions-list">
                  ${this.preview.questions.map((q, index) => this.renderQuestion(q, index)).join('')}
                </div>

                <!-- Pagination -->
                ${this.renderPagination()}
              `}
            </div>

            <!-- Create Session Button -->
            <div style="display: flex; justify-content: flex-end; gap: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--color-border);">
              <button class="btn-secondary" data-action="back">
                Cancel
              </button>
              <button 
                class="btn" 
                data-action="create"
                ${this.preview.pagination.totalQuestions === 0 ? 'disabled' : ''}
              >
                Create Quiz with ${selectedCount} Question${selectedCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private renderQuestion(question: Question, index: number): string {
    const isSelected = this.selectAllMode || this.selectedQuestionIds.has(question.id);
    const displayIndex = (this.currentPage - 1) * this.limit + index + 1;

    return `
      <div class="question-preview-card ${isSelected ? 'selected' : ''}" data-question-id="${question.id}">
        <div style="display: flex; gap: var(--spacing-md);">
          ${!this.selectAllMode ? `
            <input 
              type="checkbox" 
              class="question-checkbox"
              data-question-id="${question.id}"
              ${isSelected ? 'checked' : ''}
            />
          ` : ''}
          
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-sm);">
              <h4 style="margin: 0;">${displayIndex}. ${this.escapeHtml(question.text)}</h4>
              <div style="display: flex; gap: var(--spacing-xs);">
                <span class="badge badge-${question.difficulty}">${question.difficulty}</span>
                ${question.timeLimit ? `<span class="badge">⏱️ ${question.timeLimit}s</span>` : ''}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
              ${question.answers.map(answer => {
                const isCorrect = question.correctAnswerIds.includes(answer.id);
                return `
                  <div style="padding: var(--spacing-sm); background: var(--color-bg-alt); border-radius: var(--border-radius); border-left: 3px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-border)'};">
                    ${isCorrect ? '✓ ' : ''}${this.escapeHtml(answer.text)}
                  </div>
                `;
              }).join('')}
            </div>

            ${question.topics.length > 0 ? `
              <div style="display: flex; gap: var(--spacing-xs); flex-wrap: wrap;">
                ${question.topics.map(topic => `
                  <span style="font-size: var(--font-size-small); color: var(--color-text-muted); background: var(--color-bg); padding: 2px 8px; border-radius: 4px;">
                    ${this.escapeHtml(topic)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderPagination(): string {
    if (!this.preview || this.preview.pagination.totalPages <= 1) {
      return '';
    }

    const { page, totalPages, hasPrevPage, hasNextPage } = this.preview.pagination;

    return `
      <div class="pagination" style="display: flex; justify-content: center; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
        <button 
          class="btn-secondary" 
          data-action="prev-page"
          ${!hasPrevPage ? 'disabled' : ''}
        >
          ← Previous
        </button>
        
        <span>
          Page ${page} of ${totalPages}
        </span>
        
        <button 
          class="btn-secondary" 
          data-action="next-page"
          ${!hasNextPage ? 'disabled' : ''}
        >
          Next →
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Back button
    this.qsa('[data-action="back"]').forEach(btn => {
      btn.addEventListener('click', () => router.navigate('/create'));
    });

    // Filter checkboxes
    this.qsa('[data-filter="difficulty"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const difficulty = target.value as Difficulty;
        
        if (target.checked) {
          this.selectedDifficulties.add(difficulty);
        } else {
          this.selectedDifficulties.delete(difficulty);
        }
        
        this.currentPage = 1; // Reset to first page
        this.loadQuestions();
      });
    });

    this.qsa('[data-filter="topic"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const topic = target.value;
        
        if (target.checked) {
          this.selectedTopics.add(topic);
        } else {
          this.selectedTopics.delete(topic);
        }
        
        this.currentPage = 1; // Reset to first page
        this.loadQuestions();
      });
    });

    // Clear filters
    const clearBtn = this.qs('[data-action="clear-filters"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.selectedDifficulties.clear();
        this.selectedTopics.clear();
        this.currentPage = 1;
        this.loadQuestions();
      });
    }

    // Toggle select all mode
    const selectAllCheckbox = this.qs('[data-action="toggle-select-all"]') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        this.selectAllMode = selectAllCheckbox.checked;
        
        if (this.selectAllMode) {
          // Select all visible questions
          this.preview?.questions.forEach(q => this.selectedQuestionIds.add(q.id));
        } else {
          // Clear selections when switching to manual mode
          this.selectedQuestionIds.clear();
        }
        
        this.render();
      });
    }

    // Toggle random order
    const randomCheckbox = this.qs('[data-action="toggle-random"]') as HTMLInputElement;
    if (randomCheckbox) {
      randomCheckbox.addEventListener('change', () => {
        this.randomOrder = randomCheckbox.checked;
      });
    }

    // Toggle automatic pace
    const automaticCheckbox = this.qs('[data-action="toggle-automatic"]') as HTMLInputElement;
    if (automaticCheckbox) {
      automaticCheckbox.addEventListener('change', () => {
        this.automaticPace = automaticCheckbox.checked;
      });
    }

    // Individual question checkboxes
    if (!this.selectAllMode) {
      this.qsa('.question-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const questionId = target.getAttribute('data-question-id');
          
          if (!questionId) return;
          
          if (target.checked) {
            this.selectedQuestionIds.add(questionId);
          } else {
            this.selectedQuestionIds.delete(questionId);
          }
          
          this.render();
        });
      });
    }

    // Pagination
    const prevBtn = this.qs('[data-action="prev-page"]');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentPage--;
        this.loadQuestions();
      });
    }

    const nextBtn = this.qs('[data-action="next-page"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentPage++;
        this.loadQuestions();
      });
    }

    // Create session button
    const createBtn = this.qs('[data-action="create"]');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.createSession();
      });
    }
  }

  private async createSession(): Promise<void> {
    if (!this.bank || !this.preview) return;

    const selectedCount = this.selectAllMode 
      ? this.preview.pagination.totalQuestions 
      : this.selectedQuestionIds.size;

    if (selectedCount === 0) {
      this.showError('Please select at least one question');
      return;
    }

    this.showLoading('Creating quiz session...');

    try {
      // Build questionIds array based on selection mode
      let questionIds: string[] | undefined;
      
      if (this.selectAllMode) {
        // Use all filtered questions
        questionIds = this.preview.questions.map(q => q.id);
      } else {
        // Use manually selected questions
        questionIds = Array.from(this.selectedQuestionIds);
      }

      // Create session with selected questions and options
      const session = await api.createSession(this.bankId, {
        questionIds,
        randomOrder: this.randomOrder,
        automaticPace: this.automaticPace,
      });

      // Store session info in state
      state.setState({
        sessionId: session.id,
        hostToken: session.hostToken,
        pin: session.pin,
        questionBankId: this.bankId,
      });

      console.log('✅ Session created with configuration:', {
        id: session.id,
        pin: session.pin,
        questionCount: selectedCount,
        randomOrder: this.randomOrder,
      });

      // Navigate to lobby
      router.navigate(`/lobby/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      handleApiError(error, 'Creating session');
      this.showError(`Failed to create session: ${getErrorMessage(error)}`);
    }
  }
}

// Register custom element
customElements.define('question-preview-screen', QuestionPreviewScreen);
