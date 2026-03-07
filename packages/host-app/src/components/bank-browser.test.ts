import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { QuestionBankFolder } from '../api-client';

// Mock the router so navigate() doesn't manipulate window.location.hash
// or trigger the app-level routing during unit tests.
vi.mock('../router', () => ({
  router: { navigate: vi.fn() },
}));

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
async function mountBrowser(tree: QuestionBankFolder, path: string[] = []): Promise<HTMLElement> {
  // Lazy import so customElement registration happens after jsdom is ready
  const { BankBrowser } = await import('./bank-browser');

  const tagName = `qz-bank-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Temporarily define under a unique tag to avoid conflicts between tests
  customElements.define(tagName, class extends BankBrowser {});

  const el = document.createElement(tagName) as InstanceType<typeof BankBrowser>;
  document.body.appendChild(el);

  // Bypass the async API call by setting the tree directly
  (el as any).rootTree = tree;
  (el as any).currentPath = path;
  (el as any).render();

  return el;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('BankBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it('clicking folder card calls router.navigate with encoded folder path', async () => {
      const { router } = await import('../router');
      const el = await mountBrowser(nestedRoot);
      const folderCard = el.querySelector('.bank-browser-folder-card') as HTMLElement;
      folderCard.click();
      expect(router.navigate).toHaveBeenCalledWith('/create?folder=science');
    });

    it('clicking breadcrumb link calls router.navigate for that depth', async () => {
      const { router } = await import('../router');
      // Mount already at science level
      const el = await mountBrowser(nestedRoot, ['science']);

      // "All Banks" breadcrumb button (depth 0) navigates to root
      const rootLink = el.querySelector('.breadcrumb-link[data-depth="0"]') as HTMLButtonElement;
      expect(rootLink).not.toBeNull();
      rootLink.click();
      expect(router.navigate).toHaveBeenCalledWith('/create');
    });

    it('current folder segment shown as non-clickable span', async () => {
      const el = await mountBrowser(nestedRoot, ['science']);
      const current = el.querySelector('.breadcrumb-current') as HTMLElement;
      expect(current?.textContent?.trim()).toBe('science');
    });

    it('renders chemistry bank and physics subfolder when at science level', async () => {
      const el = await mountBrowser(nestedRoot, ['science']);
      expect(el.querySelector('[data-bank-id="science/chemistry"]')).not.toBeNull();
      expect(el.querySelector('.bank-browser-folder-card')).not.toBeNull();
    });

    it('empty folder shows appropriate message', async () => {
      const rootWithEmptyFolder: QuestionBankFolder = {
        name: '',
        path: '',
        folders: [{ name: 'empty', path: 'empty', folders: [], banks: [] }],
        banks: [],
      };
      const el = await mountBrowser(rootWithEmptyFolder, ['empty']);
      expect(el.textContent).toContain('No question banks in this folder');
    });

    it('emits bank-selected with path-based id for nested bank', async () => {
      // Mount at science/physics level directly
      const el = await mountBrowser(nestedRoot, ['science', 'physics']);
      const received: string[] = [];
      el.addEventListener('bank-selected', (e: Event) => {
        received.push((e as CustomEvent<{ bankId: string }>).detail.bankId);
      });

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

  describe('hash navigation helpers', () => {
    it('hashForPath returns /create for empty path', async () => {
      const { BankBrowser } = await import('./bank-browser');
      const instance = Object.create(BankBrowser.prototype);
      expect((instance as any).hashForPath([])).toBe('/create');
    });

    it('hashForPath encodes path segments', async () => {
      const { BankBrowser } = await import('./bank-browser');
      const instance = Object.create(BankBrowser.prototype);
      expect((instance as any).hashForPath(['science', 'physics'])).toBe('/create?folder=science%2Fphysics');
    });

    it('readPathFromHash returns [] when no folder param', async () => {
      window.location.hash = '#/create';
      const { BankBrowser } = await import('./bank-browser');
      const instance = Object.create(BankBrowser.prototype);
      expect((instance as any).readPathFromHash()).toEqual([]);
    });

    it('readPathFromHash parses folder param correctly', async () => {
      window.location.hash = '#/create?folder=science%2Fphysics';
      const { BankBrowser } = await import('./bank-browser');
      const instance = Object.create(BankBrowser.prototype);
      expect((instance as any).readPathFromHash()).toEqual(['science', 'physics']);
    });

    it('enterFolder calls router.navigate with appended segment', async () => {
      const { router } = await import('../router');
      const el = await mountBrowser(nestedRoot, ['science']);
      (el as any).enterFolder('physics');
      expect(router.navigate).toHaveBeenCalledWith('/create?folder=science%2Fphysics');
    });

    it('navigateTo(0) from nested path calls router.navigate with root hash', async () => {
      const { router } = await import('../router');
      const el = await mountBrowser(nestedRoot, ['science', 'physics']);
      (el as any).navigateTo(0);
      expect(router.navigate).toHaveBeenCalledWith('/create');
    });

    it('navigateTo(1) from depth-2 path navigates to first segment', async () => {
      const { router } = await import('../router');
      const el = await mountBrowser(nestedRoot, ['science', 'physics']);
      (el as any).navigateTo(1);
      expect(router.navigate).toHaveBeenCalledWith('/create?folder=science');
    });
  });

  describe('validatedPath helper', () => {
    it('returns full path when all segments are valid', async () => {
      const el = await mountBrowser(nestedRoot);
      const valid = (el as any).validatedPath(['science', 'physics']);
      expect(valid).toEqual(['science', 'physics']);
    });

    it('truncates at first unknown segment', async () => {
      const el = await mountBrowser(nestedRoot);
      const valid = (el as any).validatedPath(['science', 'does-not-exist']);
      expect(valid).toEqual(['science']);
    });

    it('returns [] when first segment is unknown', async () => {
      const el = await mountBrowser(nestedRoot);
      const valid = (el as any).validatedPath(['unknown']);
      expect(valid).toEqual([]);
    });
  });

  describe('clearBankTreeCache', () => {
    it('is exported and callable without error', async () => {
      const { clearBankTreeCache } = await import('./bank-browser');
      expect(() => clearBankTreeCache()).not.toThrow();
    });
  });
});
