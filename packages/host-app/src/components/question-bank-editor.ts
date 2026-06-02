import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import type { QuestionForEdit } from '../api-client';

type EditMode = 'form' | 'markdown';

interface EditState {
  question: QuestionForEdit;
  text: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string;
  tags: string;
  timeLimit: string;
  markdownText: string;
  mode: EditMode;
  flagText: string;
  saving: boolean;
  error: string | null;
  success: string | null;
}

/**
 * <qz-question-bank-editor>
 *
 * Inline question bank editor reached via #/edit/:bankId.
 * Lists all questions and lets the owner or admin edit, change status, and
 * manage flags directly — no modal, editing expands inline within each card.
 */
export class QuestionBankEditor extends BaseComponent {
  private bankId = '';
  private bankName = '';
  private questions: QuestionForEdit[] = [];
  private loading = true;
  private pageError: string | null = null;

  private editingQid: string | null = null;
  private editState: EditState | null = null;

  protected async onMount(): Promise<void> {
    const hash = window.location.hash;
    const editPrefix = '#/edit/';
    if (hash.startsWith(editPrefix)) {
      this.bankId = decodeURIComponent(hash.slice(editPrefix.length));
    }
    if (!this.bankId) {
      router.navigate('/create');
      return;
    }
    this.setupDelegatedEvents();
    await this.loadQuestions();
  }

  protected onUnmount(): void {}

  private setupDelegatedEvents(): void {
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset['action'];
      const qid = actionEl.dataset['qid'] ?? '';

      switch (action) {
        case 'back':
          router.navigate(`/preview/${encodeURIComponent(this.bankId)}`);
          break;
        case 'edit-question':
          if (this.editingQid !== qid) this.openInlineEdit(qid);
          break;
        case 'cancel-edit':
          this.closeInlineEdit();
          break;
        case 'set-active':
          void this.changeStatus(qid, 'active');
          break;
        case 'set-deactivated':
          void this.changeStatus(qid, 'deactivated');
          break;
        case 'set-deleted':
          void this.changeStatus(qid, 'deleted');
          break;
        case 'resolve-flag':
          void this.resolveFlag(qid);
          break;
        case 'save-form':
          void this.saveForm();
          break;
        case 'save-markdown':
          void this.saveMarkdown();
          break;
        case 'save-flag':
          void this.saveFlag();
          break;
        case 'switch-mode-form':
          if (this.editState) {
            this.editState.mode = 'form';
            this.editState.error = null;
            this.render();
          }
          break;
        case 'switch-mode-markdown':
          if (this.editState) {
            this.editState.mode = 'markdown';
            this.editState.markdownText = this.buildMarkdownFromState(this.editState);
            this.editState.error = null;
            this.render();
          }
          break;
        case 'add-answer':
          if (this.editState) {
            this.editState.answers.push({ text: '', isCorrect: false });
            this.render();
          }
          break;
        case 'remove-answer': {
          const idx = parseInt(actionEl.dataset['idx'] ?? '0', 10);
          if (this.editState && this.editState.answers.length > 2) {
            this.editState.answers.splice(idx, 1);
            this.render();
          }
          break;
        }
        case 'toggle-correct': {
          const idx = parseInt(actionEl.dataset['idx'] ?? '0', 10);
          if (this.editState) {
            const answer = this.editState.answers[idx];
            if (answer) answer.isCorrect = !answer.isCorrect;
            this.render();
          }
          break;
        }
      }
    });

    this.addEventListener('input', (e) => {
      if (!this.editState) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const el = target as HTMLElement;
      const value = target.value;
      const field = el.dataset['field'];
      const answerIdx = el.dataset['answerIdx'];

      if (field) {
        switch (field) {
          case 'text': this.editState.text = value; break;
          case 'difficulty': this.editState.difficulty = value as 'easy' | 'medium' | 'hard'; break;
          case 'topics': this.editState.topics = value; break;
          case 'tags': this.editState.tags = value; break;
          case 'timeLimit': this.editState.timeLimit = value; break;
          case 'markdownText': this.editState.markdownText = value; break;
          case 'flagText': this.editState.flagText = value; break;
        }
      }
      if (answerIdx !== undefined) {
        const idx = parseInt(answerIdx, 10);
        const answer = this.editState.answers[idx];
        if (answer) answer.text = value;
      }
    });
  }

  private async loadQuestions(): Promise<void> {
    this.loading = true;
    this.render();
    try {
      const result = await api.getEditableQuestions(this.bankId);
      this.questions = result.questions;
      this.bankName = result.bankName;
      this.pageError = null;
    } catch (err) {
      this.pageError = err instanceof Error ? err.message : 'Failed to load questions';
    }
    this.loading = false;
    this.render();
  }

  private openInlineEdit(questionId: string): void {
    const q = this.questions.find((q) => q.id === questionId);
    if (!q) return;
    this.editingQid = questionId;
    this.editState = {
      question: q,
      text: q.text,
      answers: q.answers.map((a) => ({ text: a.text, isCorrect: q.correctAnswerIds.includes(a.id) })),
      difficulty: q.difficulty,
      topics: q.topics.join(', '),
      tags: q.tags.join(', '),
      timeLimit: q.timeLimit != null ? String(q.timeLimit) : '',
      markdownText: '',
      mode: 'form',
      flagText: q.flag ?? '',
      saving: false,
      error: null,
      success: null,
    };
    this.render();
    setTimeout(() => {
      this.querySelector('.q-card--editing')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  private closeInlineEdit(): void {
    this.editingQid = null;
    this.editState = null;
    this.render();
  }

  private buildMarkdownFromState(s: EditState): string {
    const lines: string[] = [];
    lines.push(`**Difficulty**: ${s.difficulty}`);
    const topics = s.topics.split(',').map(t => t.trim()).filter(Boolean);
    if (topics.length) lines.push(`**Topics**: ${topics.join(', ')}`);
    const tags = s.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length) lines.push(`**Tags**: ${tags.join(', ')}`);
    if (s.timeLimit && parseInt(s.timeLimit, 10) > 0) lines.push(`**Time Limit**: ${s.timeLimit}s`);
    if (s.question.status && s.question.status !== 'active') lines.push(`**Status**: ${s.question.status}`);
    if (s.question.flag) lines.push(`**Flag**: ${s.question.flag}`);
    lines.push('');
    lines.push(s.text.trim());
    lines.push('');
    for (const a of s.answers) {
      lines.push(`- [${a.isCorrect ? 'x' : ' '}] ${a.text}`);
    }
    lines.push('');
    return lines.join('\n');
  }

  private async saveForm(): Promise<void> {
    if (!this.editState) return;
    this.editState.saving = true;
    this.editState.error = null;
    this.editState.success = null;
    this.render();

    const topics = this.editState.topics.split(',').map(t => t.trim()).filter(Boolean);
    const tags = this.editState.tags.split(',').map(t => t.trim()).filter(Boolean);
    const timeLimit = this.editState.timeLimit ? parseInt(this.editState.timeLimit, 10) : undefined;
    const validAnswers = this.editState.answers.filter(a => a.text.trim());

    if (!this.editState.text.trim()) {
      this.editState.saving = false;
      this.editState.error = 'Question text is required.';
      this.render();
      return;
    }
    if (validAnswers.length < 2) {
      this.editState.saving = false;
      this.editState.error = 'At least 2 answers are required.';
      this.render();
      return;
    }
    if (!validAnswers.some(a => a.isCorrect)) {
      this.editState.saving = false;
      this.editState.error = 'At least one answer must be marked correct.';
      this.render();
      return;
    }

    try {
      const result = await api.updateQuestion(this.bankId, this.editState.question.id, {
        text: this.editState.text.trim(),
        answers: validAnswers,
        difficulty: this.editState.difficulty,
        topics,
        tags,
        timeLimit: timeLimit && !isNaN(timeLimit) ? timeLimit : undefined,
      });
      if (result.question) {
        const idx = this.questions.findIndex(q => q.id === result.question!.id);
        if (idx !== -1) this.questions[idx] = result.question;
        this.editState.question = result.question;
        this.editState.success = 'Saved.';
      }
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to save';
    }
    this.editState.saving = false;
    this.render();
  }

  private async saveMarkdown(): Promise<void> {
    if (!this.editState) return;
    this.editState.saving = true;
    this.editState.error = null;
    this.editState.success = null;
    this.render();

    try {
      const result = await api.updateQuestionMarkdown(
        this.bankId,
        this.editState.question.id,
        this.editState.markdownText,
      );
      if (result.question) {
        const idx = this.questions.findIndex(q => q.id === result.question!.id);
        if (idx !== -1) this.questions[idx] = result.question;
        this.editState.question = result.question;
        this.editState.success = 'Saved.';
      }
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to save';
    }
    this.editState.saving = false;
    this.render();
  }

  private async saveFlag(): Promise<void> {
    if (!this.editState) return;
    this.editState.saving = true;
    this.editState.error = null;
    this.render();

    try {
      const flagText = this.editState.flagText.trim();
      await api.setQuestionFlag(this.bankId, this.editState.question.id, flagText);
      const q = this.questions.find(q => q.id === this.editState!.question.id);
      if (q) q.flag = flagText || undefined;
      this.editState.question.flag = flagText || undefined;
      this.editState.success = flagText ? 'Flag saved.' : 'Flag cleared.';
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to save flag';
    }
    this.editState.saving = false;
    this.render();
  }

  private async changeStatus(questionId: string, status: 'active' | 'deactivated' | 'deleted'): Promise<void> {
    try {
      await api.setQuestionStatus(this.bankId, questionId, status);
      const q = this.questions.find(q => q.id === questionId);
      if (q) q.status = status;
      if (this.editState?.question.id === questionId) {
        this.editState.question.status = status;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
    this.render();
  }

  private async resolveFlag(questionId: string): Promise<void> {
    try {
      await api.setQuestionFlag(this.bankId, questionId, '');
      const q = this.questions.find(q => q.id === questionId);
      if (q) q.flag = undefined;
      if (this.editState?.question.id === questionId) {
        this.editState.question.flag = undefined;
        this.editState.flagText = '';
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve flag');
    }
    this.render();
  }

  protected render(): void {
    if (this.loading) {
      this.setContent(`
        <div class="screen"><div class="container">
          <div class="loading-container"><div class="spinner"></div><p>Loading questions…</p></div>
        </div></div>`);
      return;
    }
    if (this.pageError) {
      this.setContent(`
        <div class="screen"><div class="container">
          <p class="error-message">${this.escapeHtml(this.pageError)}</p>
          <button class="secondary" data-action="back">← Back</button>
        </div></div>`);
      return;
    }

    const cards = this.questions.map(q => this.renderCard(q)).join('');

    this.setContent(`
      <div class="screen">
        <div class="container question-editor">
          <div class="editor-header">
            <button class="secondary" data-action="back">← Back</button>
            <h2>Edit: ${this.escapeHtml(this.bankName)}</h2>
          </div>
          <div class="q-list">
            ${cards || '<p style="color:var(--color-text-muted)">No questions found.</p>'}
          </div>
        </div>
      </div>`);
  }

  private renderCard(q: QuestionForEdit): string {
    const isEditing = this.editingQid === q.id;
    const isInactive = q.status !== 'active';

    const diffClass =
      q.difficulty === 'easy' ? 'badge-diff-easy' :
      q.difficulty === 'hard' ? 'badge-diff-hard' : 'badge-diff-medium';

    const statusIcon =
      q.status === 'deactivated' ? '<span class="q-status-icon" title="Deactivated">🚫</span>' :
      q.status === 'deleted' ? '<span class="q-status-icon" title="Deleted">🗑️</span>' : '';

    const editBtn = isEditing
      ? `<button class="q-icon-btn q-icon-btn--cancel" data-action="cancel-edit" data-qid="${this.escapeHtml(q.id)}" title="Close">✕</button>`
      : `<button class="q-icon-btn" data-action="edit-question" data-qid="${this.escapeHtml(q.id)}" title="Edit">✏️</button>`;

    const statusBtn = q.status !== 'active'
      ? `<button class="q-icon-btn" data-action="set-active" data-qid="${this.escapeHtml(q.id)}" title="Activate">✅</button>`
      : `<button class="q-icon-btn" data-action="set-deactivated" data-qid="${this.escapeHtml(q.id)}" title="Deactivate">🚫</button>`;

    const deleteBtn = q.status !== 'deleted'
      ? `<button class="q-icon-btn q-icon-btn--danger" data-action="set-deleted" data-qid="${this.escapeHtml(q.id)}" title="Delete">🗑️</button>`
      : `<button class="q-icon-btn" data-action="set-active" data-qid="${this.escapeHtml(q.id)}" title="Restore">♻️</button>`;

    const flagBtn = q.flag
      ? `<button class="q-icon-btn q-icon-btn--warn" data-action="resolve-flag" data-qid="${this.escapeHtml(q.id)}" title="Resolve: ${this.escapeHtml(q.flag)}">✅🚩</button>`
      : '';

    const answers = q.answers.map(a => {
      const isCorrect = q.correctAnswerIds.includes(a.id);
      return `<div class="q-answer ${isCorrect ? 'q-answer--correct' : ''}">
        <span class="q-answer-mark">${isCorrect ? '✓' : '○'}</span>
        <span class="q-answer-text">${this.escapeHtml(a.text)}</span>
      </div>`;
    }).join('');

    const editPanel = isEditing && this.editState ? this.renderEditPanel(this.editState) : '';

    return `
      <div class="q-card ${isInactive ? 'q-card--inactive' : ''} ${isEditing ? 'q-card--editing' : ''}">
        <div class="q-meta">
          <span class="badge badge-diff ${diffClass}">${q.difficulty}</span>
          ${statusIcon}
          ${q.flag ? `<span class="badge badge-diff badge-diff--flag" title="${this.escapeHtml(q.flag)}">🚩 ${this.escapeHtml(q.flag.slice(0, 50))}${q.flag.length > 50 ? '…' : ''}</span>` : ''}
          <span class="q-id">${this.escapeHtml(q.id)}</span>
          <div class="q-actions">
            ${editBtn}
            ${statusBtn}
            ${deleteBtn}
            ${flagBtn}
          </div>
        </div>
        <div class="q-text" data-action="edit-question" data-qid="${this.escapeHtml(q.id)}">${this.escapeHtml(q.text)}</div>
        <div class="q-answers">${answers}</div>
        ${editPanel}
      </div>`;
  }

  private renderEditPanel(s: EditState): string {
    const modeSwitcher = `
      <div class="q-mode-switcher">
        <button class="btn-sm ${s.mode === 'form' ? 'primary' : 'outline'}" data-action="switch-mode-form">Form</button>
        <button class="btn-sm ${s.mode === 'markdown' ? 'primary' : 'outline'}" data-action="switch-mode-markdown">Markdown</button>
      </div>`;

    const formBody = s.mode === 'form' ? `
      <div class="q-edit-field">
        <label>Question</label>
        <textarea class="input" rows="3" data-field="text">${this.escapeHtml(s.text)}</textarea>
      </div>
      <div class="q-edit-row">
        <div class="q-edit-field">
          <label>Difficulty</label>
          <select class="input" data-field="difficulty">
            <option value="easy" ${s.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${s.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${s.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
          </select>
        </div>
        <div class="q-edit-field">
          <label>Time (s)</label>
          <input type="number" class="input" data-field="timeLimit" value="${this.escapeHtml(s.timeLimit)}" placeholder="Default" min="5" max="120" />
        </div>
        <div class="q-edit-field q-edit-field--grow">
          <label>Topics</label>
          <input type="text" class="input" data-field="topics" value="${this.escapeHtml(s.topics)}" placeholder="comma-separated" />
        </div>
        <div class="q-edit-field q-edit-field--grow">
          <label>Tags</label>
          <input type="text" class="input" data-field="tags" value="${this.escapeHtml(s.tags)}" placeholder="comma-separated" />
        </div>
      </div>
      <div class="q-edit-field">
        <label>Answers <button class="btn-sm outline" data-action="add-answer" type="button" style="margin-left:8px">+ Add</button></label>
        ${s.answers.map((a, i) => `
          <div class="answer-row">
            <button class="btn-sm ${a.isCorrect ? 'primary' : 'outline'}" data-action="toggle-correct" data-idx="${i}" title="${a.isCorrect ? 'Correct' : 'Mark correct'}">
              ${a.isCorrect ? '✓' : '○'}
            </button>
            <input type="text" class="input answer-input" data-answer-idx="${i}" value="${this.escapeHtml(a.text)}" placeholder="Answer text…" />
            ${s.answers.length > 2 ? `<button class="btn-sm danger" data-action="remove-answer" data-idx="${i}" title="Remove">✕</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="q-edit-field">
        <label>Flag comment <span style="font-weight:400;color:var(--color-text-muted)">(empty to clear)</span></label>
        <div class="q-edit-flag-row">
          <input type="text" class="input" data-field="flagText" value="${this.escapeHtml(s.flagText)}" placeholder="Add a flag comment…" />
          <button class="btn-sm outline" data-action="save-flag" ${s.saving ? 'disabled' : ''}>Save flag</button>
        </div>
      </div>
      ${s.error ? `<p class="error-message" style="margin:4px 0">${this.escapeHtml(s.error)}</p>` : ''}
      ${s.success ? `<p style="color:var(--color-success,#22c55e);margin:4px 0;font-size:0.9rem">${this.escapeHtml(s.success)}</p>` : ''}
      <div class="q-edit-actions">
        <button class="primary" data-action="save-form" ${s.saving ? 'disabled' : ''}>${s.saving ? 'Saving…' : 'Save'}</button>
        <button class="secondary" data-action="cancel-edit">Cancel</button>
      </div>
    ` : `
      <div class="q-edit-field">
        <label>Raw Markdown <span style="font-weight:400;color:var(--color-text-muted)">(body — without the ### ID header)</span></label>
        <textarea class="input markdown-editor" rows="12" data-field="markdownText">${this.escapeHtml(s.markdownText)}</textarea>
      </div>
      ${s.error ? `<p class="error-message" style="margin:4px 0">${this.escapeHtml(s.error)}</p>` : ''}
      ${s.success ? `<p style="color:var(--color-success,#22c55e);margin:4px 0;font-size:0.9rem">${this.escapeHtml(s.success)}</p>` : ''}
      <div class="q-edit-actions">
        <button class="primary" data-action="save-markdown" ${s.saving ? 'disabled' : ''}>${s.saving ? 'Saving…' : 'Save'}</button>
        <button class="secondary" data-action="cancel-edit">Cancel</button>
      </div>
    `;

    return `
      <div class="q-edit-panel">
        ${modeSwitcher}
        ${formBody}
      </div>`;
  }
}

customElements.define('qz-question-bank-editor', QuestionBankEditor);
