import { BaseComponent } from './base-component';
import { api, QuestionBankFolder, QuestionBankSummary } from '../api-client';
import { handleApiError } from '../error-handler';
import { router } from '../router';

// Module-level cache so folder drill-down (which re-mounts the component via
// hash navigation) never triggers a redundant API fetch.
let treeCache: QuestionBankFolder | null = null;

/** Called by CreateSessionScreen after a successful Refresh Banks API call. */
export function clearBankTreeCache(): void {
  treeCache = null;
}

/**
 * <qz-bank-browser>
 *
 * Displays the question-bank folder tree with drill-down breadcrumb navigation.
 * Emits a `bank-selected` CustomEvent (detail: { bankId: string }) when the
 * user clicks a bank card.
 *
 * Falls back to a flat grid when the root has no sub-folders (pre-7F behaviour).
 */
export class BankBrowser extends BaseComponent {
  /** Path segments from root to the currently-displayed folder */
  private currentPath: string[] = [];
  /** The full tree fetched from the API */
  private rootTree: QuestionBankFolder | null = null;

  protected async onMount(): Promise<void> {
    await this.loadTree();
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  /** Read the folder path encoded in the current URL hash as `?folder=a/b/c`. */
  private readPathFromHash(): string[] {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) return [];
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const folder = params.get('folder');
    return folder ? folder.split('/').filter(Boolean) : [];
  }

  /** Returns the hash fragment to use for a given folder path. */
  private hashForPath(path: string[]): string {
    return path.length === 0
      ? '/create'
      : `/create?folder=${encodeURIComponent(path.join('/'))}`;
  }

  async loadTree(forceRefresh = false): Promise<void> {
    if (!forceRefresh && treeCache) {
      this.rootTree = treeCache;
      this.currentPath = this.readPathFromHash();
      // Ensure path is valid; fall back to root if a segment is missing.
      this.currentPath = this.validatedPath(this.currentPath);
      this.render();
      return;
    }
    this.showLoading('Loading question banks...');
    try {
      const tree = await api.getQuestionBankTree();
      treeCache = tree;
      this.rootTree = tree;
      this.currentPath = this.validatedPath(this.readPathFromHash());
      this.render();
    } catch (error) {
      console.error('Failed to load question bank tree:', error);
      handleApiError(error, 'Loading question banks');
      this.showError('Could not load question banks. Please check if the API server is running.');
    }
  }

  /** Truncate a path at the first segment that doesn't exist in the tree. */
  private validatedPath(path: string[]): string[] {
    if (!this.rootTree) return [];
    let node: QuestionBankFolder = this.rootTree;
    const valid: string[] = [];
    for (const segment of path) {
      const child = node.folders.find((f) => f.name === segment);
      if (!child) break;
      valid.push(segment);
      node = child;
    }
    return valid;
  }

  // ─── Navigation helpers ────────────────────────────────────────────────────

  /** Walk the tree along `currentPath` to get the node to display */
  private currentFolder(): QuestionBankFolder | null {
    if (!this.rootTree) return null;
    let node: QuestionBankFolder = this.rootTree;
    for (const segment of this.currentPath) {
      const child = node.folders.find((f) => f.name === segment);
      if (!child) return this.rootTree; // stale path → fall back to root
      node = child;
    }
    return node;
  }

  /** Total number of banks in a folder subtree (for the folder card label) */
  private countBanks(folder: QuestionBankFolder): number {
    return folder.banks.length + folder.folders.reduce((sum, f) => sum + this.countBanks(f), 0);
  }

  private enterFolder(name: string): void {
    const newPath = [...this.currentPath, name];
    // Navigate via hash so the browser records a history entry — Back button
    // will pop back to the previous folder level.
    router.navigate(this.hashForPath(newPath));
  }

  private navigateTo(depth: number): void {
    router.navigate(this.hashForPath(this.currentPath.slice(0, depth)));
  }

  private selectBank(bankId: string): void {
    this.dispatchEvent(new CustomEvent('bank-selected', { detail: { bankId }, bubbles: true, composed: true }));
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  protected render(): void {
    if (!this.rootTree) return; // still loading

    const folder = this.currentFolder();
    if (!folder) {
      this.setContent('<p class="error-message">Folder not found.</p>');
      return;
    }

    const hasFolders = this.rootTree.folders.length > 0;

    this.setContent(`
      ${hasFolders ? this.renderBreadcrumb() : ''}
      ${this.renderFolder(folder, hasFolders)}
    `);

    this.bindEvents();
  }

  private renderBreadcrumb(): string {
    const segments = ['All Banks', ...this.currentPath];
    return `
      <nav class="bank-browser-breadcrumb" aria-label="Question bank navigation">
        ${segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return isLast
            ? `<span class="breadcrumb-current">${this.escapeHtml(seg)}</span>`
            : `<button class="breadcrumb-link" data-depth="${i}">${this.escapeHtml(seg)}</button>
               <span class="breadcrumb-sep">›</span>`;
        }).join('')}
      </nav>
    `;
  }

  private renderFolder(folder: QuestionBankFolder, showFolderCards: boolean): string {
    const hasContent = folder.folders.length > 0 || folder.banks.length > 0;
    if (!hasContent) {
      return '<p class="text-center" style="color: var(--color-text-muted); margin-top: var(--spacing-lg);">No question banks in this folder.</p>';
    }

    const folderCards = showFolderCards
      ? folder.folders.map((f) => this.renderFolderCard(f)).join('')
      : '';

    const bankCards = folder.banks.map((b) => this.renderBankCard(b)).join('');

    return `<div class="question-banks-grid">${folderCards}${bankCards}</div>`;
  }

  private renderFolderCard(folder: QuestionBankFolder): string {
    const count = this.countBanks(folder);
    return `
      <div class="question-bank-card bank-browser-folder-card" data-folder-name="${this.escapeHtml(folder.name)}" style="cursor: pointer;">
        <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">📁</div>
        <h3>${this.escapeHtml(folder.name)}</h3>
        <div class="bank-meta">
          <span>${count} ${count === 1 ? 'bank' : 'banks'}</span>
        </div>
      </div>
    `;
  }

  private renderBankCard(bank: QuestionBankSummary): string {
    return `
      <div class="question-bank-card" data-bank-id="${this.escapeHtml(bank.id)}" style="cursor: pointer;">
        <h3>${this.escapeHtml(bank.name)}</h3>
        <p>${this.escapeHtml(bank.description || 'No description')}</p>
        <div class="bank-meta">
          <span>📚 ${bank.questionCount} questions</span>
        </div>
      </div>
    `;
  }

  // ─── Event binding ─────────────────────────────────────────────────────────

  private bindEvents(): void {
    // Breadcrumb navigation
    this.qsa<HTMLButtonElement>('.breadcrumb-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const depth = parseInt(btn.dataset['depth'] ?? '0', 10);
        this.navigateTo(depth);
      });
    });

    // Folder cards
    this.qsa<HTMLElement>('.bank-browser-folder-card').forEach((card) => {
      card.addEventListener('click', () => {
        const name = card.dataset['folderName'];
        if (name) this.enterFolder(name);
      });
    });

    // Bank cards
    this.qsa<HTMLElement>('[data-bank-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset['bankId'];
        if (id) this.selectBank(id);
      });
    });
  }
}

customElements.define('qz-bank-browser', BankBrowser);
