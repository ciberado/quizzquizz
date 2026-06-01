import { BaseComponent } from './base-component';
import { api } from '../api-client';
import { router } from '../router';
import type { QuestionForEdit } from '../api-client';

type EditMode = 'form' | 'markdown';

interface EditState {
  question: QuestionForEdit;
  // form fields
  text: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string;
  tags: string;
  timeLimit: string;
  // markdown field
  markdownText: string;
  // edit mode
  mode: EditMode;
  // flag field
  newFlag: string;
  saving: boolean;
  error: string | null;
  success: string | null;
}

/**
 * <qz-question-bank-editor>
 *
 * Full question bank editor screen reached via #/edit/:bankId.
 * Lists all questions (active, deactivated, deleted) and lets the owner or an
 * admin edit, deactivate/delete/restore, flag, or resolve flags.
 */
export class QuestionBankEditor extends BaseComponent {
  private bankId = '';
  private bankName = '';
  private questions: QuestionForEdit[] = [];
  private loading = true;
  private pageError: string | null = null;

  // Currently opened question edit modal state
  private editState: EditState | null = null;

  protected async onMount(): Promise<void> {
    const hash = window.location.hash;
    // Route: #/edit/<bankId>  (bankId may contain slashes after URL-encoding)
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

  protected onUnmount(): void {
    // Nothing async to clean up
  }

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
          this.openEditModal(qid);
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
        case 'open-flag-modal':
          this.openFlagModal(qid);
          break;
        case 'resolve-flag':
          void this.resolveFlag(qid);
          break;
        case 'close-modal':
          this.closeEditModal();
          break;
        case 'save-form':
          void this.saveForm();
          break;
        case 'save-markdown':
          void this.saveMarkdown();
          break;
        case 'submit-flag':
          void this.submitFlag();
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

    // Input/change events (for form fields)
    this.addEventListener('input', (e) => {
      if (!this.editState) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const field = (target as HTMLElement).dataset['field'];
      if (!field) return;
      const value = target.value;

      switch (field) {
        case 'text': this.editState.text = value; break;
        case 'difficulty': this.editState.difficulty = value as 'easy' | 'medium' | 'hard'; break;
        case 'topics': this.editState.topics = value; break;
        case 'tags': this.editState.tags = value; break;
        case 'timeLimit': this.editState.timeLimit = value; break;
        case 'markdownText': this.editState.markdownText = value; break;
        case 'newFlag': this.editState.newFlag = value; break;
      }

      // Answer text fields
      const answerIdx = (target as HTMLElement).dataset['answerIdx'];
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

  private openEditModal(questionId: string): void {
    const q = this.questions.find((q) => q.id === questionId);
    if (!q) return;

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
      newFlag: '',
      saving: false,
      error: null,
      success: null,
    };
    this.render();
  }

  private openFlagModal(questionId: string): void {
    const q = this.questions.find((q) => q.id === questionId);
    if (!q) return;

    // Reuse editState with a special mode to show the flag modal
    this.editState = {
      question: q,
      text: q.text,
      answers: q.answers.map((a) => ({ text: a.text, isCorrect: q.correctAnswerIds.includes(a.id) })),
      difficulty: q.difficulty,
      topics: q.topics.join(', '),
      tags: q.tags.join(', '),
      timeLimit: q.timeLimit != null ? String(q.timeLimit) : '',
      markdownText: '',
      mode: 'form',  // flag modal is separate section, not a mode
      newFlag: '',
      saving: false,
      error: null,
      success: null,
    };
    this.render();
    // Scroll flag section into view
    setTimeout(() => this.qs('[data-flag-modal]')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  private closeEditModal(): void {
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

    // Validate
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
      this.editState.error = 'At least one answer must be marked as correct.';
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
        this.editState.success = 'Question saved.';
      }
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to save question';
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
        this.editState.success = 'Question saved.';
      }
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to save question';
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

  private async submitFlag(): Promise<void> {
    if (!this.editState) return;
    const flagText = this.editState.newFlag.trim();
    if (!flagText) return;
    this.editState.saving = true;
    this.render();

    try {
      await api.setQuestionFlag(this.bankId, this.editState.question.id, flagText);
      const q = this.questions.find(q => q.id === this.editState!.question.id);
      if (q) q.flag = flagText;
      this.editState.question.flag = flagText;
      this.editState.newFlag = '';
      this.editState.success = 'Flag added.';
    } catch (err) {
      this.editState.error = err instanceof Error ? err.message : 'Failed to add flag';
    }
    this.editState.saving = false;
    this.render();
  }

  private async resolveFlag(questionId: string): Promise<void> {
    try {
      await api.setQuestionFlag(this.bankId, questionId, '');
      const q = this.questions.find(q => q.id === questionId);
      if (q) q.flag = undefined;
      if (this.editState?.question.id === questionId) {
        this.editState.question.flag = undefined;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve flag');
    }
    this.render();
  }

  protected render(): void {
    if (this.loading) {
      this.setContent(`
        <div class="screen">
          <div class="container">
            <div class="loading-container">
              <div class="spinner"></div>
              <p>Loading questions…</p>
            </div>
          </div>
        </div>
      `);
      return;
    }

    if (this.pageError) {
      this.setContent(`
        <div class="screen">
          <div class="container">
            <p class="error-message">${this.escapeHtml(this.pageError)}</p>
            <button class="secondary" data-action="back">← Back</button>
          </div>
        </div>
      `);
      return;
    }

    const modal = this.editState ? this.renderModal(this.editState) : '';

    const rows = this.questions.map((q) => {
      const statusBadge = this.statusBadge(q.status);
      const flagBadge = q.flag
        ? `<span class="badge badge-warning" title="${this.escapeHtml(q.flag)}">🚩 Flagged</span>`
        : '';
      return `
        <tr class="question-row ${q.status !== 'active' ? 'question-row--inactive' : ''}">
          <td class="question-id">${this.escapeHtml(q.id)}</td>
          <td class="question-text">${this.escapeHtml(q.text.slice(0, 80))}${q.text.length > 80 ? '…' : ''}</td>
          <td>${this.escapeHtml(q.difficulty)}</td>
          <td>${statusBadge} ${flagBadge}</td>
          <td class="question-actions">
            <button class="btn-sm primary" data-action="edit-question" data-qid="${this.escapeHtml(q.id)}">Edit</button>
            ${q.status !== 'active'
              ? `<button class="btn-sm secondary" data-action="set-active" data-qid="${this.escapeHtml(q.id)}">Activate</button>`
              : `<button class="btn-sm secondary" data-action="set-deactivated" data-qid="${this.escapeHtml(q.id)}">Deactivate</button>`}
            ${q.status !== 'deleted'
              ? `<button class="btn-sm danger" data-action="set-deleted" data-qid="${this.escapeHtml(q.id)}">Delete</button>`
              : `<button class="btn-sm secondary" data-action="set-active" data-qid="${this.escapeHtml(q.id)}">Restore</button>`}
            ${q.flag
              ? `<button class="btn-sm warning" data-action="resolve-flag" data-qid="${this.escapeHtml(q.id)}">Resolve Flag</button>`
              : `<button class="btn-sm outline" data-action="open-flag-modal" data-qid="${this.escapeHtml(q.id)}">🚩 Flag</button>`}
          </td>
        </tr>`;
    }).join('');

    this.setContent(`
      <div class="screen">
        <div class="container question-editor">
          <div class="editor-header">
            <button class="secondary" data-action="back">← Back</button>
            <h2>Edit Bank: ${this.escapeHtml(this.bankName)}</h2>
          </div>

          <p class="editor-legend">
            <span class="badge badge-success">Active</span> questions appear in quizzes.
            <span class="badge badge-warning">Deactivated</span> are hidden from quizzes.
            <span class="badge badge-danger">Deleted</span> are soft-deleted.
            🚩 Flagged questions have a comment requiring attention.
          </p>

          <div class="editor-table-wrapper">
            <table class="editor-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5" style="text-align:center">No questions found.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        ${modal}
      </div>
    `);
  }

  private statusBadge(status: 'active' | 'deactivated' | 'deleted'): string {
    const map = {
      active: '<span class="badge badge-success">Active</span>',
      deactivated: '<span class="badge badge-warning">Deactivated</span>',
      deleted: '<span class="badge badge-danger">Deleted</span>',
    };
    return map[status] ?? '';
  }

  private renderModal(s: EditState): string {
    const flagSection = `
      <div class="modal-section" data-flag-modal>
        <h4>Flag</h4>
        ${s.question.flag
          ? `<div class="flag-display">
              <p class="flag-comment">🚩 <strong>Current flag:</strong> ${this.escapeHtml(s.question.flag)}</p>
              <button class="btn-sm warning" data-action="resolve-flag" data-qid="${this.escapeHtml(s.question.id)}">Resolve Flag</button>
            </div>`
          : ''}
        <div class="flag-input-row">
          <input type="text" class="input" data-field="newFlag" value="${this.escapeHtml(s.newFlag)}" placeholder="Add a flag comment…" />
          <button class="btn-sm primary" data-action="submit-flag" ${s.saving ? 'disabled' : ''}>Add Flag</button>
        </div>
        ${s.error ? `<p class="error-message">${this.escapeHtml(s.error)}</p>` : ''}
        ${s.success ? `<p class="success-message">${this.escapeHtml(s.success)}</p>` : ''}
      </div>`;

    const statusSection = `
      <div class="modal-section">
        <h4>Status: ${this.statusBadge(s.question.status)}</h4>
        <div class="status-buttons">
          ${s.question.status !== 'active' ? `<button class="btn-sm secondary" data-action="set-active" data-qid="${this.escapeHtml(s.question.id)}">Activate</button>` : ''}
          ${s.question.status !== 'deactivated' ? `<button class="btn-sm secondary" data-action="set-deactivated" data-qid="${this.escapeHtml(s.question.id)}">Deactivate</button>` : ''}
          ${s.question.status !== 'deleted' ? `<button class="btn-sm danger" data-action="set-deleted" data-qid="${this.escapeHtml(s.question.id)}">Delete</button>` : `<button class="btn-sm secondary" data-action="set-active" data-qid="${this.escapeHtml(s.question.id)}">Restore</button>`}
        </div>
      </div>`;

    const modeSwitcher = `
      <div class="mode-switcher">
        <button class="btn-sm ${s.mode === 'form' ? 'primary' : 'outline'}" data-action="switch-mode-form">Form</button>
        <button class="btn-sm ${s.mode === 'markdown' ? 'primary' : 'outline'}" data-action="switch-mode-markdown">Markdown</button>
      </div>`;

    const formBody = s.mode === 'form' ? `
      <div class="form-group">
        <label>Question text</label>
        <textarea class="input" rows="3" data-field="text">${this.escapeHtml(s.text)}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Difficulty</label>
          <select class="input" data-field="difficulty">
            <option value="easy" ${s.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="medium" ${s.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="hard" ${s.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
          </select>
        </div>
        <div class="form-group">
          <label>Time limit (s)</label>
          <input type="number" class="input" data-field="timeLimit" value="${this.escapeHtml(s.timeLimit)}" placeholder="Bank default" min="5" max="120" />
        </div>
      </div>
      <div class="form-group">
        <label>Topics (comma-separated)</label>
        <input type="text" class="input" data-field="topics" value="${this.escapeHtml(s.topics)}" />
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input type="text" class="input" data-field="tags" value="${this.escapeHtml(s.tags)}" />
      </div>
      <div class="form-group">
        <label>Answers <button class="btn-sm outline" data-action="add-answer" type="button">+ Add</button></label>
        ${s.answers.map((a, i) => `
          <div class="answer-row">
            <button class="btn-sm ${a.isCorrect ? 'primary' : 'outline'}" data-action="toggle-correct" data-idx="${i}" title="${a.isCorrect ? 'Correct' : 'Incorrect'}">
              ${a.isCorrect ? '✓' : '○'}
            </button>
            <input type="text" class="input answer-input" data-answer-idx="${i}" value="${this.escapeHtml(a.text)}" placeholder="Answer text…" />
            ${s.answers.length > 2 ? `<button class="btn-sm danger" data-action="remove-answer" data-idx="${i}">✕</button>` : ''}
          </div>`).join('')}
      </div>
      ${s.error ? `<p class="error-message">${this.escapeHtml(s.error)}</p>` : ''}
      ${s.success ? `<p class="success-message">${this.escapeHtml(s.success)}</p>` : ''}
      <button class="primary" data-action="save-form" ${s.saving ? 'disabled' : ''}>${s.saving ? 'Saving…' : 'Save Changes'}</button>
    ` : `
      <div class="form-group">
        <label>Raw Markdown (question body — without the ### ID header)</label>
        <textarea class="input markdown-editor" rows="14" data-field="markdownText">${this.escapeHtml(s.markdownText)}</textarea>
      </div>
      ${s.error ? `<p class="error-message">${this.escapeHtml(s.error)}</p>` : ''}
      ${s.success ? `<p class="success-message">${this.escapeHtml(s.success)}</p>` : ''}
      <button class="primary" data-action="save-markdown" ${s.saving ? 'disabled' : ''}>${s.saving ? 'Saving…' : 'Save Markdown'}</button>
    `;

    return `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Edit question ${this.escapeHtml(s.question.id)}" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Question: <code>${this.escapeHtml(s.question.id)}</code></h3>
            <button class="btn-sm outline" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <div class="modal-body">
            ${statusSection}
            ${flagSection}
            <hr />
            ${modeSwitcher}
            ${formBody}
          </div>
        </div>
      </div>`;
  }
}

customElements.define('qz-question-bank-editor', QuestionBankEditor);
