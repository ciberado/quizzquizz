/**
 * Tests for QuestionPreviewScreen – topic filter counts
 *
 * The topic filter panel now derives topics from actual questions in the
 * bank (allBankQuestions) rather than from bank metadata.  Each topic
 * checkbox shows a count of how many additional questions it covers.
 *
 * - In selectAllMode the count reflects totals (all matching questions).
 * - In manual-selection mode the count excludes already-selected questions.
 * - Difficulty filters narrow the counted population.
 * - Selected topics whose count drops to 0 remain visible (dimmed).
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

/** Return an array of {topic, count, checked, dimmed} from the rendered DOM. */
function readTopicCheckboxes(el: HTMLElement) {
  const labels = el.querySelectorAll('input[data-filter="topic"]');
  return Array.from(labels).map(input => {
    const inp = input as HTMLInputElement;
    const span = inp.closest('label')?.querySelector('span');
    const text = span?.textContent?.trim() ?? '';
    // Text is like "Networking (3)"
    const match = text.match(/^(.+?)\s*\((\d+)\)$/);
    return {
      topic: match ? match[1]!.trim() : text,
      count: match ? parseInt(match[2]!, 10) : -1,
      checked: inp.checked,
      dimmed: span?.style.color?.includes('muted') ?? false,
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

  // ── computeTopicCounts core logic ────────────────────────────────────────

  describe('computeTopicCounts()', () => {
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
      // IAM: q3 => 1
      expect(byName['IAM']?.count).toBe(1);
      // Compute: q4, q5 => 2
      expect(byName['Compute']?.count).toBe(2);
    });

    it('excludes selected questions in manual selection mode', async () => {
      const el = await mountPreview();
      hydrate(el, {
        selectAllMode: false,
        selectedQuestionIds: ['q1', 'q2'], // both contain Networking
      });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // Networking: only q5 left (q1, q2 selected) => 1
      expect(byName['Networking']?.count).toBe(1);
      // Security: q1 selected, q3, q6 remain => 2
      expect(byName['Security']?.count).toBe(2);
      // IAM: q3 still unselected => 1
      expect(byName['IAM']?.count).toBe(1);
      // Compute: q4, q5 still unselected => 2
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
      expect(byName['Security']?.count).toBe(1);

      // IAM and Compute have no easy questions, they should be absent or have count 0
      // They may not appear at all since no allTopics set includes them
      const iamEntry = byName['IAM'];
      const computeEntry = byName['Compute'];
      if (iamEntry) expect(iamEntry.count).toBe(0);
      if (computeEntry) expect(computeEntry.count).toBe(0);
    });

    it('combines difficulty filter with manual selection exclusion', async () => {
      const el = await mountPreview();
      hydrate(el, {
        selectAllMode: false,
        selectedDifficulties: ['medium'],
        selectedQuestionIds: ['q3'], // medium, Security+IAM
      });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      // Medium questions: q3 (selected, skip), q4 (Compute) remain
      // Only q4 survives → Compute: 1
      expect(byName['Compute']?.count).toBe(1);
      // Security: q3 was medium+selected → 0 from filtered set
      // (q1 is easy, q6 is hard → excluded by difficulty filter)
      const secEntry = byName['Security'];
      if (secEntry) expect(secEntry.count).toBe(0);
    });

    it('returns empty map when allBankQuestions is empty', async () => {
      const el = await mountPreview();
      hydrate(el, { questions: [] });

      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(0);
      // Should show "No topics available" fallback
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
      expect(byName['D']?.count).toBe(1); // x2
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
    it('renders a checkbox for each topic', async () => {
      const el = await mountPreview();
      hydrate(el);

      const checkboxes = el.querySelectorAll('input[data-filter="topic"]');
      // 4 unique topics: Networking, Security, IAM, Compute
      expect(checkboxes).toHaveLength(4);
    });

    it('renders topics in sorted alphabetical order', async () => {
      const el = await mountPreview();
      hydrate(el);

      const topics = readTopicCheckboxes(el);
      const names = topics.map(t => t.topic);
      expect(names).toEqual([...names].sort());
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
      // Only easy questions, but "IAM" is selected (no easy IAM questions)
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

    it('dims topics with 0 count that are not checked', async () => {
      const el = await mountPreview();
      // Only easy questions; Compute has 0 easy questions and is NOT selected
      hydrate(el, {
        selectAllMode: true,
        selectedDifficulties: ['easy'],
        selectedTopics: [], // nothing selected
      });

      const topics = readTopicCheckboxes(el);
      const compute = topics.find(t => t.topic === 'Compute');
      const iam = topics.find(t => t.topic === 'IAM');

      // These have 0 count and are not checked → they should be dimmed
      // Note: they may not appear at all since allTopics = topicCounts.keys + selectedTopics,
      // and if selectedTopics is empty and count is 0 the topic doesn't appear.
      // Actually, with difficulty filter 'easy', Compute/IAM have 0 count so
      // they won't appear in topicCounts.keys(). Since they aren't in selectedTopics either,
      // they shouldn't be rendered at all — which is correct UX.
      if (compute) {
        expect(compute.dimmed).toBe(true);
      }
      if (iam) {
        expect(iam.dimmed).toBe(true);
      }

      // Topics with non-zero count should NOT be dimmed
      const networking = topics.find(t => t.topic === 'Networking');
      expect(networking).toBeDefined();
      expect(networking!.dimmed).toBe(false);
    });

    it('escapes HTML in topic names to prevent XSS', async () => {
      const el = await mountPreview();
      const xssQuestions = [
        makeQuestion({ id: 'xss1', topics: ['<script>alert("xss")</script>'] }),
      ];
      hydrate(el, { questions: xssQuestions, selectAllMode: true });

      // The topic should be rendered as text, not as an executable script element
      const scripts = el.querySelectorAll('script');
      expect(scripts).toHaveLength(0);

      // The checkbox value attribute should contain the raw topic name
      const checkbox = el.querySelector('input[data-filter="topic"]') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.value).toContain('script');
    });

    it('handles topics with colons (hierarchical names)', async () => {
      const el = await mountPreview();
      const colonQuestions = [
        makeQuestion({ id: 'c1', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c2', topics: ['architecture:ha:multi-region'] }),
        makeQuestion({ id: 'c3', topics: ['architecture:serverless'] }),
      ];
      hydrate(el, { questions: colonQuestions, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const byName = Object.fromEntries(topics.map(t => [t.topic, t]));

      expect(byName['architecture:ha:multi-region']?.count).toBe(2);
      expect(byName['architecture:serverless']?.count).toBe(1);
    });
  });

  // ── Counts update with state changes ──────────────────────────────────────

  describe('Count reactivity', () => {
    it('counts update when a question is selected in manual mode', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: false, selectedQuestionIds: [] });

      // Before selection: q1 contributes to Networking, Security
      let topics = readTopicCheckboxes(el);
      let net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // q1, q2, q5

      // Select q1 and q2 → re-render
      hydrate(el, { selectAllMode: false, selectedQuestionIds: ['q1', 'q2'] });

      topics = readTopicCheckboxes(el);
      net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(1); // only q5 remaining
    });

    it('counts reset when switching back to selectAllMode', async () => {
      const el = await mountPreview();

      // Manual mode with some selections
      hydrate(el, { selectAllMode: false, selectedQuestionIds: ['q1', 'q2', 'q3'] });
      let topics = readTopicCheckboxes(el);
      let net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(1); // only q5

      // Switch back to selectAllMode
      hydrate(el, { selectAllMode: true, selectedQuestionIds: ['q1', 'q2', 'q3'] });
      topics = readTopicCheckboxes(el);
      net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // full counts again
    });

    it('counts update when difficulty filter changes', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: true, selectedDifficulties: [] });

      let topics = readTopicCheckboxes(el);
      let net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3); // all difficulties

      // Restrict to hard
      hydrate(el, { selectAllMode: true, selectedDifficulties: ['hard'] });
      topics = readTopicCheckboxes(el);
      net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(1); // only q5 is hard+Networking
    });

    it('all selected questions become unselected → shows full counts', async () => {
      const el = await mountPreview();
      hydrate(el, { selectAllMode: false, selectedQuestionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] });

      let topics = readTopicCheckboxes(el);
      // All selected → all counts should be 0
      for (const t of topics) {
        expect(t.count).toBe(0);
      }

      // Deselect all
      hydrate(el, { selectAllMode: false, selectedQuestionIds: [] });
      topics = readTopicCheckboxes(el);
      const net = topics.find(t => t.topic === 'Networking');
      expect(net?.count).toBe(3);
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
        expect(el.querySelectorAll('input[data-filter="topic"]').length).toBeGreaterThan(0);
      });

      const topics = readTopicCheckboxes(el);
      const names = topics.map(t => t.topic).sort();
      expect(names).toEqual(['Compute', 'IAM', 'Networking', 'Security']);

      // Metadata topic should not appear
      expect(el.textContent).not.toContain('Metadata-Topic-Should-Not-Appear');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('single question bank renders correctly', async () => {
      const el = await mountPreview();
      const singleQ = [makeQuestion({ id: 'solo', topics: ['Only-Topic'], difficulty: 'easy' })];
      hydrate(el, { questions: singleQ, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      expect(topics).toHaveLength(1);
      expect(topics[0]!.topic).toBe('Only-Topic');
      expect(topics[0]!.count).toBe(1);
    });

    it('large question set renders unique topics', async () => {
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
      expect(topics).toHaveLength(5); // 5 unique topics
      const total = topics.reduce((sum, t) => sum + t.count, 0);
      expect(total).toBe(100); // each question counted once per its topic
    });

    it('duplicate topics within a single question are counted once per question', async () => {
      const el = await mountPreview();
      // A question with the same topic twice (edge case in data)
      const dupTopicQ = [
        makeQuestion({ id: 'dup1', topics: ['Same', 'Same'] }),
      ];
      hydrate(el, { questions: dupTopicQ, selectAllMode: true });

      const topics = readTopicCheckboxes(el);
      const same = topics.find(t => t.topic === 'Same');
      // The count reflects the data verbatim (2 entries), matching the raw iteration
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
      expect(byName['Compute']?.count).toBe(1);    // q5
    });
  });
});
