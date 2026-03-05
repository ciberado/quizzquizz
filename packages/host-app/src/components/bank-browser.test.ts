import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QuestionBankFolder } from '../api-client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const flatRoot: QuestionBankFolder = {
  name: '',
  path: '',
  folders: [],
  banks: [
    { id: 'general-knowledge', name: 'General Knowledge', topics: ['General'], questionCount: 10 },
    { id: 'science', name: 'Science Basics', topics: ['Science'], questionCount: 8 },
  ],
};

const nestedRoot: QuestionBankFolder = {
  name: '',
  path: '',
  folders: [
    {
      name: 'science',
      path: 'science',
      folders: [
        {
          name: 'physics',
          path: 'science/physics',
          folders: [],
          banks: [
            { id: 'science/physics/electromagnetism', name: 'Electromagnetism', topics: ['Physics'], questionCount: 12 },
          ],
        },
      ],
      banks: [
        { id: 'science/chemistry', name: 'Chemistry', topics: ['Science'], questionCount: 6 },
      ],
    },
  ],
  banks: [
    { id: 'general-knowledge', name: 'General Knowledge', topics: ['General'], questionCount: 10 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mount a BankBrowser with a pre-loaded tree (bypasses API fetch) */
async function mountBrowser(tree: QuestionBankFolder): Promise<HTMLElement> {
  // Lazy import so customElement registration happens after jsdom is ready
  const { BankBrowser } = await import('./bank-browser');

  const tagName = `qz-bank-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Temporarily define under a unique tag to avoid conflicts between tests
  customElements.define(tagName, class extends BankBrowser {});

  const el = document.createElement(tagName) as InstanceType<typeof BankBrowser>;
  document.body.appendChild(el);

  // Bypass the async API call by setting the tree directly
  (el as any).rootTree = tree;
  (el as any).currentPath = [];
  (el as any).render();

  return el;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('BankBrowser', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('flat layout (no sub-folders)', () => {
    it('renders bank cards for each bank', async () => {
      const el = await mountBrowser(flatRoot);
      const cards = el.querySelectorAll('[data-bank-id]');
      expect(cards).toHaveLength(2);
    });

    it('does NOT render a breadcrumb when root has no sub-folders', async () => {
      const el = await mountBrowser(flatRoot);
      expect(el.querySelector('.bank-browser-breadcrumb')).toBeNull();
    });

    it('displays bank name and question count', async () => {
      const el = await mountBrowser(flatRoot);
      const card = el.querySelector('[data-bank-id="general-knowledge"]') as HTMLElement;
      expect(card).not.toBeNull();
      expect(card.textContent).toContain('General Knowledge');
      expect(card.textContent).toContain('10 questions');
    });

    it('emits bank-selected event with bankId on click', async () => {
      const el = await mountBrowser(flatRoot);
      const received: string[] = [];
      el.addEventListener('bank-selected', (e: Event) => {
        received.push((e as CustomEvent<{ bankId: string }>).detail.bankId);
      });

      const card = el.querySelector('[data-bank-id="science"]') as HTMLElement;
      card.click();
      expect(received).toEqual(['science']);
    });
  });

  describe('nested layout (with sub-folders)', () => {
    it('renders a breadcrumb at root level', async () => {
      const el = await mountBrowser(nestedRoot);
      expect(el.querySelector('.bank-browser-breadcrumb')).not.toBeNull();
    });

    it('renders folder cards and root-level bank cards at root', async () => {
      const el = await mountBrowser(nestedRoot);
      const folderCards = el.querySelectorAll('.bank-browser-folder-card');
      const bankCards = el.querySelectorAll('[data-bank-id]');
      expect(folderCards).toHaveLength(1); // "science" folder
      expect(bankCards).toHaveLength(1);   // "general-knowledge" bank
    });

    it('folder card shows correct bank count', async () => {
      const el = await mountBrowser(nestedRoot);
      const folderCard = el.querySelector('.bank-browser-folder-card') as HTMLElement;
      // science folder has 1 bank + physics subfolder with 1 bank = 2 total
      expect(folderCard.textContent).toContain('2 banks');
    });

    it('clicking folder card descends into that folder', async () => {
      const el = await mountBrowser(nestedRoot);
      const folderCard = el.querySelector('.bank-browser-folder-card') as HTMLElement;
      folderCard.click();

      // Should now be inside "science" — breadcrumb should show it
      const breadcrumb = el.querySelector('.bank-browser-breadcrumb');
      expect(breadcrumb?.textContent).toContain('science');

      // "Chemistry" bank should be visible
      expect(el.querySelector('[data-bank-id="science/chemistry"]')).not.toBeNull();
    });

    it('clicking breadcrumb link navigates back to root', async () => {
      const el = await mountBrowser(nestedRoot);

      // Descend into science
      (el as any).enterFolder('science');
      (el as any).render();

      // Click the "All Banks" breadcrumb (depth 0)
      const rootLink = el.querySelector('.breadcrumb-link[data-depth="0"]') as HTMLButtonElement;
      expect(rootLink).not.toBeNull();
      rootLink.click();

      // Should be back at root — "General Knowledge" bank visible
      expect(el.querySelector('[data-bank-id="general-knowledge"]')).not.toBeNull();
      // And "science" folder card visible again
      expect(el.querySelector('.bank-browser-folder-card')).not.toBeNull();
    });

    it('current folder segment shown as non-clickable span', async () => {
      const el = await mountBrowser(nestedRoot);
      (el as any).enterFolder('science');
      (el as any).render();

      const current = el.querySelector('.breadcrumb-current') as HTMLElement;
      expect(current?.textContent?.trim()).toBe('science');
    });

    it('empty folder shows appropriate message', async () => {
      const rootWithEmptyFolder: QuestionBankFolder = {
        name: '',
        path: '',
        folders: [{ name: 'empty', path: 'empty', folders: [], banks: [] }],
        banks: [],
      };
      const el = await mountBrowser(rootWithEmptyFolder);
      (el as any).enterFolder('empty');
      (el as any).render();
      expect(el.textContent).toContain('No question banks in this folder');
    });

    it('emits bank-selected with path-based id for nested bank', async () => {
      const el = await mountBrowser(nestedRoot);
      const received: string[] = [];
      el.addEventListener('bank-selected', (e: Event) => {
        received.push((e as CustomEvent<{ bankId: string }>).detail.bankId);
      });

      // Descend: science → physics
      (el as any).enterFolder('science');
      (el as any).enterFolder('physics');
      (el as any).render();

      const card = el.querySelector('[data-bank-id="science/physics/electromagnetism"]') as HTMLElement;
      expect(card).not.toBeNull();
      card.click();
      expect(received).toEqual(['science/physics/electromagnetism']);
    });
  });

  describe('countBanks helper', () => {
    it('counts all banks recursively', async () => {
      const { BankBrowser } = await import('./bank-browser');
      const instance = Object.create(BankBrowser.prototype);
      // nestedRoot has 1 root-level bank + science folder (1 chemistry + 1 physics/electromagnetism) = 3
      expect((instance as any).countBanks(nestedRoot)).toBe(3);
    });
  });
});
