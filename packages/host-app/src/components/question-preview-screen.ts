import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import { state } from '../state';
import { preferences } from '../preferences';
import { handleApiError, getErrorMessage } from '../error-handler';
import type { Question, Difficulty } from '@quizzquizz/common';
import {
  getOrBuildProgress,
  saveProgress,
  nextIncompleteSetIndex,
  resetProgress,
  setActiveSession,
} from '../flashcard-sets';
import type { BankProgress } from '../flashcard-sets';

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

interface TopicNode {
  label: string;
  path: string;
  questionIds: Set<string>;
  children: Map<string, TopicNode>;
}

/**
 * Question Preview & Configuration Screen
 * Allows host to preview questions, apply filters, and configure session options
 */
const LS_FLAGGED_QUESTIONS = 'qz-flagged-questions';

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
  private expandedTopicNodes = new Set<string>();
  private topicsExpanded = false;
  private hideFlagged = false;
  private flaggedQuestionIds = new Set<string>();

  // Auth: track if current user can edit this bank
  private canEditBank = false;
  
  // Pagination state
  private currentPage = 1;
  private limit = 10;

  // Flashcard set picker state
  private showingSetPicker = false;
  private bankProgress: BankProgress | null = null;
  private selectedSetIndex = 0;

  protected async onMount(): Promise<void> {
    // Restore user's last session-configuration choices
    const prefs = preferences.load();
    this.randomOrder = prefs.randomOrder;
    this.shuffleAnswers = prefs.shuffleAnswers;
    this.pace = prefs.pace;
    this.autoQuestionTime = prefs.autoQuestionTime;

    this.loadFlaggedQuestions();

    // Extract bankId from path: /preview/:bankId
    const pathParts = window.location.hash.split('/');
    this.bankId = pathParts[2] ? decodeURIComponent(pathParts[2]) : '';

    if (!this.bankId) {
      router.navigate('/create');
      return;
    }

    // Register delegated event handlers once — morphdom reuses DOM nodes so
    // re-attaching per-render listeners would stack duplicates on the same nodes.
    this.setupDelegatedEvents();

    // Check auth (non-blocking — determines if "Edit bank" button is shown)
    void this.checkCanEdit();

    await this.loadBank();
    await this.loadQuestions();
  }

  private async checkCanEdit(): Promise<void> {
    try {
      const session = await api.getAuthSession();
      const user = session?.user;
      if (user) {
        this.canEditBank =
          this.bankId.startsWith(`user-quizzes/${user.id}/`) ||
          (user.isAdmin === true);
      } else {
        this.canEditBank = false;
      }
    } catch {
      this.canEditBank = false;
    }
    if (this.bank && this.preview) this.render();
  }

  private loadFlaggedQuestions(): void {
    try {
      const raw = localStorage.getItem(LS_FLAGGED_QUESTIONS);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, unknown>;
        this.flaggedQuestionIds = new Set(Object.keys(obj));
      }
    } catch { /* ignore */ }
  }

  /** Set up a single delegated click/change/input handler on the host element. */
  private setupDelegatedEvents(): void {
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Backdrop: close only when the translucent overlay itself is clicked
      if (target.dataset['action'] === 'close-set-picker-backdrop') {
        this.showingSetPicker = false;
        this.render();
        return;
      }

      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset['action'];

      switch (action) {
        case 'back':
          router.navigate('/create');
          break;
        case 'toggle-topics-panel': {
          this.topicsExpanded = !this.topicsExpanded;
          const panel = this.qs('[data-topics-panel]');
          const arrow = this.qs('[data-topics-arrow]');
          if (panel) panel.toggleAttribute('hidden', !this.topicsExpanded);
          if (arrow) arrow.textContent = this.topicsExpanded ? '▼' : '▶';
          (actionEl as HTMLElement).style.marginBottom = this.topicsExpanded ? 'var(--spacing-sm)' : '0';
          break;
        }
        case 'toggle-tree-node': {
          e.preventDefault();
          e.stopPropagation();
          const nodePath = actionEl.dataset['nodePath'] ?? '';
          const childrenId = actionEl.dataset['childrenId'] ?? '';
          const isNowExpanded = !this.expandedTopicNodes.has(nodePath);
          if (isNowExpanded) this.expandedTopicNodes.add(nodePath);
          else this.expandedTopicNodes.delete(nodePath);
          const children = childrenId ? document.getElementById(childrenId) : null;
          const arrow = actionEl.querySelector('[data-tree-arrow]');
          if (children) children.toggleAttribute('hidden', !isNowExpanded);
          if (arrow) arrow.textContent = isNowExpanded ? '▼' : '▶';
          break;
        }
        case 'clear-filters':
          this.selectedDifficulties.clear();
          this.selectedTopics.clear();
          this.hideFlagged = false;
          this.currentPage = 1;
          void this.loadQuestions();
          break;
        case 'toggle-answers': {
          const questionId = actionEl.dataset['questionId'];
          if (questionId) {
            if (this.expandedQuestions.has(questionId)) this.expandedQuestions.delete(questionId);
            else this.expandedQuestions.add(questionId);
            this.render();
          }
          break;
        }
        case 'prev-page':
          this.currentPage--;
          void this.loadQuestions();
          break;
        case 'next-page':
          this.currentPage++;
          void this.loadQuestions();
          break;
        case 'download':
          void this.downloadFilteredBank();
          break;
        case 'create-flashcard':
          void this.openSetPicker();
          break;
        case 'select-set':
          this.selectedSetIndex = parseInt(actionEl.dataset['setIndex'] ?? '0', 10);
          this.render();
          break;
        case 'cancel-set-picker':
          this.showingSetPicker = false;
          this.render();
          break;
        case 'reset-progress':
          if (this.bankId) {
            resetProgress(this.bankId);
            this.bankProgress = getOrBuildProgress(this.bankId, this.allBankQuestions.map((q) => q.id));
            this.selectedSetIndex = 0;
            saveProgress(this.bankId, this.bankProgress);
            this.render();
          }
          break;
        case 'launch-set':
          void this.launchWithSelectedSet();
          break;
        case 'create':
          this.createSession();
          break;
      }
    });

    this.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;

      if (target.dataset['filter'] === 'difficulty') {
        const difficulty = target.value as Difficulty;
        if (target.checked) this.selectedDifficulties.add(difficulty);
        else this.selectedDifficulties.delete(difficulty);
        this.currentPage = 1;
        void this.loadQuestions();
        return;
      }

      if (target.dataset['action'] === 'toggle-hide-flagged') {
        this.hideFlagged = target.checked;
        this.render();
        return;
      }

      if (target.dataset['filter'] === 'topic-node') {
        const nodePath = target.dataset['nodePath'] ?? '';
        target.indeterminate = false;
        const tree = this.buildTopicTree();
        const node = this.findTreeNode(tree, nodePath);
        if (!node) return;
        const leaves = this.getLeafTopics(node);
        if (target.checked) leaves.forEach(t => this.selectedTopics.add(t));
        else leaves.forEach(t => this.selectedTopics.delete(t));
        this.currentPage = 1;
        void this.loadQuestions();
        return;
      }

      if (target.name === 'pace' && target.checked) {
        this.pace = target.value as 'normal' | 'calm' | 'manual';
        this.render();
        return;
      }

      if (target.classList.contains('question-checkbox') && !this.selectAllMode) {
        const questionId = target.dataset['questionId'];
        if (!questionId) return;
        if (target.checked) this.selectedQuestionIds.add(questionId);
        else this.selectedQuestionIds.delete(questionId);
        this.maxQuestions = this.selectedQuestionIds.size > 0 ? this.selectedQuestionIds.size : null;
        this.render();
        return;
      }

      const actionEl = target.closest<HTMLElement>('[data-action]');
      const action = actionEl?.dataset['action'];
      switch (action) {
        case 'toggle-select-all':
          this.selectAllMode = target.checked;
          if (this.selectAllMode) {
            this.preview?.questions.forEach(q => this.selectedQuestionIds.add(q.id));
          } else {
            this.selectedQuestionIds.clear();
            this.maxQuestions = null;
          }
          this.render();
          break;
        case 'toggle-random':
          this.randomOrder = target.checked;
          break;
        case 'toggle-shuffle-answers':
          this.shuffleAnswers = target.checked;
          break;
        case 'toggle-auto-time':
          this.autoQuestionTime = target.checked;
          break;
      }
    });

    this.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id !== 'max-questions-input') return;
      const value = target.value.trim();
      const maxAvailable = this.preview?.pagination.totalQuestions || 999;
      this.maxQuestions = value === '' ? null : Math.min(maxAvailable, Math.max(1, parseInt(value, 10) || 1));
      const rawCount = this.selectAllMode
        ? (this.preview?.pagination.totalQuestions ?? 0)
        : this.selectedQuestionIds.size;
      const effective = this.maxQuestions !== null && rawCount > this.maxQuestions ? this.maxQuestions : rawCount;
      const createBtn = this.qs('[data-action="create"]');
      if (createBtn) createBtn.textContent = `Create Quiz with ${effective} Question${effective === 1 ? '' : 's'}`;
    });
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

    // Only show full loading screen on initial load (no existing content)
    if (!this.preview) {
      this.showLoading('Loading questions...');
    }

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
   * Build a topic tree from the difficulty-filtered bank questions.
   * Topics use colon-separated hierarchy (e.g. "architecture:ha:multi-az-design").
   * Each node tracks the set of unique question IDs at or below it.
   * Selected topics that have 0 matching questions (due to the difficulty filter)
   * are still inserted into the tree so they remain visible and checked.
   */
  private buildTopicTree(): Map<string, TopicNode> {
    const filtered = this.allBankQuestions.filter(
      q => this.selectedDifficulties.size === 0 || this.selectedDifficulties.has(q.difficulty),
    );

    const root = new Map<string, TopicNode>();

    const insertPath = (topicPath: string, questionId?: string) => {
      const parts = topicPath.split(':');
      let current = root;
      let pathSoFar = '';
      for (const part of parts) {
        pathSoFar = pathSoFar ? `${pathSoFar}:${part}` : part;
        if (!current.has(part)) {
          current.set(part, { label: part, path: pathSoFar, questionIds: new Set(), children: new Map() });
        }
        const node = current.get(part)!;
        if (questionId) node.questionIds.add(questionId);
        current = node.children;
      }
    };

    for (const q of filtered) {
      for (const topic of q.topics) {
        insertPath(topic, q.id);
      }
    }

    // Keep selected topics visible even when the difficulty filter gives them 0 questions
    for (const topic of this.selectedTopics) {
      insertPath(topic);
    }

    return root;
  }

  /** Collect all leaf topic paths under a node. */
  private getLeafTopics(node: TopicNode): string[] {
    if (node.children.size === 0) return [node.path];
    return Array.from(node.children.values()).flatMap(child => this.getLeafTopics(child));
  }

  /** Walk the tree and return the node at the given colon-separated path, or null. */
  private findTreeNode(root: Map<string, TopicNode>, path: string): TopicNode | null {
    const parts = path.split(':');
    let current = root;
    let found: TopicNode | null = null;
    for (const part of parts) {
      found = current.get(part) ?? null;
      if (!found) return null;
      current = found.children;
    }
    return found;
  }

  /** Render the full topic tree (entry point called from render()). */
  private renderTopicTree(): string {
    const tree = this.buildTopicTree();
    if (tree.size === 0) {
      return '<span style="color: var(--color-text-muted);">No topics available</span>';
    }
    return this.renderTopicTreeNodes(tree, 0);
  }

  /** Recursively render tree nodes with indentation. All levels are always in the DOM; visibility is toggled via the `hidden` attribute. */
  private renderTopicTreeNodes(nodes: Map<string, TopicNode>, depth: number): string {
    const indent = depth * 14;
    return Array.from(nodes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, node]) => {
        const hasChildren = node.children.size > 0;
        const isExpanded = this.expandedTopicNodes.has(node.path);
        const leafTopics = this.getLeafTopics(node);
        const selectedLeaves = leafTopics.filter(t => this.selectedTopics.has(t));
        const allSelected = selectedLeaves.length > 0 && selectedLeaves.length === leafTopics.length;
        const someSelected = selectedLeaves.length > 0 && !allSelected;
        const count = node.questionIds.size;
        const label = node.label.replace(/-/g, ' ');

        // Safe ID: replace characters that are invalid in HTML id attributes
        const safeId = `tnc-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`;

        return `
          <div data-tree-node style="line-height: 1;">
            <div style="display: flex; align-items: center; gap: 2px; padding-left: ${indent + 2}px; height: 24px; overflow: hidden;">
              <button
                data-action="toggle-tree-node"
                data-node-path="${this.escapeHtml(node.path)}"
                data-children-id="${hasChildren ? safeId : ''}"
                style="
                  background: none; border: none; flex-shrink: 0;
                  width: 16px; height: 16px; padding: 0; overflow: hidden;
                  display: flex; align-items: center; justify-content: center;
                  color: var(--color-text-muted); font-size: 11px; line-height: 1;
                  cursor: ${hasChildren ? 'pointer' : 'default'};
                "
                ${!hasChildren ? 'disabled' : ''}
              >${hasChildren ? `<span data-tree-arrow style="line-height: 1; display: block;">${isExpanded ? '▼' : '▶'}</span>` : ''}</button>
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; flex: 1; min-width: 0; user-select: none;">
                <input
                  type="checkbox"
                  data-filter="topic-node"
                  data-node-path="${this.escapeHtml(node.path)}"
                  ${allSelected ? 'checked' : ''}
                  data-indeterminate="${someSelected}"
                  style="flex-shrink: 0; width: 11px; height: 11px; margin: 0;"
                />
                <span style="
                  font-size: var(--font-size-base); text-transform: capitalize;
                  font-weight: ${depth === 0 ? '600' : '400'};
                  ${count === 0 ? 'color: var(--color-text-muted);' : ''}
                ">${this.escapeHtml(label)}</span>
                <small style="color: var(--color-text-muted); flex-shrink: 0; font-size: var(--font-size-sm);">(${count})</small>
              </label>
            </div>
            ${hasChildren ? `<div id="${safeId}" data-tree-children="${this.escapeHtml(node.path)}" ${!isExpanded ? 'hidden' : ''}>${this.renderTopicTreeNodes(node.children, depth + 1)}</div>` : ''}
          </div>
        `;
      }).join('');
  }

  /**
   * Count questions per difficulty level, respecting no filters (shows raw totals).
   */
  private computeDifficultyCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const q of this.allBankQuestions) {
      counts.set(q.difficulty, (counts.get(q.difficulty) ?? 0) + 1);
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

    this.patchContent(`
      <div class="screen">
        <div class="container" style="max-width: 1200px;">
          <div class="card">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
              <div style="flex: 1; margin-right: var(--spacing-lg);">
                <h1>${this.escapeHtml(this.bank.name)}</h1>
                <p style="color: var(--color-text-muted); margin: 0;">
                  ${this.escapeHtml(this.bank.description || '')}
                </p>
              </div>
              <div style="display: flex; gap: var(--spacing-sm); flex-shrink: 0;">
                <button class="btn-secondary btn-icon-top" data-action="back">
                  <span class="btn-icon">←</span>
                  <span>Back</span>
                </button>
                ${this.canEditBank ? `
                <a href="#/edit/${encodeURIComponent(this.bankId)}" class="btn-secondary btn-icon-top" style="text-decoration: none;">
                  <span class="btn-icon">✏️</span>
                  <span>Edit</span>
                </a>` : ''}
              </div>
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
                    ${(() => {
                      const diffCounts = this.computeDifficultyCounts();
                      return ['easy', 'medium', 'hard'].map(diff => {
                        const count = diffCounts.get(diff) ?? 0;
                        return `
                          <label style="display: flex; align-items: center; gap: var(--spacing-xs);">
                            <input 
                              type="checkbox" 
                              data-filter="difficulty" 
                              value="${diff}"
                              ${this.selectedDifficulties.has(diff as Difficulty) ? 'checked' : ''}
                            />
                            <span style="text-transform: capitalize;">${diff} <small>(${count})</small></span>
                          </label>
                        `;
                      }).join('');
                    })()}
                  </div>
                </div>

                <!-- Topic Filter -->
                <div>
                  <button
                    data-action="toggle-topics-panel"
                    style="
                      display: flex; align-items: center; gap: 6px; width: 100%;
                      background: none; border: none; cursor: pointer; padding: 2px 4px;
                      font-weight: 600; font-size: var(--font-size-base);
                      color: var(--color-text); text-align: left;
                      margin-bottom: ${this.topicsExpanded ? 'var(--spacing-sm)' : '0'};
                    "
                  >
                    <span data-topics-arrow>${this.topicsExpanded ? '▼' : '▶'}</span>
                    Topics
                    ${this.selectedTopics.size > 0 ? `<span style="font-size: 11px; font-weight: 400; color: var(--color-text-muted);">(${this.selectedTopics.size} selected)</span>` : ''}
                  </button>
                  <div data-topics-panel ${!this.topicsExpanded ? 'hidden' : ''} style="max-height: 220px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: 6px 8px; background: var(--color-bg);">
                    ${this.renderTopicTree()}
                  </div>
                </div>
              </div>

              <!-- Clear Filters Button -->
              ${(this.selectedDifficulties.size > 0 || this.selectedTopics.size > 0 || this.hideFlagged) ? `
                <button class="btn-secondary" data-action="clear-filters" style="margin-top: var(--spacing-md);">
                  Clear Filters
                </button>
              ` : ''}

              <!-- Hide Flagged Toggle -->
              ${this.flaggedQuestionIds.size > 0 ? `
                <label style="display: flex; align-items: center; gap: var(--spacing-xs); margin-top: var(--spacing-md); cursor: pointer; font-size: var(--font-size-sm);">
                  <input type="checkbox" data-action="toggle-hide-flagged" ${this.hideFlagged ? 'checked' : ''} />
                  <span>🚩 Hide flagged questions <small style="color: var(--color-text-muted);">(${this.flaggedQuestionIds.size} flagged)</small></span>
                </label>
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
            <div style="display: flex; justify-content: center; gap: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-alt); border-radius: var(--border-radius); margin-bottom: var(--spacing-lg);">
              <button
                class="btn-secondary"
                data-action="download"
                ${this.preview.pagination.totalQuestions === 0 ? 'disabled' : ''}
                title="Download the filtered questions as a Markdown question bank"
              >
                Download
              </button>
              <button 
                class="btn-secondary" 
                data-action="create-flashcard"
                ${this.preview.pagination.totalQuestions === 0 ? 'disabled' : ''}
                title="Launch a self-paced flashcard session with these questions"
              >
                Launch Flashcards
              </button>
              <button 
                class="btn-primary" 
                data-action="create"
                ${this.preview.pagination.totalQuestions === 0 ? 'disabled' : ''}
                style="padding-left: var(--spacing-xl); padding-right: var(--spacing-xl); padding-top: var(--spacing-md); padding-bottom: var(--spacing-md); font-size: var(--font-size-xlarge); font-weight: 700;"
              >
                Create Quiz (${selectedCount})
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
                  ${this.preview.questions
                    .filter(q => !this.hideFlagged || !this.flaggedQuestionIds.has(q.id))
                    .map((q, index) => this.renderQuestion(q, index)).join('')}
                </div>

                <!-- Pagination -->
                ${this.renderPagination()}
              `}
            </div>
          </div>
        </div>
      </div>
      ${this.renderSetPickerModal()}
    `);
  }

  private renderQuestion(question: Question, index: number): string {
    const isSelected = this.selectAllMode || this.selectedQuestionIds.has(question.id);
    const displayIndex = (this.currentPage - 1) * this.limit + index + 1;
    const isExpanded = this.expandedQuestions.has(question.id);
    const isFlagged = this.flaggedQuestionIds.has(question.id);

    return `
      <div class="question-preview-card ${isSelected ? 'selected' : ''}" data-question-id="${question.id}" style="padding: 10px; ${isFlagged ? 'border-left: 3px solid #f59e0b;' : ''}">
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
              <h4 style="margin: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${displayIndex}. ${this.escapeHtml(question.text)}
                ${isFlagged ? '<span title="This question has been flagged" style="font-size: 14px; font-weight: 400;">🚩</span>' : ''}
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

  private renderSetPickerModal(): string {
    if (!this.showingSetPicker || !this.bankProgress) return '';

    const progress = this.bankProgress;
    const totalSets = progress.sets.length;

    const setRows = progress.sets.map((set, i) => {
      const isSelected = i === this.selectedSetIndex;
      const isDone = set.completedAt !== null;
      const doneDate = isDone
        ? new Date(set.completedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;
      const bc = set.boxCounts;
      const hasStarted = !isDone && bc != null;

      let badgeBg: string;
      let badgeColor: string;
      let badgeText: string;

      if (isDone) {
        badgeBg = 'color-mix(in srgb, var(--color-success) 20%, transparent)';
        badgeColor = 'var(--color-success)';
        badgeText = `Done ${doneDate}`;
      } else if (hasStarted && bc) {
        badgeBg = 'color-mix(in srgb, var(--color-primary) 15%, transparent)';
        badgeColor = 'var(--color-primary)';
        const lowestActiveBox =
          bc.box1 > 0 ? '📦 Learning' :
          bc.box2 > 0 ? '🔄 Reviewing' :
          bc.box3 > 0 ? '⭐ Mastering' :
          '✅ Almost done';
        badgeText = `${lowestActiveBox} · ${bc.graduated}/${bc.total} ✅`;
      } else {
        badgeBg = 'var(--color-bg-alt)';
        badgeColor = 'var(--color-text-muted)';
        badgeText = 'Not started';
      }

      const boxDetail = hasStarted && bc
        ? `<div style="font-size: var(--font-size-xs, 0.7rem); color: var(--color-text-muted); margin-top: 2px; white-space: nowrap;">` +
          `📦 ${bc.box1}&nbsp;&nbsp;🔄 ${bc.box2}&nbsp;&nbsp;⭐ ${bc.box3}&nbsp;&nbsp;✅ ${bc.graduated}` +
          `</div>`
        : '';

      return `
        <button
          data-action="select-set"
          data-set-index="${i}"
          style="
            display: flex; justify-content: space-between; align-items: center;
            width: 100%; padding: var(--spacing-sm) var(--spacing-md);
            border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'};
            border-radius: var(--border-radius);
            background: ${isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-bg))' : 'var(--color-bg)'};
            color: var(--color-text); cursor: pointer; text-align: left;
            font-size: var(--font-size-base);
          "
        >
          <div>
            <span style="font-weight: ${isSelected ? '600' : '400'};">
              Set ${i + 1}
              <span style="color: var(--color-text-muted); font-weight: 400; font-size: var(--font-size-sm);">
                &nbsp;(${set.ids.length} card${set.ids.length === 1 ? '' : 's'})
              </span>
            </span>
            ${boxDetail}
          </div>
          <span style="
            font-size: var(--font-size-sm); padding: 2px 8px; border-radius: 9999px;
            background: ${badgeBg};
            color: ${badgeColor};
            font-weight: 500; white-space: nowrap; flex-shrink: 0; margin-left: var(--spacing-sm);
          ">
            ${badgeText}
          </span>
        </button>
      `;
    }).join('');

    const allDone = progress.sets.every((s) => s.completedAt !== null);

    return `
      <div
        data-action="close-set-picker-backdrop"
        style="
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: var(--spacing-md);
        "
      >
        <div
          style="
            background: var(--color-bg); border-radius: var(--border-radius);
            padding: var(--spacing-lg); max-width: 900px; width: 100%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          "
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
            <div>
              <h2 style="margin: 0 0 var(--spacing-xs);">Select Study Set</h2>
              <p style="color: var(--color-text-muted); margin: 0; font-size: var(--font-size-sm);">
                ${totalSets} set${totalSets === 1 ? '' : 's'} of up to ${progress.setSize} cards each
                ${allDone ? ' — all sets completed!' : ''}
              </p>
            </div>
            <button data-action="cancel-set-picker" style="
              background: none; border: none; cursor: pointer; font-size: 1.25rem;
              color: var(--color-text-muted); padding: 4px;
            " aria-label="Close">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); max-height: 300px; overflow-y: auto;">
            ${setRows}
          </div>

          <div style="
            display: flex;
            gap: var(--spacing-sm);
            flex-wrap: wrap;
          ">
            <button data-action="reset-progress" class="btn-secondary" style="
              flex: 1 1 140px;
              padding: var(--spacing-xs) var(--spacing-md);
              font-size: var(--font-size-sm);
              min-width: 0;
            ">Reset Progress</button>
            <button data-action="cancel-set-picker" class="btn-secondary" style="
              flex: 1 1 100px;
              padding: var(--spacing-xs) var(--spacing-md);
              font-size: var(--font-size-sm);
              min-width: 0;
            ">Cancel</button>
            <button data-action="launch-set" class="btn-primary" style="
              flex: 1 1 140px;
              padding: var(--spacing-xs) var(--spacing-md);
              font-size: var(--font-size-sm);
              min-width: 0;
            ">Launch Set ${this.selectedSetIndex + 1}</button>
          </div>
        </div>
      </div>
    `;
  }


  private async downloadFilteredBank(): Promise<void> {
    if (!this.bank || !this.preview) return;

    const btn = this.qs<HTMLButtonElement>('[data-action="download"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Preparing...'; }

    try {
      // Fetch all filtered questions in a single request
      const total = this.preview.pagination.totalQuestions;
      const qParams: { page?: number; limit?: number; difficulty?: string; topic?: string } = {
        page: 1,
        limit: total > 0 ? total : 9999,
      };
      if (this.selectedDifficulties.size > 0) {
        qParams.difficulty = Array.from(this.selectedDifficulties).join(',');
      }
      if (this.selectedTopics.size > 0) {
        qParams.topic = Array.from(this.selectedTopics).join(',');
      }

      const allData = await api.getQuestionBankQuestions(this.bankId, qParams) as QuestionPreviewResponse;
      const markdown = this.generateMarkdown(allData.questions);

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = this.bank.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      a.href = url;
      a.download = `${slug}-filtered.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download filtered bank:', error);
      handleApiError(error, 'Downloading question bank');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Download'; }
    }
  }

  private generateMarkdown(questions: Question[]): string {
    const bankName = this.bank!.name;
    const allTopics = [...new Set(questions.flatMap(q => q.topics))].sort();
    const topicsLine = allTopics.length > 0 ? allTopics.join(', ') : 'General';

    const lines: string[] = [
      `# Question Bank: ${bankName}`,
      '',
      '## Metadata',
      `- **Topics**: ${topicsLine}`,
    ];
    if (this.bank!.description) {
      lines.push(`- **Description**: ${this.bank!.description}`);
    }
    lines.push('', '---', '', '## Questions', '');

    for (const q of questions) {
      lines.push(`### ${q.id}`);
      lines.push(`**Difficulty**: ${q.difficulty}`);
      if (q.topics.length > 0) lines.push(`**Topics**: ${q.topics.join(', ')}`);
      if (q.tags.length > 0) lines.push(`**Tags**: ${q.tags.join(', ')}`);
      if (q.timeLimit) lines.push(`**Time Limit**: ${q.timeLimit}s`);
      lines.push('');
      lines.push(q.text);
      lines.push('');
      for (const answer of q.answers) {
        const correct = q.correctAnswerIds.includes(answer.id);
        lines.push(`- [${correct ? 'x' : ' '}] ${answer.text}`);
      }
      lines.push('', '---', '');
    }

    return lines.join('\n');
  }

  /** Open the set picker modal, building/loading progress from localStorage. */
  private openSetPicker(): void {
    if (!this.bank || this.allBankQuestions.length === 0) return;

    const allIds = this.allBankQuestions.map((q) => q.id);
    this.bankProgress = getOrBuildProgress(this.bankId, allIds);
    saveProgress(this.bankId, this.bankProgress);
    this.selectedSetIndex = nextIncompleteSetIndex(this.bankProgress);
    this.showingSetPicker = true;
    this.render();
  }

  /** Create a flashcard session using the set the user selected in the picker. */
  private async launchWithSelectedSet(): Promise<void> {
    if (!this.bank || !this.bankProgress) return;

    const selectedSet = this.bankProgress.sets[this.selectedSetIndex];
    if (!selectedSet || selectedSet.ids.length === 0) {
      this.showError('Selected set has no questions');
      return;
    }

    this.showingSetPicker = false;
    this.showLoading('Creating flashcard session...');

    try {
      const session = await api.createSession(this.bankId, {
        mode: 'flashcard',
        questionIds: selectedSet.ids,
        randomOrder: this.randomOrder,
        shuffleAnswers: this.shuffleAnswers,
      });

      // Store active session so flashcard-app can mark this set complete on finish
      setActiveSession({ bankId: this.bankId, setIndex: this.selectedSetIndex });

      state.setState({
        sessionId: session.id,
        hostToken: session.hostToken,
        pin: session.pin,
        questionBankId: this.bankId,
      });

      router.navigate(`/flashcard-lobby/${session.id}`);
    } catch (error) {
      console.error('Failed to create flashcard session:', error);
      handleApiError(error, 'Creating flashcard session');
      this.showError(`Failed to create flashcard session: ${getErrorMessage(error)}`);
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
