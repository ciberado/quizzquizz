/**
 * Component tests for flashcard-app screens.
 * Tests cover the play screen logic and summary screen rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeitnerEngine } from './leitner';
import type { FlashCard } from './leitner';

// =========================================================================
// Mock the API client so tests don't hit the network
// =========================================================================
vi.mock('./api-client', () => ({
  api: {
    joinSession: vi.fn(),
    getFlashcardState: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

vi.mock('./state', () => ({
  state: {
    sessionId: null,
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('./router', () => ({
  router: {
    navigate: vi.fn(),
    on: vi.fn(),
    getCurrentPath: vi.fn(() => '/'),
  },
}));

// =========================================================================
// Test: Leitner integration with play-screen logic
// =========================================================================

function makeCard(id: string): FlashCard {
  return {
    id,
    text: `Question ${id}`,
    answer: `Answer ${id}`,
    correctAnswerIds: [`${id}-correct`],
    allAnswers: [
      { id: `${id}-correct`, text: `Answer ${id}` },
      { id: `${id}-wrong`, text: `Wrong ${id}` },
    ],
  };
}

describe('FlashcardPlayScreen logic (via LeitnerEngine)', () => {
  let engine: LeitnerEngine;

  beforeEach(() => {
    engine = new LeitnerEngine([makeCard('c1'), makeCard('c2'), makeCard('c3')]);
  });

  it('should provide a card on each getNextCard call', () => {
    const card = engine.getNextCard();
    expect(card).not.toBeNull();
    expect(card?.text).toContain('Question');
  });

  it('should advance progress after marking cards', () => {
    // Answer all 3 cards correctly 3 times each to graduate them
    for (let round = 0; round < 100; round++) {
      if (engine.isComplete()) break;
      const card = engine.getNextCard();
      if (!card) break;
      engine.markCard(card.id, true);
    }
    expect(engine.isComplete()).toBe(true);
    expect(engine.getGraduatedCount()).toBe(3);
  });

  it('should keep incorrect cards in active pool', () => {
    const card = engine.getNextCard()!;
    engine.markCard(card.id, false);
    // Card was marked no, should still be active
    expect(engine.getActiveCount()).toBe(3);
    expect(engine.getGraduatedCount()).toBe(0);
  });

  it('should correctly count first-try successes in stats', () => {
    const c1 = engine.getNextCard()!;
    engine.markCard(c1.id, true);

    const c2 = engine.getNextCard()!;
    engine.markCard(c2.id, false);

    const stats = engine.getStats();
    expect(stats.firstTrySuccessCount).toBe(1);
    expect(stats.retriedCount).toBe(1);
  });
});

// =========================================================================
// Test: Summary screen data processing
// =========================================================================

describe('FlashcardSummaryScreen data', () => {
  it('should process stats correctly for display', () => {
    const cards = [makeCard('s1'), makeCard('s2'), makeCard('s3')];
    const engine = new LeitnerEngine(cards);

    // Simulate a session: s1 graduated, s2 retried, s3 never succeeded
    // Graduate s1 quickly (3 yes answers through all boxes with fallback)
    engine.getNextCard(); engine.markCard('s1', true); // box2
    engine.getNextCard(); engine.markCard('s1', true); // box3 (fallback)
    engine.getNextCard(); engine.markCard('s1', true); // graduated

    // s2: fail once then succeed
    const s2card = engine.getNextCard();
    if (s2card?.id === 's2') {
      engine.markCard('s2', false); // noCount++
    }

    const stats = engine.getStats();

    expect(stats.totalCards).toBe(3);
    expect(stats.graduated).toBeGreaterThanOrEqual(1);
    expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(stats.cardDetails).toHaveLength(3);
  });

  it('should export valid JSON structure', () => {
    const cards = [makeCard('x1')];
    const engine = new LeitnerEngine(cards);
    engine.getNextCard();
    engine.markCard('x1', true);

    const stats = engine.getStats();
    const exportData = {
      bankName: 'Test Bank',
      completedAt: new Date().toISOString(),
      summary: {
        totalCards: stats.totalCards,
        graduated: stats.graduated,
        firstTrySuccessCount: stats.firstTrySuccessCount,
        retriedCount: stats.retriedCount,
        neverSucceededCount: stats.neverSucceededCount,
        totalTimeMs: stats.totalTimeMs,
      },
      cards: stats.cardDetails.map((d) => ({
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

    // Verify it can be serialized
    const json = JSON.stringify(exportData);
    expect(json).toBeDefined();
    const parsed = JSON.parse(json);
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].id).toBe('x1');
  });
});
