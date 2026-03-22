import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import { preferences } from '../preferences';
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
  private allBankQuestions: Question[] = []; // All questions for client-side topic counting
  private selectedQuestionIds = new Set<string>();
  private selectAllMode = true; // By default, select all questions
  private randomOrder = preferences.DEFAULTS.randomOrder;
  private shuffleAnswers = preferences.DEFAULTS.shuffleAnswers;
  private pace: 'normal' | 'calm' | 'manual' = preferences.DEFAULTS.pace;
  private autoQuestionTime = preferences.DEFAULTS.autoQuestionTime;
  private expandedQuestions = new Set<string>(); // Track which questions have expanded answers
  private maxQuestions: number | null = null; // Limit number of questions (null = no limit)
  
  // Filter state
  private selectedDifficulties = new Set<Difficulty>();
  private selectedTopics = new Set<string>();
  
  // Pagination state
  private currentPage = 1;
  private limit = 10;

  protected async onMount(): Promise<void> {
    // Restore user's last session-configuration choices
    const prefs = preferences.load();
    this.randomOrder = prefs.randomOrder;
    this.shuffleAnswers = prefs.shuffleAnswers;
    this.pace = prefs.pace;
    this.autoQuestionTime = prefs.autoQuestionTime;

    // Extract bankId from path: /preview/:bankId
    // bankId may be URL-encoded (e.g. "science%2Fphysics%2Felectromagnetism")
    // to preserve slashes in path-based IDs without confusing the hash router.
    const pathParts = window.location.hash.split('/');
    this.bankId = pathParts[2] ? decodeURIComponent(pathParts[2]) : '';

    if (!this.bankId) {
      router.navigate('/create');
      return;
    }

    await this.loadBank();
    await this.loadQuestions();
  }

  private async loadBank(): Promise<void> {
    try {
      const bankData = await api.getQuestionBankDetails(this.bankId);
      this.bank = {
        id: this.bankId,
        name: bankData.metadata.name,
        description: bankData.metadata.description,
        topics: bankData.metadata.topics,
        questionCount: bankData.questions.length,
      };

      // Store all questions for client-side topic/tag counting
      this.allBankQuestions = bankData.questions as Question[];
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
      const qParams: { page?: number; limit?: number; difficulty?: string; topic?: string } = {
        page: this.currentPage,
        limit: this.limit,
      };
      if (this.selectedDifficulties.size > 0) {
        qParams.difficulty = Array.from(this.selectedDifficulties).join(',');
      }
      if (this.selectedTopics.size > 0) {
        qParams.topic = Array.from(this.selectedTopics).join(',');
      }

      this.preview = await api.getQuestionBankQuestions(this.bankId, qParams) as QuestionPreviewResponse;
      
      // If selectAllMode, auto-select all questions in preview
      if (this.selectAllMode && this.preview) {
        this.preview.questions.forEach(q => this.selectedQuestionIds.add(q.id));
      }
      
      // Adjust maxQuestions if it exceeds available questions after filter change
      if (this.maxQuestions !== null && this.preview && this.maxQuestions > this.preview.pagination.totalQuestions) {
        this.maxQuestions = this.preview.pagination.totalQuestions;
      }

      this.render();
    } catch (error) {
      console.error('Failed to load questions:', error);
      handleApiError(error, 'Loading questions');
      this.showError(`Failed to load questions: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Compute topic counts from the actual questions in the bank.
   * Counts only questions NOT already selected, so the number shows
   * how many *new* questions would be added by enabling that topic filter.
   * Difficulty filters are respected so only difficulty-matching questions count.
   */
  private computeTopicCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const q of this.allBankQuestions) {
      // Respect active difficulty filter
      if (this.selectedDifficulties.size > 0 && !this.selectedDifficulties.has(q.difficulty)) {
        continue;
      }
      // In manual selection mode, skip already-selected questions
      // so the count reflects how many *new* questions a topic would add.
      // In selectAllMode all questions are logically selected, so show totals.
      if (!this.selectAllMode && this.selectedQuestionIds.has(q.id)) continue;

      for (const topic of q.topics) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    return counts;
  }

  protected render(): void {
    if (!this.bank || !this.preview) return;

    let selectedCount = this.selectAllMode 
      ? this.preview.pagination.totalQuestions 
      : this.selectedQuestionIds.size;
    
    // Apply max questions limit to display count
    if (this.maxQuestions !== null && selectedCount > this.maxQuestions) {
      selectedCount = this.maxQuestions;
    }

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
                    ${(() => {
                      const topicCounts = this.computeTopicCounts();
                      // Merge: all topics with a count + any currently-selected topics (count may be 0)
                      const allTopics = new Set([...topicCounts.keys(), ...this.selectedTopics]);
                      if (allTopics.size === 0) {
                        return '<span style="color: var(--color-text-muted);">No topics available</span>';
                      }
                      return Array.from(allTopics).sort().map(topic => {
                        const count = topicCounts.get(topic) ?? 0;
                        const isChecked = this.selectedTopics.has(topic);
                        return `
                          <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                            <input 
                              type="checkbox" 
                              data-filter="topic" 
                              value="${this.escapeHtml(topic)}"
                              ${isChecked ? 'checked' : ''}
                            />
                            <span style="${count === 0 && !isChecked ? 'color: var(--color-text-muted);' : ''}">${this.escapeHtml(topic)} <small>(${count})</small></span>
                          </label>
                        `;
                      }).join('');
                    })()}
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
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-md);">
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
                  <label style="display: flex; align-items: center; gap: var(--spacing-xs); margin-top: var(--spacing-sm);">
                    <input 
                      type="number" 
                      id="max-questions-input"
                      min="1"
                      max="${this.preview.pagination.totalQuestions}"
                      placeholder="∞"
                      value="${this.maxQuestions !== null ? this.maxQuestions : ''}"
                      ${!this.selectAllMode ? 'readonly' : ''}
                      style="width: 70px; padding: 6px; border: 1px solid var(--color-border); border-radius: var(--border-radius); background: var(--color-bg); color: var(--color-text); font-size: var(--font-size-small); text-align: center;"
                    />
                    <span>Limit questions</span>
                  </label>
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input 
                      type="checkbox" 
                      data-action="toggle-random"
                      ${this.randomOrder ? 'checked' : ''}
                    />
                    <span>Shuffle question order</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input 
                      type="checkbox" 
                      data-action="toggle-shuffle-answers"
                      ${this.shuffleAnswers ? 'checked' : ''}
                    />
                    <span>Shuffle answers</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input 
                      type="checkbox" 
                      data-action="toggle-auto-time"
                      ${this.autoQuestionTime ? 'checked' : ''}
                    />
                    <span>Automatic question time</span>
                  </label>
                </div>
              </div>

              <!-- Pace Selection (full-width row) -->
              <div style="border-top: 1px solid var(--color-border); padding-top: var(--spacing-md); margin-top: var(--spacing-xs);">
                <span style="font-weight: 600; font-size: var(--font-size-small); display: block; margin-bottom: var(--spacing-sm);">Pace</span>
                <div style="display: flex; gap: var(--spacing-lg); flex-wrap: wrap;">
                  ${(['normal', 'calm', 'manual'] as const).map(p => `
                    <label style="display: flex; align-items: center; gap: var(--spacing-xs); cursor: pointer;">
                      <input
                        type="radio"
                        name="pace"
                        value="${p}"
                        ${this.pace === p ? 'checked' : ''}
                      />
                      <span style="text-transform: capitalize; font-weight: ${this.pace === p ? '600' : '400'}">${p}</span>
                    </label>
                  `).join('')}
                </div>
                <p style="color: var(--color-text-muted); margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-small);">
                  ${ this.pace === 'normal' ? '⏱ Auto-advance to leaderboard when the timer runs out' :
                     this.pace === 'calm'   ? '⏸ Timer runs, but host clicks "Show Leaderboard" manually' :
                     '🔕 No timer — host advances to leaderboard whenever ready' }
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-alt); border-radius: var(--border-radius); margin-bottom: var(--spacing-lg);">
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
          </div>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private renderQuestion(question: Question, index: number): string {
    const isSelected = this.selectAllMode || this.selectedQuestionIds.has(question.id);
    const displayIndex = (this.currentPage - 1) * this.limit + index + 1;
    const isExpanded = this.expandedQuestions.has(question.id);

    return `
      <div class="question-preview-card ${isSelected ? 'selected' : ''}" data-question-id="${question.id}" style="padding: 10px;">
        <div style="display: flex; gap: 10px;">
          ${!this.selectAllMode ? `
            <input 
              type="checkbox" 
              class="question-checkbox"
              data-question-id="${question.id}"
              ${isSelected ? 'checked' : ''}
            />
          ` : ''}
          
          <div style="flex: 1;">
            <!-- Question header with toggle -->
            <div 
              style="display: flex; align-items: start; gap: 6px; cursor: pointer; margin-bottom: 6px;"
              data-action="toggle-answers"
              data-question-id="${question.id}"
            >
              <span style="font-size: 14px; color: var(--color-text-muted); user-select: none; flex-shrink: 0; margin-top: 2px;">
                ${isExpanded ? '▼' : '▶'}
              </span>
              <h4 style="margin: 0; font-size: 16px; font-weight: 500;">
                ${displayIndex}. ${this.escapeHtml(question.text)}
              </h4>
            </div>

            <!-- Badges -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; margin-left: 20px;">
              <span class="badge badge-${question.difficulty}" style="font-size: 12px;">${question.difficulty}</span>
              ${question.topics.length > 0 ? question.topics.map(topic => `
                <span class="badge" style="background: var(--color-bg); color: var(--color-text-muted); font-size: 12px;">
                  ${this.escapeHtml(topic)}
                </span>
              `).join('') : ''}
              ${question.timeLimit ? `<span class="badge" style="font-size: 12px;">⏱️ ${question.timeLimit}s</span>` : ''}
            </div>

            <!-- Collapsible Answers -->
            <div 
              class="question-answers" 
              style="display: ${isExpanded ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-left: 20px;"
            >
              ${question.answers.map(answer => {
                const isCorrect = question.correctAnswerIds.includes(answer.id);
                return `
                  <div style="padding: 8px; background: var(--color-bg-alt); border-radius: var(--border-radius); border-left: 3px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-border)'}; font-size: 14px;">
                    ${isCorrect ? '✓ ' : ''}${this.escapeHtml(answer.text)}
                  </div>
                `;
              }).join('')}
            </div>
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
          // Reset maxQuestions when switching to manual mode with no selections
          this.maxQuestions = null;
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

    // Toggle shuffle answers
    const shuffleAnswersCheckbox = this.qs('[data-action="toggle-shuffle-answers"]') as HTMLInputElement;
    if (shuffleAnswersCheckbox) {
      shuffleAnswersCheckbox.addEventListener('change', () => {
        this.shuffleAnswers = shuffleAnswersCheckbox.checked;
      });
    }

    // Pace radio buttons
    this.qsa('input[name="pace"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          this.pace = target.value as 'normal' | 'calm' | 'manual';
          this.render(); // Re-render to update description text
        }
      });
    });

    // Toggle automatic question time
    const autoTimeCheckbox = this.qs('[data-action="toggle-auto-time"]') as HTMLInputElement;
    if (autoTimeCheckbox) {
      autoTimeCheckbox.addEventListener('change', () => {
        this.autoQuestionTime = autoTimeCheckbox.checked;
      });
    }

    // Max questions input
    const maxQuestionsInput = this.qs('#max-questions-input') as HTMLInputElement;
    if (maxQuestionsInput) {
      maxQuestionsInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value.trim();
        const maxAvailable = this.preview?.pagination.totalQuestions || 999;
        this.maxQuestions = value === '' ? null : Math.min(maxAvailable, Math.max(1, parseInt(value, 10) || 1));
        
        // Update button text dynamically
        const createBtn = this.qs('[data-action="create"]');
        if (createBtn && this.preview) {
          let count = this.selectAllMode 
            ? this.preview.pagination.totalQuestions 
            : this.selectedQuestionIds.size;
          if (this.maxQuestions !== null && count > this.maxQuestions) {
            count = this.maxQuestions;
          }
          createBtn.textContent = `Create Quiz with ${count} Question${count === 1 ? '' : 's'}`;
        }
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
          
          // Auto-update maxQuestions to match selected count in manual mode
          this.maxQuestions = this.selectedQuestionIds.size > 0 ? this.selectedQuestionIds.size : null;
          
          this.render();
        });
      });
    }

    // Toggle answer visibility
    this.qsa('[data-action="toggle-answers"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const questionId = target.getAttribute('data-question-id');
        
        if (!questionId) return;
        
        if (this.expandedQuestions.has(questionId)) {
          this.expandedQuestions.delete(questionId);
        } else {
          this.expandedQuestions.add(questionId);
        }
        
        this.render();
      });
    });

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

    let selectedCount = this.selectAllMode 
      ? this.preview.pagination.totalQuestions 
      : this.selectedQuestionIds.size;
    
    // Apply max questions limit
    if (this.maxQuestions !== null && selectedCount > this.maxQuestions) {
      selectedCount = this.maxQuestions;
    }

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
      
      // Apply max questions limit if set - randomize first to get a random subset
      if (this.maxQuestions !== null && questionIds && questionIds.length > this.maxQuestions) {
        // Shuffle array using Fisher-Yates algorithm
        const shuffled = [...questionIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i]!;
          shuffled[i] = shuffled[j]!;
          shuffled[j] = temp;
        }
        questionIds = shuffled.slice(0, this.maxQuestions);
      }

      // Persist the user's choices for next time
      preferences.save({
        randomOrder: this.randomOrder,
        shuffleAnswers: this.shuffleAnswers,
        pace: this.pace,
        autoQuestionTime: this.autoQuestionTime,
      });

      // Create session with selected questions and options
      const session = await api.createSession(this.bankId, {
        questionIds,
        randomOrder: this.randomOrder,
        shuffleAnswers: this.shuffleAnswers,
        pace: this.pace,
        autoQuestionTime: this.autoQuestionTime,
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
