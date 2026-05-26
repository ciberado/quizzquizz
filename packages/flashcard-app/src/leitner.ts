/**
 * Modified Leitner System for single-session flashcard learning.
 *
 * Cards progress through 3 boxes:
 *   Box 1 (Learning):   Cards start here. Reappear immediately (high priority).
 *   Box 2 (Reviewing):  Cards move here on first "yes". Reappear after ~4 other cards.
 *   Box 3 (Mastered):   Cards move here on second "yes". Reappear once for final confirmation.
 *
 * A card is fully graduated (removed from active play) after passing Box 3 with "yes".
 * On "no", any card returns to Box 1 regardless of its current box.
 *
 * Spacing is card-count based (not time based), suitable for short single sessions.
 */

export interface FlashCard {
  id: string;
  text: string;
  answer: string; // Correct answer text(s) joined
  correctAnswerIds: string[];
  allAnswers: Array<{ id: string; text: string }>;
}

export type Box = 1 | 2 | 3;

export interface CardState {
  card: FlashCard;
  box: Box;
  /** Total number of "yes" responses for this card */
  yesCount: number;
  /** Total number of "no" responses for this card */
  noCount: number;
  /** Whether this card was answered correctly on the very first attempt */
  firstTrySuccess: boolean | null;
  /** Card-counter value when this card was last seen (for spacing calculation) */
  lastSeenAt: number;
  /** Whether the card has been graduated (passed Box 3 with "yes") */
  graduated: boolean;
}

export interface LeitnerStats {
  totalCards: number;
  graduated: number;
  firstTrySuccessCount: number;
  retriedCount: number;
  neverSucceededCount: number;
  cardDetails: Array<{
    card: FlashCard;
    yesCount: number;
    noCount: number;
    totalAttempts: number;
    firstTrySuccess: boolean | null;
    box: Box;
    graduated: boolean;
  }>;
  totalTimeMs: number;
}

/** How many cards must be seen before a Box-N card becomes eligible again */
const BOX_SPACING: Record<Box, number> = {
  1: 0,  // Box 1 cards are immediately eligible
  2: 4,  // Box 2 cards reappear after 4 other cards
  3: 9,  // Box 3 cards reappear after 9 other cards (final check)
};

export class LeitnerEngine {
  private cards: Map<string, CardState>;
  private cardCounter: number = 0;
  private startTimeMs: number;

  constructor(flashCards: FlashCard[]) {
    this.cards = new Map();
    this.startTimeMs = Date.now();

    for (const card of flashCards) {
      this.cards.set(card.id, {
        card,
        box: 1,
        yesCount: 0,
        noCount: 0,
        firstTrySuccess: null,
        lastSeenAt: -BOX_SPACING[1] - 1, // Eligible immediately
        graduated: false,
      });
    }
  }

  /**
   * Get the next card to show, respecting box spacing and priority.
   * Returns null when all cards are graduated.
   */
  getNextCard(): FlashCard | null {
    // Gather eligible cards per box (spacing satisfied)
    const eligible: { state: CardState; priority: number }[] = [];
    // Also track all ungraduated cards in case we need fallback (deadlock prevention)
    const ungraduated: { state: CardState; priority: number }[] = [];

    for (const state of this.cards.values()) {
      if (state.graduated) continue;
      const spacing = BOX_SPACING[state.box];
      const cardsSinceSeen = this.cardCounter - state.lastSeenAt;
      ungraduated.push({ state, priority: state.box });
      if (cardsSinceSeen > spacing) {
        eligible.push({ state, priority: state.box });
      }
    }

    if (ungraduated.length === 0) return null;

    // Use eligible set if available; otherwise fall back to all ungraduated
    // (prevents deadlock when all remaining cards are in higher boxes with large spacing)
    const candidates = eligible.length > 0 ? eligible : ungraduated;

    // Sort by priority (box number ascending), then by last seen ascending (oldest first)
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.state.lastSeenAt - b.state.lastSeenAt;
    });

    const chosen = candidates[0]!.state;
    chosen.lastSeenAt = this.cardCounter;
    this.cardCounter++;
    return chosen.card;
  }

  /**
   * Mark the current card result.
   * @param cardId - ID of the card just shown
   * @param known - true = "yes" (player knew it), false = "no" (player didn't know)
   */
  markCard(cardId: string, known: boolean): void {
    const state = this.cards.get(cardId);
    if (!state) return;

    if (state.firstTrySuccess === null) {
      state.firstTrySuccess = known;
    }

    if (known) {
      state.yesCount++;
      if (state.box < 3) {
        state.box = (state.box + 1) as Box;
      } else {
        // Box 3 + yes = graduated
        state.graduated = true;
      }
    } else {
      state.noCount++;
      state.box = 1;
      // Reset spacing so it reappears soon
      state.lastSeenAt = this.cardCounter - BOX_SPACING[1] - 1;
    }
  }

  /**
   * Returns true when all cards have been graduated.
   */
  isComplete(): boolean {
    for (const state of this.cards.values()) {
      if (!state.graduated) return false;
    }
    return true;
  }

  /**
   * Returns aggregate statistics for the session summary.
   */
  getStats(): LeitnerStats {
    let graduated = 0;
    let firstTrySuccessCount = 0;
    let neverSucceededCount = 0;

    const cardDetails = [];

    for (const state of this.cards.values()) {
      if (state.graduated) graduated++;
      if (state.firstTrySuccess === true) firstTrySuccessCount++;
      if (state.yesCount === 0) neverSucceededCount++;

      cardDetails.push({
        card: state.card,
        yesCount: state.yesCount,
        noCount: state.noCount,
        totalAttempts: state.yesCount + state.noCount,
        firstTrySuccess: state.firstTrySuccess,
        box: state.box,
        graduated: state.graduated,
      });
    }

    return {
      totalCards: this.cards.size,
      graduated,
      firstTrySuccessCount,
      retriedCount: cardDetails.filter((d) => d.noCount > 0).length,
      neverSucceededCount,
      cardDetails,
      totalTimeMs: Date.now() - this.startTimeMs,
    };
  }

  /** Number of active (non-graduated) cards remaining */
  getActiveCount(): number {
    let count = 0;
    for (const state of this.cards.values()) {
      if (!state.graduated) count++;
    }
    return count;
  }

  /** Number of graduated cards */
  getGraduatedCount(): number {
    let count = 0;
    for (const state of this.cards.values()) {
      if (state.graduated) count++;
    }
    return count;
  }

  /** Distribution of cards across boxes and graduated */
  getBoxDistribution(): { box1: number; box2: number; box3: number; graduated: number } {
    const dist = { box1: 0, box2: 0, box3: 0, graduated: 0 };
    for (const state of this.cards.values()) {
      if (state.graduated) dist.graduated++;
      else if (state.box === 1) dist.box1++;
      else if (state.box === 2) dist.box2++;
      else dist.box3++;
    }
    return dist;
  }

  /** Total number of cards */
  getTotalCount(): number {
    return this.cards.size;
  }
}
