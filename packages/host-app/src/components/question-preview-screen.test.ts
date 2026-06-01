/**
 * Tests for QuestionPreviewScreen – topic filter counts
 *
 * The topic filter panel derives topics from actual questions in the bank
 * (allBankQuestions) rather than from bank metadata.  Each topic checkbox
 * shows a count of how many questions it covers.
 *
 * - Counts always reflect totals (difficulty-filtered), regardless of
 *   select-all vs manual selection mode.
 * - Difficulty filters narrow the counted population.
 * - All topics appear as leaf nodes — there is never an "Others" bucket.
 * - Selected topics whose count drops to 0 remain visible (dimmed).
 * - The topics panel is collapsed by default; clicking the header toggles it.
 * - Tree node expansion/collapse uses direct DOM toggling (no full re-render).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Question, Difficulty } from '@quizzquizz/common';

// ── Hoist mocks ──────────────────────────────────────────────────────────────
const { mockNavigate, mockGetBankDetails, mockGetBankQuestions } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetBankDetails: vi.fn(),
  mockGetBankQuestions: vi.fn(),
}));

vi.mock('../router', () => ({ router: { navigate: mockNavigate } }));
vi.mock('../error-handler', () => ({
  handleApiError: vi.fn(),
  getErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('../state', () => ({
  state: {
    getState: vi.fn(() => ({
      sessionId: null,
      hostToken: 'host-tok',
      pin: null,
      questionBankId: null,
    })),
  },
}));
vi.mock('../api-client', () => ({
  api: {
    getQuestionBankDetails: mockGetBankDetails,
    getQuestionBankQuestions: mockGetBankQuestions,
    createSession: vi.fn().mockResolvedValue({ id: 'sess-1', pin: '123456' }),
  },
  cancelAllRequests: vi.fn(),
}));

// Import after mocks
import './question-preview-screen';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
  return {
    text: `Question ${overrides.id}`,
    answers: [
      { id: 'a1', text: 'Answer A' },
      { id: 'a2', text: 'Answer B' },
    ],
    correctAnswerIds: ['a1'],
    difficulty: 'medium',
    topics: [],
    tags: [],
    status: 'active',
    ...overrides,
  };
}

const QUESTIONS: Question[] = [
  makeQuestion({ id: 'q1', difficulty: 'easy', topics: ['Networking', 'Security'] }),
  makeQuestion({ id: 'q2', difficulty: 'easy', topics: ['Networking'] }),
  makeQuestion({ id: 'q3', difficulty: 'medium', topics: ['Security', 'IAM'] }),
  makeQuestion({ id: 'q4', difficulty: 'medium', topics: ['Compute'] }),
  makeQuestion({ id: 'q5', difficulty: 'hard', topics: ['Networking', 'Compute'] }),
  makeQuestion({ id: 'q6', difficulty: 'hard', topics: ['Security'] }),
  makeQuestion({ id: 'q7', difficulty: 'medium', topics: ['IAM'] }),
];

function makeBankDetailsResponse(questions: Question[] = QUESTIONS) {
  return {
    id: 'test-bank',
    metadata: {
      name: 'Test Bank',
      description: 'A test bank',
      topics: ['Metadata-Topic-Should-Not-Appear'],
      defaultTimeLimit: 20,
    },
    questions,
  };
}

function makeQuestionsResponse(questions: Question[], page = 1, limit = 10) {
  return {
    questions: questions.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      totalQuestions: questions.length,
      totalPages: Math.ceil(questions.length / limit),
      hasNextPage: page * limit < questions.length,
      hasPrevPage: page > 1,
    },
    filters: { difficulty: null, topic: null, tag: null },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TAG = `qz-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;

let registered = false;

async function mountPreview(): Promise<HTMLElement> {
  if (!registered) {
    const { QuestionPreviewScreen } = await import('./question-preview-screen');
    customElements.define(TAG, class extends QuestionPreviewScreen {});
    registered = true;
  }

  const el = document.createElement(TAG);
  document.body.appendChild(el);
  return el;
}

/** Set the private fields directly and call render() to avoid async API flow. */
function hydrate(
  el: HTMLElement,
  opts: {
    questions?: Question[];
    page?: number;
    limit?: number;
    selectAllMode?: boolean;
    selectedQuestionIds?: string[];
    selectedDifficulties?: Difficulty[];
    selectedTopics?: string[];
  } = {},
) {
  const questions = opts.questions ?? QUESTIONS;
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 10;

  (el as any).bankId = 'test-bank';
  (el as any).bank = {
    id: 'test-bank',
    name: 'Test Bank',
    description: 'A test bank',
    topics: ['Metadata-Topic-Should-Not-Appear'],
    questionCount: questions.length,
  };
  (el as any).allBankQuestions = questions;
  (el as any).preview = makeQuestionsResponse(questions, page, limit);

  if (opts.selectAllMode !== undefined) {
    (el as any).selectAllMode = opts.selectAllMode;
  }
  if (opts.selectedQuestionIds) {
    (el as any).selectedQuestionIds = new Set(opts.selectedQuestionIds);
  }
  if (opts.selectedDifficulties) {
    (el as any).selectedDifficulties = new Set(opts.selectedDifficulties);
  }
  if (opts.selectedTopics) {
    (el as any).selectedTopics = new Set(opts.selectedTopics);
  }

  (el as any).render();
}

/**
 * Read all visible topic-node checkboxes from the rendered tree.
 * Returns { path, label, count, checked, indeterminate } for each visible node.
 * Nodes inside a `hidden` ancestor are excluded (collapsed subtrees).
 */
function readTopicCheckboxes(el: HTMLElement) {
  const checkboxes = el.querySelectorAll('input[data-filter="topic-node"]');
  return Array.from(checkboxes)
    .filter(input => {
      // Exclude nodes whose closest [data-tree-children] ancestor is hidden
      let ancestor = input.parentElement;
      while (ancestor && ancestor !== el) {
        if (ancestor.hasAttribute('data-tree-children') && ancestor.hasAttribute('hidden')) {
          return false;
        }
        ancestor = ancestor.parentElement;
      }
      return true;
    })
    .map(input => {
      const inp = input as HTMLInputElement;
      const label = inp.closest('label');
      const span = label?.querySelector('span');
      const small = label?.querySelector('small');
      const labelText = span?.textContent?.trim() ?? '';
      const countMatch = small?.textContent?.trim().match(/\((\d+)\)/);
      const count = countMatch ? parseInt(countMatch[1]!, 10) : -1;
      return {
        topic: labelText,
        path: inp.dataset['nodePath'] ?? '',
        count,
        checked: inp.checked,
        indeterminate: inp.dataset['indeterminate'] === 'true',
      };
    });
}

/** Return an array of {difficulty, count} from the rendered DOM. */
function readDifficultyCheckboxes(el: HTMLElement) {
  const labels = el.querySelectorAll('input[data-filter="difficulty"]');
  return Array.from(labels).map(input => {
    const inp = input as HTMLInputElement;
    const span = inp.closest('label')?.querySelector('span');
    const text = span?.textContent?.trim() ?? '';
    const match = text.match(/^(.+?)\s*\((\d+)\)$/);
    return {
      difficulty: match ? match[1]!.trim() : text,
      count: match ? parseInt(match[2]!, 10) : -1,
      checked: inp.checked,
    };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('QuestionPreviewScreen — Topic Filter Counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#/preview/test-bank';

    // Default API mocks
    mockGetBankDetails.mockResolvedValue(makeBankDetailsResponse());
    mockGetBankQuestions.mockResolvedValue(makeQuestionsResponse(QUESTIONS));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── Topic tree node counts ────────────────────────────────────────────────

  describe('Topic tree node counts', () => {
    it('counts all topics from actual questions, not bank metadata', async () => {
      const el = await mountPreview();
      hydrate(el);

      const topics = readTopicCheckboxes(el);
      const topicNames = topics.map(t => t.topic).sort();

      // Should contain actual question topics, NOT "Metadata-Topic-Should-Not-Appear"
      expect(topicNames).toContain('Networking');
      expect(topicNames).toContain('Security');
      expect(topicNames).toContain('IAM');
      expect(topicNames).toContain('Compute');
      expect(topicNames).not.toContain('Metadata-Topic-Should-Not-Appear');
    });

    it('shows correct total counts in selectAllMode', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // Networking: q1, q2, q5 => 3
      expect(byName['Networking']?.count).toBe(3);
      // Security: q1, q3, q6 => 3
      expect(byName['Security']?.count).toBe(3);
      // IAM: q3, q7 => 2
      expect(byName['IAM']?.count).toBe(2);
      // Compute: q4, q5 => 2
      expect(byName['Compute']?.count).toBe(2);
    });

    it('shows same totals in manual selection mode (no exclusion)', async () => {
      const el = await mountPreview();
      hydrate(el, {
        selectAllMode: false,
        selectedQuestionIds: ['q1', 'q2'], // both contain Networking
      });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // Tree always shows absolute totals regardless of selection mode
      expect(byName['Networking']?.count).toBe(3);
      expect(byName['Security']?.count).toBe(3);
      expect(byName['IAM']?.count).toBe(2);
      expect(byName['Compute']?.count).toBe(2);
    });

    it('always shows absolute counts (no + prefix) even when topics are selected', async () => {
      const el = await mountPreview();
      hydrate(el, { selectedTopics: ['Networking'] });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // All counts are absolute — the tree does not subtract "already covered" questions
      expect(byName['Networking']?.count).toBe(3);
      expect(byName['Security']?.count).toBe(3);
      expect(byName['IAM']?.count).toBe(2);
      expect(byName['Compute']?.count).toBe(2);
    });

    it('filters counts by active difficulty', async () => {
      const el = await mountPreview();
      hydrate(el, {
        selectAllMode: true,
        selectedDifficulties: ['easy'],
      });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // Only easy questions: q1 (Networking, Security), q2 (Networking)
      expect(byName['Networking']?.count).toBe(2);
      // Security has 1 easy question (q1) — it still appears as a leaf node
      expect(byName['Security']?.count).toBe(1);
      // No "Others" bucket in the tree
      expect(byName['Others']).toBeUndefined();
    });

    it('returns empty tree when allBankQuestions is empty', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: [] });

      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(0);
      expect(el.textContent).toContain('No topics available');
    });

    it('handles questions with multiple topics correctly', async () => {
      const el = await mountPreview();
      const multi = [
        makeQuestion({ id: 'x1', topics: ['A', 'B', 'C'] }),
        makeQuestion({ id: 'x2', topics: ['B', 'C', 'D'] }),
        makeQuestion({ id: 'x3', topics: ['A'] }),
      ];
      hydrate(el, { questions: multi, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      expect(byName['A']?.count).toBe(2); // x1, x3
      expect(byName['B']?.count).toBe(2); // x1, x2
      expect(byName['C']?.count).toBe(2); // x1, x2
      // D has only 1 question — it still appears as a leaf node (no Others merging)
      expect(byName['D']?.count).toBe(1);
      expect(byName['Others']).toBeUndefined();
    });

    it('handles questions with no topics', async () => {
      const el = await mountPreview();
      const noTopics = [
        makeQuestion({ id: 'nt1', topics: [] }),
        makeQuestion({ id: 'nt2', topics: [] }),
      ];
      hydrate(el, { questions: noTopics, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(0);
      expect(el.textContent).toContain('No topics available');
    });
  });

  // ── Topic filter rendering ────────────────────────────────────────────────

  describe('Topic filter rendering', () => {
    it('renders a node for each root-level topic', async () => {
      const el = await mountPreview();
      hydrate(el);

      // 4 flat topics (no colons): Compute, IAM, Networking, Security
      const checkboxes = el.querySelectorAll('input[data-filter="topic-node"]');
      expect(checkboxes).toHaveLength(4);
    });

    it('renders topics in sorted alphabetical order', async () => {
      const el = await mountPreview();
      const qs = [
        makeQuestion({ id: 'a1', topics: ['Zeta'] }),
        makeQuestion({ id: 'a2', topics: ['Zeta'] }),
        makeQuestion({ id: 'a3', topics: ['Alpha'] }),
        makeQuestion({ id: 'a4', topics: ['Alpha'] }),
        makeQuestion({ id: 'a5', topics: ['Rare'] }), // 1 question — still a leaf node, no Others
      ];
      hydrate(el, { questions: qs });

      const topics = readTopicCheckboxes(el);
      const names = topics.map(t => t.topic);
      expect(names).toEqual(['Alpha', 'Rare', 'Zeta']);
    });

    it('preserves checked state for selected topics', async () => {
      const el = await mountPreview();
      hydrate(el, { selectedTopics: ['Security', 'IAM'] });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      expect(byName['Security']?.checked).toBe(true);
      expect(byName['IAM']?.checked).toBe(true);
      expect(byName['Networking']?.checked).toBe(false);
      expect(byName['Compute']?.checked).toBe(false);
    });

    it('keeps selected topics visible even when count is 0', async () => {
      const el = await mountPreview();
      // Only easy questions, but "IAM" is selected (no easy IAM questions → count 0)
      hydrate(el, {
        selectAllMode: true,
        selectedDifficulties: ['easy'],
        selectedTopics: ['IAM'],
      });

      const topics = readTopicCheckboxes(el);
      const iam = topics.find(t => t.topic === 'IAM');

      expect(iam).toBeDefined();
      expect(iam!.count).toBe(0);
      expect(iam!.checked).toBe(true);
    });

    it('escapes HTML in topic names to prevent XSS', async () => {
      const el = await mountPreview();
      const xssQuestions = [
        makeQuestion({ id: 'xss1', topics: ['<script>alert("xss")</script>'] }),
        makeQuestion({ id: 'xss2', topics: ['<script>alert("xss")</script>'] }),
      ];
      hydrate(el, { questions: xssQuestions, selectAllMode: true });

      const scripts = el.querySelectorAll('script');
      expect(scripts).toHaveLength(0);

      const checkbox = el.querySelector('input[data-filter="topic-node"]') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.dataset['nodePath']).toContain('script');
    });

    it('renders hierarchical topics as a collapsed tree — only root node visible initially', async () => {
      const el = await mountPreview();
      const colonQuestions = [
        makeQuestion({ id: 'c1', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c2', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c3', topics: ['architecture:serverless'] }),
        makeQuestion({ id: 'c4', topics: ['architecture:serverless'] }),
      ];
      hydrate(el, { questions: colonQuestions, selectAllMode: true });

      // Only the root "architecture" node is visible (children collapsed by default)
      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(1);
      expect(topics[0]!.topic).toBe('architecture');
      expect(topics[0]!.count).toBe(4); // all 4 questions under this root
    });

    it('shows child nodes when a parent is expanded', async () => {
      const el = await mountPreview();
      const colonQuestions = [
        makeQuestion({ id: 'c1', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c2', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c3', topics: ['architecture:serverless'] }),
        makeQuestion({ id: 'c4', topics: ['architecture:serverless'] }),
      ];
      hydrate(el, { questions: colonQuestions, selectAllMode: true });
      // Manually expand the root node
      (el as any).expandedTopicNodes = new Set(['architecture']);
      (el as any).render();

      const topics = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(topics.map(t => [t.path, t]));

      // Root + two children visible
      expect(byPath['architecture']?.count).toBe(4);
      expect(byPath['architecture:ha']?.count).toBe(2);
      expect(byPath['architecture:serverless']?.count).toBe(2);
    });

    it('shows indeterminate state when only some children are selected', async () => {
      const el = await mountPreview();
      const colonQuestions = [
        makeQuestion({ id: 'c1', topics: ['arch:ha'] }),
        makeQuestion({ id: 'c2', topics: ['arch:ha'] }),
        makeQuestion({ id: 'c3', topics: ['arch:dr'] }),
        makeQuestion({ id: 'c4', topics: ['arch:dr'] }),
      ];
      hydrate(el, { questions: colonQuestions, selectedTopics: ['arch:ha'] });
      (el as any).expandedTopicNodes = new Set(['arch']);
      (el as any).render();

      const topics = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(topics.map(t => [t.path, t]));

      expect(byPath['arch']?.indeterminate).toBe(true);
      expect(byPath['arch:ha']?.checked).toBe(true);
      expect(byPath['arch:dr']?.checked).toBe(false);
    });
  });

  // ── Counts update with state changes ──────────────────────────────────────

  describe('Count reactivity', () => {
    it('counts stay the same when questions are selected in manual mode', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: false, selectedQuestionIds: [] });

      let topics = readTopicCheckboxes(el);
      let net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // q1, q2, q5

      // Select q1 and q2 → re-render — counts are absolute totals, unchanged
      hydrate(el, { selectAllMode: false, selectedQuestionIds: ['q1', 'q2'] });

      topics = readTopicCheckboxes(el);
      net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // still totals
    });

    it('counts always show absolute totals regardless of which topics are selected', async () => {
      const el = await mountPreview();
      hydrate(el);
      let topics = readTopicCheckboxes(el);
      let sec = topics.find(t => t.topic === 'Security');
      expect(sec?.count).toBe(3); // q1, q3, q6

      // Select Networking — Security count stays at its absolute total
      hydrate(el, { selectedTopics: ['Networking'] });
      topics = readTopicCheckboxes(el);
      sec = topics.find(t => t.topic === 'Security');
      expect(sec?.count).toBe(3); // still 3 — tree shows absolutes
    });

    it('counts update when difficulty filter changes', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: true, selectedDifficulties: [] });

      let topics = readTopicCheckboxes(el);
      let net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // all difficulties

      // Restrict to hard — only q5(Networking), q6(Security) remain
      hydrate(el, { selectAllMode: true, selectedDifficulties: ['hard'] });
      topics = readTopicCheckboxes(el);
      net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(1); // only q5
      const compute = topics.find(t => t.topic === 'Compute');
      expect(compute?.count).toBe(1); // only q5
    });
  });

  // ── Difficulty counts ──────────────────────────────────────────────────────

  describe('Difficulty counts', () => {
    it('shows question count next to each difficulty level', async () => {
      const el = await mountPreview();
      hydrate(el);

      const diffs = readDifficultyCheckboxes(el);
      const byName = Object.fromEntries(diffs.map(d => [d.difficulty, d]));

      // easy: q1, q2 => 2
      expect(byName['easy']?.count).toBe(2);
      // medium: q3, q4, q7 => 3
      expect(byName['medium']?.count).toBe(3);
      // hard: q5, q6 => 2
      expect(byName['hard']?.count).toBe(2);
    });

    it('difficulty counts are always raw totals (not filtered)', async () => {
      const el = await mountPreview();
      // Even with a difficulty filter active, counts should show raw totals
      hydrate(el, { selectedDifficulties: ['easy'] });

      const diffs = readDifficultyCheckboxes(el);
      const byName = Object.fromEntries(diffs.map(d => [d.difficulty, d]));

      expect(byName['easy']?.count).toBe(2);
      expect(byName['medium']?.count).toBe(3);
      expect(byName['hard']?.count).toBe(2);
    });

    it('renders all three difficulty options even when bank has no questions for some', async () => {
      const el = await mountPreview();
      const onlyEasy = [
        makeQuestion({ id: 'e1', difficulty: 'easy', topics: ['A'] }),
        makeQuestion({ id: 'e2', difficulty: 'easy', topics: ['A'] }),
      ];
      hydrate(el, { questions: onlyEasy });

      const diffs = readDifficultyCheckboxes(el);
      expect(diffs).toHaveLength(3);
      const byName = Object.fromEntries(diffs.map(d => [d.difficulty, d]));
      expect(byName['easy']?.count).toBe(2);
      expect(byName['medium']?.count).toBe(0);
      expect(byName['hard']?.count).toBe(0);
    });
  });

  // ── Integration: topic filter with API-loaded data flow ───────────────────

  describe('API integration flow', () => {
    it('loadBank populates allBankQuestions from API response', async () => {
      mockGetBankDetails.mockResolvedValueOnce(makeBankDetailsResponse(QUESTIONS));
      mockGetBankQuestions.mockResolvedValueOnce(makeQuestionsResponse(QUESTIONS));

      const el = await mountPreview();

      // Trigger onMount indirectly by waiting for the API promises
      await vi.waitFor(() => {
        expect(mockGetBankDetails).toHaveBeenCalledWith('test-bank');
      });

      // Wait for loadQuestions as well
      await vi.waitFor(() => {
        expect(mockGetBankQuestions).toHaveBeenCalled();
      });

      // After both API calls resolve, allBankQuestions should be populated
      const allQ = (el as any).allBankQuestions as Question[];
      expect(allQ).toHaveLength(QUESTIONS.length);
      expect(allQ.map(q => q.id)).toEqual(QUESTIONS.map(q => q.id));
    });

    it('topic checkboxes reflect actual questions from API, not metadata', async () => {
      mockGetBankDetails.mockResolvedValueOnce(makeBankDetailsResponse(QUESTIONS));
      mockGetBankQuestions.mockResolvedValueOnce(makeQuestionsResponse(QUESTIONS));

      const el = await mountPreview();

      // Wait for render
      await vi.waitFor(() => {
        expect(el.querySelectorAll('input[data-filter="topic-node"]').length).toBeGreaterThan(0);
      });

      const topics = readTopicCheckboxes(el);
      const names = topics.map(t => t.topic).sort();
      // All 4 flat topics appear as leaf nodes
      expect(names).toEqual(['Compute', 'IAM', 'Networking', 'Security']);

      // Metadata topic should not appear
      expect(el.textContent).not.toContain('Metadata-Topic-Should-Not-Appear');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('single question bank shows its topic as a leaf node (no Others merging)', async () => {
      const el = await mountPreview();
      const singleQ = [makeQuestion({ id: 'solo', topics: ['Only-Topic'], difficulty: 'easy' })];
      hydrate(el, { questions: singleQ, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      // In the tree, single-question topics appear as leaf nodes — no Others bucket
      expect(topics).toHaveLength(1);
      expect(topics[0]!.topic).toBe('Only Topic');
      expect(topics[0]!.count).toBe(1);
    });

    it('large question set renders unique grouped topics', async () => {
      const el = await mountPreview();
      const manyQs = Array.from({ length: 100 }, (_, i) =>
        makeQuestion({
          id: `q${i}`,
          topics: [`Topic-${i % 5}`],          // 5 unique topics
          difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
        }),
      );
      hydrate(el, { questions: manyQs, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(5);
      const total = topics.reduce((sum, t) => sum + t.count, 0);
      expect(total).toBe(100);
    });

    it('duplicate topics within a single question are counted once per question', async () => {
      const el = await mountPreview();
      const dupTopicQ = [
        makeQuestion({ id: 'dup1', topics: ['Same', 'Same'] }),
        makeQuestion({ id: 'dup2', topics: ['Same', 'Same'] }),
      ];
      hydrate(el, { questions: dupTopicQ, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const same = topics.find(t => t.topic === 'Same');
      // Tree uses a Set of questionIds — each question is counted once regardless of duplicates
      expect(same?.count).toBe(2);
    });

    it('works with multiple difficulty filters active', async () => {
      const el = await mountPreview();
      hydrate(el, {
        selectAllMode: true,
        selectedDifficulties: ['easy', 'hard'],
      });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // easy: q1(Net,Sec), q2(Net) | hard: q5(Net,Compute), q6(Sec)
      expect(byName['Networking']?.count).toBe(3); // q1, q2, q5
      expect(byName['Security']?.count).toBe(2);   // q1, q6
      // Compute has q5 only (1 question) — still appears as a leaf node in the tree
      expect(byName['Compute']?.count).toBe(1);
      expect(byName['Others']).toBeUndefined();
    });

    it('single-question topics appear as leaf nodes (no Others bucket)', async () => {
      const el = await mountPreview();
      const qs = [
        makeQuestion({ id: 'a1', topics: ['Big'] }),
        makeQuestion({ id: 'a2', topics: ['Big'] }),
        makeQuestion({ id: 'a3', topics: ['Tiny1'] }),
        makeQuestion({ id: 'a4', topics: ['Tiny2'] }),
      ];
      hydrate(el, { questions: qs, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      expect(byName['Big']?.count).toBe(2);
      // Tiny1 and Tiny2 appear as leaf nodes with count=1 each — no Others
      expect(byName['Tiny1']?.count).toBe(1);
      expect(byName['Tiny2']?.count).toBe(1);
      expect(byName['Others']).toBeUndefined();
    });

    it('no Others bucket ever — all topics always appear as leaf nodes', async () => {
      const el = await mountPreview();
      hydrate(el); // default QUESTIONS

      const topics = readTopicCheckboxes(el);
      const others = topics.find(t => t.topic === 'Others');
      expect(others).toBeUndefined();
    });
  });

  // ── Hierarchical tree — deep structure ────────────────────────────────────
  //
  // These tests use a fixture that mirrors the full-stack-engineering.md bank
  // topic structure: 5 root nodes each with 2 children each with 2–3 leaf nodes.
  // The fixture is intentionally smaller (hand-crafted questions) so each test
  // remains fast and deterministic.

  describe('Hierarchical tree — deep structure', () => {
    /**
     * A mini replica of the full-stack-engineering bank topology:
     *
     *   frontend
     *     react
     *       hooks        (fe-hooks-1, fe-hooks-2)
     *       state        (fe-state-1)
     *     css
     *       layout       (fe-layout-1, fe-layout-2)
     *   backend
     *     nodejs
     *       event-loop   (be-el-1, be-el-2)
     *       streams      (be-st-1)
     *     api
     *       rest         (be-rest-1, be-rest-2)
     *       graphql      (be-gql-1)
     *   database
     *     relational
     *       indexing     (db-idx-1, db-idx-2)
     *       normalization(db-nrm-1)
     *     nosql
     *       document     (db-doc-1, db-doc-2)
     *   security
     *     web
     *       xss          (sec-xss-1, sec-xss-2)
     *       csrf         (sec-csrf-1)
     *     crypto
     *       symmetric    (sec-sym-1)
     *       asymmetric   (sec-asym-1)
     *
     * Cross-topic questions:
     *   fe-hooks-2 also tagged security:web:xss  (tests cross-root aggregation)
     *   be-rest-1  also tagged backend:api:graphql (tests sibling leaf sharing)
     */
    const DEEP_QUESTIONS: Question[] = [
      // frontend:react:hooks
      makeQuestion({ id: 'fe-hooks-1', difficulty: 'easy',   topics: ['frontend:react:hooks'] }),
      makeQuestion({ id: 'fe-hooks-2', difficulty: 'medium', topics: ['frontend:react:hooks', 'security:web:xss'] }),
      // frontend:react:state-management
      makeQuestion({ id: 'fe-state-1', difficulty: 'hard',   topics: ['frontend:react:state-management'] }),
      // frontend:css:layout
      makeQuestion({ id: 'fe-layout-1', difficulty: 'easy',  topics: ['frontend:css:layout'] }),
      makeQuestion({ id: 'fe-layout-2', difficulty: 'medium',topics: ['frontend:css:layout'] }),
      // backend:nodejs:event-loop
      makeQuestion({ id: 'be-el-1', difficulty: 'easy',      topics: ['backend:nodejs:event-loop'] }),
      makeQuestion({ id: 'be-el-2', difficulty: 'hard',      topics: ['backend:nodejs:event-loop'] }),
      // backend:nodejs:streams
      makeQuestion({ id: 'be-st-1', difficulty: 'medium',    topics: ['backend:nodejs:streams'] }),
      // backend:api:rest (also counts toward backend:api:graphql via cross-topic)
      makeQuestion({ id: 'be-rest-1', difficulty: 'medium',  topics: ['backend:api:rest', 'backend:api:graphql'] }),
      makeQuestion({ id: 'be-rest-2', difficulty: 'hard',    topics: ['backend:api:rest'] }),
      // backend:api:graphql (exclusive)
      makeQuestion({ id: 'be-gql-1', difficulty: 'hard',     topics: ['backend:api:graphql'] }),
      // database:relational:indexing
      makeQuestion({ id: 'db-idx-1', difficulty: 'easy',     topics: ['database:relational:indexing'] }),
      makeQuestion({ id: 'db-idx-2', difficulty: 'medium',   topics: ['database:relational:indexing'] }),
      // database:relational:normalization
      makeQuestion({ id: 'db-nrm-1', difficulty: 'hard',     topics: ['database:relational:normalization'] }),
      // database:nosql:document
      makeQuestion({ id: 'db-doc-1', difficulty: 'easy',     topics: ['database:nosql:document'] }),
      makeQuestion({ id: 'db-doc-2', difficulty: 'medium',   topics: ['database:nosql:document'] }),
      // security:web:xss (fe-hooks-2 also contributes)
      makeQuestion({ id: 'sec-xss-1', difficulty: 'easy',    topics: ['security:web:xss'] }),
      makeQuestion({ id: 'sec-xss-2', difficulty: 'medium',  topics: ['security:web:xss'] }),
      // security:web:csrf
      makeQuestion({ id: 'sec-csrf-1', difficulty: 'hard',   topics: ['security:web:csrf'] }),
      // security:crypto:symmetric
      makeQuestion({ id: 'sec-sym-1', difficulty: 'easy',    topics: ['security:crypto:symmetric'] }),
      // security:crypto:asymmetric
      makeQuestion({ id: 'sec-asym-1', difficulty: 'medium', topics: ['security:crypto:asymmetric'] }),
    ];

    it('shows only root nodes when all nodes are collapsed', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });

      const visible = readTopicCheckboxes(el);
      const paths = visible.map(t => t.path).sort();
      // Only 3 roots: backend, database, frontend, security
      expect(paths).toEqual(['backend', 'database', 'frontend', 'security']);
    });

    it('parent node count = union of all descendant question IDs', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      // frontend: fe-hooks-1, fe-hooks-2, fe-state-1, fe-layout-1, fe-layout-2 = 5
      expect(byPath['frontend']?.count).toBe(5);
      // backend: be-el-1, be-el-2, be-st-1, be-rest-1, be-rest-2, be-gql-1 = 6
      expect(byPath['backend']?.count).toBe(6);
      // database: db-idx-1, db-idx-2, db-nrm-1, db-doc-1, db-doc-2 = 5
      expect(byPath['database']?.count).toBe(5);
      // security: sec-xss-1, sec-xss-2, sec-csrf-1, fe-hooks-2 (cross-topic), sec-sym-1, sec-asym-1 = 6
      expect(byPath['security']?.count).toBe(6);
    });

    it('expanding one root reveals its children but not grandchildren', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });
      (el as any).expandedTopicNodes = new Set(['frontend']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const paths = visible.map(t => t.path);

      // Root nodes + frontend's children visible; grandchildren still hidden
      expect(paths).toContain('frontend');
      expect(paths).toContain('frontend:react');
      expect(paths).toContain('frontend:css');
      // Grandchildren NOT visible
      expect(paths).not.toContain('frontend:react:hooks');
      expect(paths).not.toContain('frontend:react:state-management');
      expect(paths).not.toContain('frontend:css:layout');
      // Other roots still present
      expect(paths).toContain('backend');
      expect(paths).toContain('database');
      expect(paths).toContain('security');
    });

    it('expanding root and child reveals grandchildren (leaf nodes)', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });
      (el as any).expandedTopicNodes = new Set(['frontend', 'frontend:react']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      expect(byPath['frontend']?.count).toBe(5);
      expect(byPath['frontend:react']?.count).toBe(3); // fe-hooks-1, fe-hooks-2, fe-state-1
      expect(byPath['frontend:react:hooks']?.count).toBe(2);
      expect(byPath['frontend:react:state-management']?.count).toBe(1); // fe-state-1 (topic is state-management but label matches)
      // css branch still collapsed at grandchild level
      expect(byPath['frontend:css']).toBeDefined();
      expect(byPath['frontend:css:layout']).toBeUndefined();
    });

    it('cross-topic question is counted in both parent branches', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });
      // Expand all roots and their children so leaves are visible
      (el as any).expandedTopicNodes = new Set([
        'frontend', 'frontend:react', 'frontend:css',
        'security', 'security:web',
      ]);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      // fe-hooks-2 has topics: frontend:react:hooks AND security:web:xss
      // So security:web:xss count = sec-xss-1 + sec-xss-2 + fe-hooks-2 = 3
      expect(byPath['security:web']?.count).toBe(4); // sec-xss-1, sec-xss-2, sec-csrf-1, fe-hooks-2
    });

    it('intermediate node count is deduplicated (Set semantics)', async () => {
      const el = await mountPreview();
      // be-rest-1 has BOTH backend:api:rest AND backend:api:graphql
      // backend:api should count it only once
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });
      (el as any).expandedTopicNodes = new Set(['backend', 'backend:api']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      // backend:api:rest = be-rest-1, be-rest-2 (2)
      // backend:api:graphql = be-rest-1, be-gql-1 (2, be-rest-1 shared)
      // backend:api (parent) = be-rest-1 + be-rest-2 + be-gql-1 = 3 (deduplicated)
      expect(byPath['backend:api']?.count).toBe(3);
    });

    it('selecting a leaf topic marks only that leaf as checked', async () => {
      const el = await mountPreview();
      hydrate(el, {
        questions: DEEP_QUESTIONS,
        selectedTopics: ['frontend:react:hooks'],
      });
      (el as any).expandedTopicNodes = new Set(['frontend', 'frontend:react']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      expect(byPath['frontend:react:hooks']?.checked).toBe(true);
      expect(byPath['frontend:react:state-management']?.checked).toBe(false);
      expect(byPath['frontend:css']?.checked).toBe(false);
    });

    it('parent is indeterminate when only some children are selected', async () => {
      const el = await mountPreview();
      // Only hooks selected out of [hooks, state-management]
      hydrate(el, {
        questions: DEEP_QUESTIONS,
        selectedTopics: ['frontend:react:hooks'],
      });
      (el as any).expandedTopicNodes = new Set(['frontend', 'frontend:react']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      expect(byPath['frontend:react']?.indeterminate).toBe(true);
      expect(byPath['frontend:react']?.checked).toBe(false);
    });

    it('root is indeterminate when a descendant but not all leaves are selected', async () => {
      const el = await mountPreview();
      hydrate(el, {
        questions: DEEP_QUESTIONS,
        selectedTopics: ['frontend:react:hooks'],
      });
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      // frontend has 3 leaf topics; only 1 selected → indeterminate
      expect(byPath['frontend']?.indeterminate).toBe(true);
      expect(byPath['frontend']?.checked).toBe(false);
    });

    it('parent is checked (not indeterminate) when ALL its leaves are selected', async () => {
      const el = await mountPreview();
      // Select all three leaves under frontend:react
      hydrate(el, {
        questions: DEEP_QUESTIONS,
        selectedTopics: ['frontend:react:hooks', 'frontend:react:state-management'],
      });
      (el as any).expandedTopicNodes = new Set(['frontend', 'frontend:react']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      expect(byPath['frontend:react']?.checked).toBe(true);
      expect(byPath['frontend:react']?.indeterminate).toBe(false);
    });

    it('difficulty filter narrows leaf counts but does not remove nodes with selections', async () => {
      const el = await mountPreview();
      // backend:nodejs:streams has only 1 medium question (be-st-1)
      // With hard filter active it has 0, but we select it — must stay visible
      hydrate(el, {
        questions: DEEP_QUESTIONS,
        selectAllMode: true,
        selectedDifficulties: ['hard'],
        selectedTopics: ['backend:nodejs:streams'],
      });
      (el as any).expandedTopicNodes = new Set(['backend', 'backend:nodejs']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      const byPath = Object.fromEntries(visible.map(t => [t.path, t]));

      expect(byPath['backend:nodejs:streams']).toBeDefined();
      expect(byPath['backend:nodejs:streams']?.count).toBe(0);
      expect(byPath['backend:nodejs:streams']?.checked).toBe(true);
      // event-loop has 1 hard question (be-el-2) → count 1
      expect(byPath['backend:nodejs:event-loop']?.count).toBe(1);
    });

    it('topics panel is collapsed by default (topicsExpanded = false)', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS });

      const panel = el.querySelector('[data-topics-panel]');
      expect(panel).not.toBeNull();
      expect(panel!.hasAttribute('hidden')).toBe(true);

      expect((el as any).topicsExpanded).toBe(false);
    });

    it('topics panel toggle button shows collapsed arrow by default', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS });

      const arrow = el.querySelector('[data-topics-arrow]');
      expect(arrow).not.toBeNull();
      expect(arrow!.textContent).toBe('▶');
    });

    it('clicking the topics toggle button expands the panel without re-rendering the whole page', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS });

      const btn = el.querySelector('[data-action="toggle-topics-panel"]') as HTMLElement;
      expect(btn).not.toBeNull();

      // Capture references to DOM nodes before click
      const panelBefore = el.querySelector('[data-topics-panel]');
      btn.click();

      // Same element should still be in the DOM (no full re-render)
      const panelAfter = el.querySelector('[data-topics-panel]');
      expect(panelAfter).toBe(panelBefore); // identity equality = same node
      expect(panelAfter!.hasAttribute('hidden')).toBe(false);

      const arrow = el.querySelector('[data-topics-arrow]');
      expect(arrow!.textContent).toBe('▼');

      expect((el as any).topicsExpanded).toBe(true);
    });

    it('clicking the topics toggle again collapses the panel', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS });
      (el as any).topicsExpanded = true;
      (el as any).render();

      const btn = el.querySelector('[data-action="toggle-topics-panel"]') as HTMLElement;
      btn.click();

      const panel = el.querySelector('[data-topics-panel]');
      expect(panel!.hasAttribute('hidden')).toBe(true);
      expect((el as any).topicsExpanded).toBe(false);
    });

    it('expanding a tree node toggles its children without replacing the panel DOM', async () => {
      const el = await mountPreview();
      // Open the topics panel so children are queryable
      (el as any).topicsExpanded = true;
      hydrate(el, { questions: DEEP_QUESTIONS });

      // Capture reference to the toggle button for 'frontend'
      const toggleBtn = el.querySelector('[data-action="toggle-tree-node"][data-node-path="frontend"]') as HTMLElement;
      expect(toggleBtn).not.toBeNull();

      const childrenContainerBefore = el.querySelector('[data-tree-children="frontend"]');
      expect(childrenContainerBefore).not.toBeNull();
      expect(childrenContainerBefore!.hasAttribute('hidden')).toBe(true);

      toggleBtn.click();

      // Same container — no full re-render
      const childrenContainerAfter = el.querySelector('[data-tree-children="frontend"]');
      expect(childrenContainerAfter).toBe(childrenContainerBefore);
      expect(childrenContainerAfter!.hasAttribute('hidden')).toBe(false);

      expect((el as any).expandedTopicNodes.has('frontend')).toBe(true);
    });

    it('collapsing a tree node hides its children subtree', async () => {
      const el = await mountPreview();
      (el as any).topicsExpanded = true;
      (el as any).expandedTopicNodes = new Set(['frontend']);
      hydrate(el, { questions: DEEP_QUESTIONS });

      const toggleBtn = el.querySelector('[data-action="toggle-tree-node"][data-node-path="frontend"]') as HTMLElement;
      toggleBtn.click();

      const childrenContainer = el.querySelector('[data-tree-children="frontend"]');
      expect(childrenContainer!.hasAttribute('hidden')).toBe(true);
      expect((el as any).expandedTopicNodes.has('frontend')).toBe(false);
    });

    it('expanding two separate roots keeps each expansion independent', async () => {
      const el = await mountPreview();
      (el as any).topicsExpanded = true;
      hydrate(el, { questions: DEEP_QUESTIONS });

      const frontendBtn = el.querySelector('[data-action="toggle-tree-node"][data-node-path="frontend"]') as HTMLElement;
      const backendBtn  = el.querySelector('[data-action="toggle-tree-node"][data-node-path="backend"]')  as HTMLElement;
      frontendBtn.click();
      backendBtn.click();

      expect(el.querySelector('[data-tree-children="frontend"]')!.hasAttribute('hidden')).toBe(false);
      expect(el.querySelector('[data-tree-children="backend"]')!.hasAttribute('hidden')).toBe(false);
      // database still collapsed
      expect(el.querySelector('[data-tree-children="database"]')!.hasAttribute('hidden')).toBe(true);
    });

    it('sorting is alphabetical at every depth level', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: DEEP_QUESTIONS, selectAllMode: true });
      (el as any).expandedTopicNodes = new Set(['backend', 'backend:api', 'backend:nodejs']);
      (el as any).render();

      const visible = readTopicCheckboxes(el);
      // Extract just the backend subtree paths in DOM order
      const backendPaths = visible
        .map(t => t.path)
        .filter(p => p.startsWith('backend'));

      expect(backendPaths).toEqual([
        'backend',
        'backend:api',
        'backend:api:graphql',
        'backend:api:rest',
        'backend:nodejs',
        'backend:nodejs:event-loop',
        'backend:nodejs:streams',
      ]);
    });

    /**
     * Regression test: clicking node X's toggle must reveal X's children only.
     * Previously, clicking node A revealed the NEXT SIBLING's (node B's) children
     * instead of A's own children.
     */
    it('clicking a node reveals ITS OWN children, not a sibling (regression)', async () => {
      const el = await mountPreview();
      (el as any).topicsExpanded = true;
      hydrate(el, { questions: DEEP_QUESTIONS });

      // All root nodes in alphabetical order: backend, database, frontend, security
      const roots = ['backend', 'database', 'frontend', 'security'];

      // For each root: click its toggle and assert that ONLY that root's children
      // become visible — all other roots must remain collapsed.
      for (const root of roots) {
        // Reset to all-collapsed before each check
        (el as any).expandedTopicNodes = new Set();
        (el as any).render();

        const btn = el.querySelector(
          `[data-action="toggle-tree-node"][data-node-path="${root}"]`,
        ) as HTMLElement;
        expect(btn).not.toBeNull();
        btn.click();

        for (const other of roots) {
          const container = el.querySelector(`[data-tree-children="${other}"]`);
          expect(container).not.toBeNull();
          if (other === root) {
            expect(container!.hasAttribute('hidden')).toBe(false);
          } else {
            expect(container!.hasAttribute('hidden')).toBe(true);
          }
        }
      }
    });
  });
});
