import { BaseComponent } from './base-component';
import { api, ApiError } from '../api-client';
import CLAUDE_PROMPT from './claude-prompt.md?raw';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * <qz-upload-quiz-modal>
 *
 * A modal dialog that lets authenticated users upload a quiz bank as raw
 * Markdown (paste or file pick).  On success it dispatches a `quiz-uploaded`
 * CustomEvent so the parent bank-browser can refresh.
 *
 * Usage:
 *   const modal = document.createElement('qz-upload-quiz-modal') as UploadQuizModal;
 *   document.body.appendChild(modal);
 *   modal.open();
 */
export class UploadQuizModal extends BaseComponent {
  private isSubmitting = false;

  protected render(): void {
    this.setContent(`
      <div class="modal-backdrop" id="upload-modal-backdrop" style="
        display: none;
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(0,0,0,0.7);
        align-items: center; justify-content: center;
      ">
        <div class="upload-modal-box" style="
          background: var(--color-surface, #1e1e2e);
          border: 1px solid var(--color-border, #333);
          border-radius: 12px;
          padding: 32px;
          width: min(640px, 94vw);
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6);
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h2 style="margin:0; font-size:1.4rem;">Upload Quiz Bank</h2>
            <button class="modal-close-btn" aria-label="Close" style="
              background:none; border:none; font-size:1.5rem; cursor:pointer;
              color: var(--color-text-muted, #aaa); line-height:1;
            ">✕</button>
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:6px; font-weight:600;">Group name <span style="color:#888;font-weight:400;">(optional — leave blank to upload to your root)</span></label>
            <input class="upload-folder-input" type="text" placeholder="e.g. chemistry"
              style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--color-border,#444);
              background:var(--color-bg,#0d0d1a); color:inherit; font-size:1rem; box-sizing:border-box;" />
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block; margin-bottom:6px; font-weight:600;">File name <span style="color:#888;font-weight:400;">(no extension needed)</span></label>
            <input class="upload-filename-input" type="text" placeholder="e.g. acids-and-bases"
              style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--color-border,#444);
              background:var(--color-bg,#0d0d1a); color:inherit; font-size:1rem; box-sizing:border-box;" />
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="font-weight:600;">Quiz content <span style="color:#888;font-weight:400;">(Markdown)</span></label>
              <div style="display:flex; gap:8px; align-items:stretch;">
                <button class="copy-prompt-btn" style="
                  background: #7c3aed; color:white;
                  border:none; margin:0; outline:none;
                  padding:6px 12px; border-radius:6px;
                  cursor:pointer; font-size:0.85rem; white-space:nowrap;
                  font-family:inherit; line-height:1.4; box-sizing:border-box;
                ">📋 Copy Claude Prompt</button>
                <label class="file-pick-label" style="
                  background: var(--color-secondary, #2a2a3e); color:inherit;
                  border:1px solid var(--color-border,#444);
                  padding:6px 12px; border-radius:6px;
                  cursor:pointer; font-size:0.85rem; white-space:nowrap;
                  font-family:inherit; line-height:1.4; box-sizing:border-box;
                  display:flex; align-items:center;
                ">📂 Pick File
                  <input class="file-pick-input" type="file" accept=".md,text/plain,text/markdown"
                    style="display:none;" />
                </label>
              </div>
            </div>
            <textarea class="upload-content-textarea" rows="14" placeholder="Paste your quiz Markdown here…"
              style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--color-border,#444);
              background:var(--color-bg,#0d0d1a); color:inherit; font-size:0.85rem;
              font-family:monospace; resize:vertical; box-sizing:border-box;"></textarea>
          </div>

          <div class="upload-error-area" style="display:none; margin-bottom:16px;
            background:#3b1a1a; border:1px solid #aa3333; border-radius:6px; padding:12px;">
          </div>

          <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
            <button class="modal-cancel-btn btn-secondary" style="padding:10px 24px;">Cancel</button>
            <button class="upload-submit-btn" style="
              background:var(--color-primary,#00d4ff); color:#000; border:none;
              padding:10px 28px; border-radius:8px; cursor:pointer;
              font-weight:700; font-size:1rem;
            ">Upload Quiz</button>
          </div>
        </div>
      </div>
    `);

    this.bindEvents();
  }

  private bindEvents(): void {
    const backdrop = this.qs<HTMLElement>('#upload-modal-backdrop')!;

    // Close buttons
    this.qs('.modal-close-btn')?.addEventListener('click', () => this.close());
    this.qs('.modal-cancel-btn')?.addEventListener('click', () => this.close());

    // Click outside to close
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    // Copy Claude prompt to clipboard
    this.qs('.copy-prompt-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(CLAUDE_PROMPT);
        const btn = this.qs<HTMLButtonElement>('.copy-prompt-btn')!;
        const original = btn.textContent!;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = original; }, 2000);
      } catch {
        // Clipboard API may not be available (non-HTTPS, permission denied)
        const btn = this.qs<HTMLButtonElement>('.copy-prompt-btn')!;
        const original = btn.textContent!;
        btn.textContent = '⚠️ Copy failed — paste manually';
        setTimeout(() => { btn.textContent = original; }, 3000);
      }
    });

    // File picker → populate textarea
    this.qs<HTMLInputElement>('.file-pick-input')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const textarea = this.qs<HTMLTextAreaElement>('.upload-content-textarea')!;
        textarea.value = reader.result as string;
        // Auto-fill filename from file stem if the field is empty
        const filenameInput = this.qs<HTMLInputElement>('.upload-filename-input')!;
        if (!filenameInput.value) {
          filenameInput.value = file.name.replace(/\.md$/i, '');
        }
      };
      reader.readAsText(file);
    });

    // Submit
    this.qs('.upload-submit-btn')?.addEventListener('click', () => this.handleSubmit());
  }

  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;

    const folder = (this.qs<HTMLInputElement>('.upload-folder-input')?.value ?? '').trim();
    const filename = (this.qs<HTMLInputElement>('.upload-filename-input')?.value ?? '').trim();
    const content = (this.qs<HTMLTextAreaElement>('.upload-content-textarea')?.value ?? '').trim();

    // Client-side validation
    if (!filename) { this.showErrors([{ message: 'File name is required.' }]); return; }
    if (!content) { this.showErrors([{ message: 'Quiz content cannot be empty.' }]); return; }

    this.isSubmitting = true;
    const submitBtn = this.qs<HTMLButtonElement>('.upload-submit-btn')!;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading…';
    this.hideErrors();

    try {
      const result = await api.uploadQuizBank({ folder, filename, content });
      this.close();
      this.dispatchEvent(
        new CustomEvent('quiz-uploaded', {
          detail: { bank: result.bank },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as any;
        if (data?.errors) {
          this.showErrors(data.errors);
        } else {
          this.showErrors([{ message: data?.error ?? err.message }]);
        }
      } else {
        this.showErrors([{ message: 'Unexpected error — please try again.' }]);
      }
    } finally {
      this.isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Quiz';
    }
  }

  private showErrors(errors: Array<{ line?: number | null; message: string }>): void {
    const area = this.qs<HTMLElement>('.upload-error-area')!;
    area.style.display = 'block';
    area.innerHTML = errors
      .map((e) => `<div style="color:#ff7777; font-size:0.9rem;">
        ${e.line != null ? `<strong>Line ${e.line}:</strong> ` : ''}${this.escapeHtml(e.message)}
      </div>`)
      .join('');
  }

  private hideErrors(): void {
    const area = this.qs<HTMLElement>('.upload-error-area');
    if (area) area.style.display = 'none';
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  open(): void {
    const backdrop = this.qs<HTMLElement>('#upload-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      // Reset form
      (this.qs<HTMLInputElement>('.upload-folder-input'))!.value = '';
      (this.qs<HTMLInputElement>('.upload-filename-input'))!.value = '';
      (this.qs<HTMLTextAreaElement>('.upload-content-textarea'))!.value = '';
      this.hideErrors();
    }
  }

  close(): void {
    const backdrop = this.qs<HTMLElement>('#upload-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('qz-upload-quiz-modal', UploadQuizModal);
