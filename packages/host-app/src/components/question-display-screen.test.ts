/**
 * Tests for QuestionDisplayScreen – autopace double-trigger prevention
 *
 * Previously a race condition existed where both the client-side countdown
 * timer AND the polling loadGameState() could each schedule an
 * autoNavigateTimeout, resulting in two router.navigate('/leaderboard') calls
 * and a broken game flow.
 *
 * These tests confirm that regardless of whether allPlayersAnswered fires,
 * or the client timer expires first, or both happen in the same cycle,
 * router.navigate is invoked at most once.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mocks so they are available inside vi.mock factories ────────────────
const { mockNavigate, mockGetState, mockGetSession, mockGetPlayers } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetState: vi.fn(() => ({
    sessionId: 'sess-test',
    hostToken: 'token-test',
    pin: null,
    questionBankId: null,
  })),
  mockGetSession: vi.fn(),
  mockGetPlayers: vi.fn(),
}));

vi.mock('../router', () => ({ router: { navigate: mockNavigate } }));
vi.mock('../state', () => ({ state: { getState: mockGetState } }));
vi.mock('../api-client', () => ({
  api: { getSession: mockGetSession, getPlayers: mockGetPlayers },
  cancelAllRequests: vi.fn(),
}));

// ── Import the component AFTER mocks are registered ─────────────────────────
// Importing the module self-registers 'question-display-screen' via the
// customElements.define call at the bottom of the module.
import './question-display-screen';

const TAG = 'question-display-screen';

// ── Helpers ──────────────────────────────────────────────────────────────────
const NOW = 1_700_000_000_000; // fixed "server" timestamp

/** Returns a minimal session API response for a single-question game */
function makeSession(opts: {
  timeLimit?: number;
  elapsed?: number;       // seconds already elapsed since question started
  allPlayersAnswered?: boolean;
  automaticPace?: boolean;
}) {
  const {
    timeLimit = 30,
    elapsed = 5,
    allPlayersAnswered = false,
    automaticPace = true,
  } = opts;

  return {
    id: 'sess-test',
    pin: '123456',
    hostToken: 'token-test',
    status: 'playing' as const,
    questionBankId: 'bank-1',
    questions: [
      {
        id: 'q1',
        text: 'Question?',
        answers: [{ id: 'a1', text: 'Answer' }],
        correctAnswerIds: ['a1'],
        difficulty: 'easy',
        topics: [],
        tags: [],
        timeLimit,
      },
    ],
    currentQuestionIndex: 0,
    currentQuestionTimeLimit: timeLimit,
    questionStartedAt: NOW - elapsed * 1000,
    serverTime: NOW,
    automaticPace,
    shuffleAnswers: false,
    createdAt: NOW - 60_000,
    // allPlayersAnswered is attached as an extra field by the API
    allPlayersAnswered,
  };
}

function makePlayers(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    sessionId: 'sess-test',
    nickname: `Player ${i}`,
    score: 0,
    joinedAt: NOW - 30_000,
    hasAnswered: true,
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('QuestionDisplayScreen – autopace double-trigger prevention', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    mockNavigate.mockClear();
    mockGetSession.mockReset();
    mockGetPlayers.mockReset();
  });

  afterEach(() => {
    // Remove component from DOM to fire disconnectedCallback
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    vi.useRealTimers();
  });

  // ── Scenario 1 ─────────────────────────────────────────────────────────────
  it('navigates to leaderboard exactly once when allPlayersAnswered fires before timer expires', async () => {
    // Timer has 25s left; all players have already answered.
    mockGetSession.mockResolvedValue(makeSession({ elapsed: 5, allPlayersAnswered: true }));
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    // Let connectedCallback's async loadGameState resolve (flush microtasks + small tick).
    await vi.advanceTimersByTimeAsync(100);

    // allPlayersAnswered branch schedules a 4-second timeout → advance past it.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 2 ─────────────────────────────────────────────────────────────
  it('navigates to leaderboard exactly once when client-side timer expires (no one answered yet)', async () => {
    // Initial poll: 2s remaining on a 30-second question; nobody answered.
    // Subsequent polls reflect the timer having fully expired on the server.
    mockGetSession
      .mockResolvedValueOnce(makeSession({ timeLimit: 30, elapsed: 28, allPlayersAnswered: false }))
      .mockResolvedValue(makeSession({ timeLimit: 30, elapsed: 30, allPlayersAnswered: false }));
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    // Let initial loadGameState resolve → starts a 2-second countdown timer.
    await vi.advanceTimersByTimeAsync(100);

    // Tick past 2 remaining seconds – client timer hits 0 → schedules 4s autopace delay.
    // Also, the next poll (at 2s) will see elapsed=30 and detect timerStateChanged.
    await vi.advanceTimersByTimeAsync(3000);

    // Advance past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 3 ─────────────────────────────────────────────────────────────
  it('navigates exactly once when allPlayersAnswered becomes true in the same poll cycle as timer almost expiring', async () => {
    // 1s remaining; all players just answered.
    mockGetSession.mockResolvedValue(
      makeSession({ timeLimit: 30, elapsed: 29, allPlayersAnswered: true }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    // Initial poll: allPlayersAnswered=true, isTimerActive=true (1s left).
    // The allPlayersAnswered path wins and calls stopTimer().
    await vi.advanceTimersByTimeAsync(100);

    // Advance far past the 4-second autopace delay AND past any poll cycles.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 4 ─────────────────────────────────────────────────────────────
  it('navigates exactly once when client timer fires first and a subsequent poll also sees allPlayersAnswered', async () => {
    // First poll: 5s remaining on timer; nobody answered yet.
    const sessionNotAnswered = makeSession({ elapsed: 25, allPlayersAnswered: false });
    // All subsequent polls: timer elapsed, everyone has answered.
    const sessionAllAnswered = makeSession({ elapsed: 30, allPlayersAnswered: true });

    mockGetSession
      .mockResolvedValueOnce(sessionNotAnswered)  // initial load → timer starts at 5s
      .mockResolvedValue(sessionAllAnswered);      // subsequent polls

    mockGetPlayers
      .mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    // Initial poll: timer starts with 5s remaining.
    await vi.advanceTimersByTimeAsync(100);

    // Client timer ticks down to 0 → autoNavigateTimeout set by startTimer branch.
    await vi.advanceTimersByTimeAsync(6000);

    // A poll fires at the 2s interval → sees allPlayersAnswered but guard prevents duplicate.
    await vi.advanceTimersByTimeAsync(2000);

    // Advance past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 5 ─────────────────────────────────────────────────────────────
  it('does not navigate automatically when automaticPace is disabled', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, allPlayersAnswered: true, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(mockNavigate).not.toHaveBeenCalledWith('/leaderboard');
  });
});
