/**
 * Summary Screen — shown after completing all flashcards.
 * Displays stats: first-try successes, retried cards, total attempts per card, time spent.
 * Provides download button for JSON/CSV export.
 */
import { BaseComponent } from './base-component';
import { router } from '../router';
import type { LeitnerStats } from '../leitner';
import { getActiveSession, clearActiveSession, markSetCompleted } from '../flashcard-sets';
import type { FlaggedQuestion } from './play-screen';

const RETURN_URL_KEY = 'qz-flashcard-return-url';
// sessionStorage keys written by play-screen when it reads hash params
const SS_BANK_ID = 'qz-active-bank-id';
const SS_SET_INDEX = 'qz-active-set-index';
const SS_RETURN_URL = 'qz-flashcard-return-url';
const SS_FLAGGED_QUESTIONS = 'qz-flashcard-flags';

type SortCol = 'question' | 'yes' | 'no' | 'firstTry' | 'status' | 'flag';
type SortDir = 'asc' | 'desc';

export class FlashcardSummaryScreen extends BaseComponent {
  private stats: LeitnerStats | null = null;
  private bankName: string = '';
  private returnUrl: string = '';
  private sortCol: SortCol = 'question';
  private sortDir: SortDir = 'asc';
  private flaggedQuestions: Map<string, FlaggedQuestion> = new Map();

  protected onMount(): void {
    this.injectStyles();

    try {
      const raw = sessionStorage.getItem('qz-flashcard-stats');
      if (raw) this.stats = JSON.parse(raw) as LeitnerStats;
      this.bankName = sessionStorage.getItem('qz-flashcard-bank-name') || 'Flashcard Session';
      // Return URL: prefer sessionStorage (written by play-screen from URL hash params,
      // works cross-origin) then fall back to localStorage (same-origin production path).
      this.returnUrl =
        sessionStorage.getItem(SS_RETURN_URL) ||
        localStorage.getItem(RETURN_URL_KEY) ||
        '';
    } catch { /* ignore */ }

    try {
      const rawFlags = sessionStorage.getItem(SS_FLAGGED_QUESTIONS);
      if (rawFlags) {
        const arr = JSON.parse(rawFlags) as FlaggedQuestion[];
        for (const f of arr) this.flaggedQuestions.set(f.questionId, f);
      }
    } catch { /* ignore */ }

    // Mark the active set as completed.
    // Strategy A: sessionStorage (written by play-screen from URL hash params — works in dev
    //   when apps run on different ports, because URL params survive origin changes).
    // Strategy B: localStorage (same-origin production — written by host-app).
    // Strategy A is tried first; its completion is signalled back to the host-app by
    // appending ?done=1&bankId=...&setIndex=... to the return URL.
    try {
      const bankId = sessionStorage.getItem(SS_BANK_ID);
      const setIndexStr = sessionStorage.getItem(SS_SET_INDEX);
      if (bankId && setIndexStr !== null) {
        const setIndex = parseInt(setIndexStr, 10);
        if (!isNaN(setIndex)) {
          // In production (same origin) this also writes to the shared localStorage that
          // the host-app reads.  In dev mode the host-app reads it via the return URL params.
          markSetCompleted(bankId, setIndex);
          this.returnUrl = this.appendDoneParams(this.returnUrl, bankId, setIndex);
        }
        sessionStorage.removeItem(SS_BANK_ID);
        sessionStorage.removeItem(SS_SET_INDEX);
      } else {
        // Fallback: localStorage-based active session (same-origin production)
        const active = getActiveSession();
        if (active) {
          markSetCompleted(active.bankId, active.setIndex);
          clearActiveSession();
        }
      }
    } catch { /* ignore */ }

    this.render();
  }

  /**
   * Append completion params to the return URL hash so the host-app's flashcard
   * lobby screen can mark the set done in its own localStorage (cross-origin fix).
   */
  private appendDoneParams(returnUrl: string, bankId: string, setIndex: number): string {
    if (!returnUrl) return returnUrl;
    const suffix = `?done=1&bankId=${encodeURIComponent(bankId)}&setIndex=${setIndex}`;
    // Return URL is a hash-based URL like: http://host/#/flashcard-lobby/SESSION
    // Append the params after the hash path to form: .../#/flashcard-lobby/SESSION?done=1&...
    return returnUrl + suffix;
  }

  private injectStyles(): void {
    if (document.getElementById('fc-summary-styles')) return;
    const style = document.createElement('style');
    style.id = 'fc-summary-styles';
    style.textContent = `
      .fc-summary-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
      }

      .fc-summary-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
      }

      /* Table card: must not overflow the screen */
      .fc-summary-table-card {
        margin-bottom: var(--spacing-md);
        min-width: 0;
        overflow: hidden;
      }

      .fc-summary-table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        /* Subtle hint that the table is scrollable */
        border-radius: 0 0 var(--radius-md, 8px) var(--radius-md, 8px);
      }

      .fc-summary-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm);
      }

      .fc-summary-table td,
      .fc-summary-table th {
        padding: var(--spacing-xs);
      }

      /* Shrink question column on narrow screens; let other cols be compact */
      .fc-summary-table .col-question {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 480px) {
        .fc-summary-stats {
          grid-template-columns: 1fr 1fr;  /* keep 2-col but allow stat cards to shrink */
        }

        .fc-summary-stats .card {
          padding: var(--spacing-sm) !important;
        }

        .fc-summary-stats .card > div:first-child {
          font-size: 1.5rem !important;
        }

        .fc-summary-actions {
          grid-template-columns: 1fr;
        }

        .fc-summary-table .col-question {
          max-width: 120px;
        }
      }

      @media (max-width: 360px) {
        .fc-summary-stats {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  protected render(): void {
    if (!this.stats) {
      this.setContent(`
        <div class="screen"><div class="container"><div class="card text-center">
          <h2>No session data found</h2>
          <button class="btn-primary" id="home-btn" style="margin-top: var(--spacing-md);">← Start New Session</button>
        </div></div></div>
      `);
      this.qs('#home-btn')?.addEventListener('click', () => this.goBack());
      return;
    }

    const s = this.stats;
    const minutesStr = this.formatTime(s.totalTimeMs);
    const masteredPct = s.totalCards > 0 ? Math.round((s.graduated / s.totalCards) * 100) : 0;

    this.setContent(`
      <div class="screen">
        <div class="container" style="max-width: 700px;">
          <div class="card" style="margin-bottom: var(--spacing-md); text-align: center;">
            <h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-xs);">Session Complete!</h1>
            <p class="text-secondary">${this.escapeHtml(this.bankName)}</p>
          </div>

          <!-- Summary Stats -->
          <div class="fc-summary-stats">
            <div class="card text-center" style="padding: var(--spacing-md);">
              <div style="font-size: 2rem; font-weight: 700; color: var(--color-success);">${s.graduated}</div>
              <div class="text-secondary" style="font-size: var(--font-size-sm);">Cards Mastered</div>
              <div class="text-secondary" style="font-size: var(--font-size-sm);">(${masteredPct}%)</div>
            </div>
            <div class="card text-center" style="padding: var(--spacing-md);">
              <div style="font-size: 2rem; font-weight: 700; color: var(--color-primary);">${s.firstTrySuccessCount}</div>
              <div class="text-secondary" style="font-size: var(--font-size-sm);">Known on First Try</div>
            </div>
            <div class="card text-center" style="padding: var(--spacing-md);">
              <div style="font-size: 2rem; font-weight: 700; color: var(--color-warning);">${s.retriedCount}</div>
              <div class="text-secondary" style="font-size: var(--font-size-sm);">Needed Retries</div>
            </div>
            <div class="card text-center" style="padding: var(--spacing-md);">
              <div style="font-size: 2rem; font-weight: 700;">${minutesStr}</div>
              <div class="text-secondary" style="font-size: var(--font-size-sm);">Time Spent</div>
            </div>
          </div>

          <!-- Per-Card Details -->
          <div class="card fc-summary-table-card">
            <h2 style="margin-bottom: var(--spacing-md);">Card Details</h2>
            <div class="fc-summary-table-scroll">
              <table class="fc-summary-table">
                <thead>
                  <tr style="border-bottom: 2px solid var(--color-border);">
                    ${this.renderTh('question', 'Question', 'left')}
                    ${this.renderTh('yes', '✓ Yes', 'center')}
                    ${this.renderTh('no', '✗ No', 'center')}
                    ${this.renderTh('firstTry', 'First Try', 'center')}
                    ${this.renderTh('status', 'Status', 'center')}
                    ${this.renderTh('flag', '🚩', 'center')}
                  </tr>
                </thead>
                <tbody>
                  ${this.sortedRows(s)
                    .map(
                      (d) => {
                        const flag = this.flaggedQuestions.get(d.card.id);
                        const flagCell = flag
                          ? `<td style="text-align: center;" title="${this.escapeHtml(flag.explanation || 'Flagged')}" aria-label="Flagged">🚩</td>`
                          : `<td style="text-align: center; color: var(--color-text-light); opacity: 0.3;">—</td>`;
                        return `
                        <tr style="border-bottom: 1px solid var(--color-border);">
                          <td class="col-question" title="${this.escapeHtml(d.card.text)}">${this.escapeHtml(d.card.text)}</td>
                          <td style="text-align: center; color: var(--color-success);">${d.yesCount}</td>
                          <td style="text-align: center; color: var(--color-error);">${d.noCount}</td>
                          <td style="text-align: center;">
                            ${d.firstTrySuccess === true ? '✓' : d.firstTrySuccess === false ? '✗' : '—'}
                          </td>
                          <td style="text-align: center;">
                            ${d.graduated ? '<span style="color: var(--color-success); font-weight: 600;">Mastered</span>' : '<span style="color: var(--color-warning);">In Progress</span>'}
                          </td>
                          ${flagCell}
                        </tr>
                      `;
                      }
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="fc-summary-actions">
            <button id="download-json-btn" class="btn-secondary" style="padding: var(--spacing-md);">Download JSON</button>
            <button id="download-csv-btn" class="btn-secondary" style="padding: var(--spacing-md);">Download CSV</button>
          </div>

          <button id="new-session-btn" class="btn-primary" style="width: 100%; padding: var(--spacing-md); font-size: var(--font-size-lg);">
            ${this.returnUrl ? '← Back to Game' : '← Start New Session'}
          </button>
        </div>
      </div>
    `);

    this.qs('#download-json-btn')?.addEventListener('click', () => this.downloadJson());
    this.qs('#download-csv-btn')?.addEventListener('click', () => this.downloadCsv());
    this.qs('#new-session-btn')?.addEventListener('click', () => this.goBack());
    this.qsAll<HTMLElement>('[data-sort-col]').forEach((th) => {
      th.addEventListener('click', () => {
        const col = th.dataset['sortCol'] as SortCol;
        if (this.sortCol === col) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortCol = col;
          this.sortDir = col === 'question' ? 'asc' : 'desc';
        }
        this.render();
      });
    });
  }

  private renderTh(col: SortCol, label: string, align: 'left' | 'center'): string {
    const active = this.sortCol === col;
    const arrow = active ? (this.sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
    return `<th data-sort-col="${col}" style="text-align: ${align}; padding: var(--spacing-xs); cursor: pointer; user-select: none; white-space: nowrap; ${active ? 'color: var(--color-primary);' : ''}">${label}<span style="font-size: 0.75em; opacity: ${active ? '1' : '0.4'};">${arrow}</span></th>`;
  }

  private sortedRows(s: LeitnerStats): LeitnerStats['cardDetails'] {
    const rows = [...s.cardDetails];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      switch (this.sortCol) {
        case 'question':
          return dir * a.card.text.localeCompare(b.card.text);
        case 'yes':
          return dir * (a.yesCount - b.yesCount);
        case 'no':
          return dir * (a.noCount - b.noCount);
        case 'firstTry': {
          const toNum = (v: boolean | null | undefined) => (v === true ? 1 : v === false ? 0 : -1);
          return dir * (toNum(a.firstTrySuccess) - toNum(b.firstTrySuccess));
        }
        case 'status':
          return dir * ((a.graduated ? 1 : 0) - (b.graduated ? 1 : 0));
        case 'flag': {
          const aFlagged = this.flaggedQuestions.has(a.card.id) ? 1 : 0;
          const bFlagged = this.flaggedQuestions.has(b.card.id) ? 1 : 0;
          return dir * (aFlagged - bFlagged);
        }
        default:
          return 0;
      }
    });
    return rows;
  }

  private goBack(): void {
    if (this.returnUrl) {
      try {
        localStorage.removeItem(RETURN_URL_KEY);
        sessionStorage.removeItem(SS_RETURN_URL);
      } catch { /* ignore */ }
      window.location.href = this.returnUrl;
    } else {
      router.navigate('/');
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  private downloadJson(): void {
    if (!this.stats) return;
    const data = {
      bankName: this.bankName,
      completedAt: new Date().toISOString(),
      summary: {
        totalCards: this.stats.totalCards,
        graduated: this.stats.graduated,
        firstTrySuccessCount: this.stats.firstTrySuccessCount,
        retriedCount: this.stats.retriedCount,
        neverSucceededCount: this.stats.neverSucceededCount,
        totalTimeMs: this.stats.totalTimeMs,
      },
      cards: this.stats.cardDetails.map((d) => ({
        id: d.card.id,
        question: d.card.text,
        answer: d.card.answer,
        yesCount: d.yesCount,
        noCount: d.noCount,
        totalAttempts: d.totalAttempts,
        firstTrySuccess: d.firstTrySuccess,
        graduated: d.graduated,
      })),
    };
    this.triggerDownload(
      JSON.stringify(data, null, 2),
      'application/json',
      `flashcard-stats-${Date.now()}.json`
    );
  }

  private downloadCsv(): void {
    if (!this.stats) return;
    const header = 'id,question,answer,yesCount,noCount,totalAttempts,firstTrySuccess,graduated';
    const rows = this.stats.cardDetails.map((d) => {
      const q = d.card.text.replace(/"/g, '""');
      const a = d.card.answer.replace(/"/g, '""');
      return `"${d.card.id}","${q}","${a}",${d.yesCount},${d.noCount},${d.totalAttempts},${d.firstTrySuccess ?? ''},${d.graduated}`;
    });
    this.triggerDownload(
      [header, ...rows].join('\n'),
      'text/csv',
      `flashcard-stats-${Date.now()}.csv`
    );
  }

  private triggerDownload(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

customElements.define('flashcard-summary-screen', FlashcardSummaryScreen);
