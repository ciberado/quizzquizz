/**
 * Tests for QuestionDisplayScreen – autopace double-trigger prevention
 *
 * Previously a race condition existed where both the Yjs timer update
 * AND the allPlayersAnswered flag could each schedule an
 * autoNavigateTimeout, resulting in two router.navigate('/leaderboard') calls
 * and a broken game flow. The component now uses Yjs instead of polling.
 *
 * These tests confirm that regardless of whether allPlayersAnswered fires,
 * or the client timer expires first, or both happen in the same cycle,
 * router.navigate is invoked at most once.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mocks so they are available inside vi.mock factories ────────────────
const { mockNavigate, mockGetState, mockGetSession, mockGetPlayers, mockDisconnect } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetState: vi.fn(() => ({
    sessionId: 'sess-test',
    hostToken: 'token-test',
    pin: null,
    questionBankId: null,
  })),
  mockGetSession: vi.fn(),
  mockGetPlayers: vi.fn(),
  mockDisconnect: vi.fn(),
}));

vi.mock('../router', () => ({ router: { navigate: mockNavigate } }));
vi.mock('../state', () => ({ state: { getState: mockGetState } }));
vi.mock('../api-client', () => ({
  api: { getSession: mockGetSession, getPlayers: mockGetPlayers, adjustTimer: vi.fn(() => Promise.resolve()) },
  cancelAllRequests: vi.fn(),
}));

// Capture the Yjs onStateChange callback so tests can simulate doc updates.
let capturedYjsCallback: ((state: Record<string, unknown>) => void) | null = null;
vi.mock('../yjs-provider', () => ({
  connectToSession: vi.fn((_sessionId: string, _token: string, onStateChange: (state: Record<string, unknown>) => void) => {
    capturedYjsCallback = onStateChange;
    return mockDisconnect;
  }),
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
    capturedYjsCallback = null;
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
    mockGetSession.mockResolvedValue(makeSession({ elapsed: 5 }));
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100); // flush connectedCallback → loadInitialGameState + connectToSession

    // Simulate Yjs doc update: allPlayersAnswered=true → triggers earlyStop + 4s autoNavigateTimeout
    capturedYjsCallback!({ allPlayersAnswered: true });

    // Advance past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 2 ─────────────────────────────────────────────────────────────
  it('navigates to leaderboard exactly once when client-side timer expires (no one answered yet)', async () => {
    // 2s remaining on a 30-second question; nobody answered.
    mockGetSession.mockResolvedValue(makeSession({ timeLimit: 30, elapsed: 28, allPlayersAnswered: false }));
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100); // flush connectedCallback

    // Simulate Yjs doc update: timeRemaining drops to 0 → timerStateChanged triggers autoNavigateTimeout
    capturedYjsCallback!({ timeRemaining: 0 });

    // Flush the callback processing
    await vi.advanceTimersByTimeAsync(0);

    // Advance past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 3 ─────────────────────────────────────────────────────────────
  it('navigates exactly once when allPlayersAnswered becomes true in the same poll cycle as timer almost expiring', async () => {
    // 1s remaining; all players just answered.
    mockGetSession.mockResolvedValue(makeSession({ timeLimit: 30, elapsed: 29 }));
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100); // flush connectedCallback

    // Simulate Yjs doc update: allPlayersAnswered=true with timer still active → earlyStop path
    capturedYjsCallback!({ allPlayersAnswered: true, timeRemaining: 1 });

    // Advance far past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 4 ─────────────────────────────────────────────────────────────
  it('navigates exactly once when client timer fires first and a subsequent poll also sees allPlayersAnswered', async () => {
    // 5s remaining on timer; nobody answered yet.
    mockGetSession.mockResolvedValue(makeSession({ elapsed: 25, allPlayersAnswered: false }));
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100); // flush connectedCallback

    // Simulate Yjs: timer hits 0 → timerStateChanged → 4s timeout scheduled
    capturedYjsCallback!({ timeRemaining: 0 });
    await vi.advanceTimersByTimeAsync(0);

    // Guard check: simulate a late allPlayersAnswered update arriving after timeout is set.
    // The guard in handleDocState prevents a second navigate.
    capturedYjsCallback!({ allPlayersAnswered: true, timeRemaining: 0 });
    await vi.advanceTimersByTimeAsync(0);

    // Another poll cycle — guard must still hold
    capturedYjsCallback!({ allPlayersAnswered: true, timeRemaining: 0 });
    await vi.advanceTimersByTimeAsync(0);

    // Advance past the 4-second autopace delay.
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  // ── Scenario 5 ─────────────────────────────────────────────────────────────
  it('does not navigate automatically when automaticPace is disabled', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2));

    el = document.createElement(TAG);
    document.body.appendChild(el);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(mockNavigate).not.toHaveBeenCalledWith('/leaderboard');

    // Even with Yjs doc update allPlayersAnswered, should not navigate when automaticPace=false
    capturedYjsCallback!({ allPlayersAnswered: true, timeRemaining: 20 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockNavigate).not.toHaveBeenCalledWith('/leaderboard');
  });
});

// ── Timer control buttons ──────────────────────────────────────────────────────
describe('QuestionDisplayScreen – timer control buttons', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    mockNavigate.mockClear();
    mockGetSession.mockReset();
    mockGetPlayers.mockReset();
    capturedYjsCallback = null;
  });

  afterEach(() => {
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    vi.useRealTimers();
  });

  /** Mount with a timed question that still has time remaining. */
  async function mountWithActiveTimer(overrides: Partial<Parameters<typeof makeSession>[0]> = {}) {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: false, ...overrides }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));
    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100); // flush async connectedCallback
  }

  it('renders +5s, -5s, and Jump to Scoreboard buttons while the timer is active', async () => {
    await mountWithActiveTimer();

    expect(el.querySelector('#plus-5-button')).toBeTruthy();
    expect(el.querySelector('#minus-5-button')).toBeTruthy();
    expect(el.querySelector('#jump-button')).toBeTruthy();
  });

  it('does NOT render an End Quiz button on the question screen while timer is active', async () => {
    await mountWithActiveTimer();
    expect(el.querySelector('#end-button')).toBeNull();
  });

  it('does NOT render an End Quiz button after the timer expires', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 30, timeLimit: 30, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));
    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    expect(el.querySelector('#end-button')).toBeNull();
  });

  it('hides +5s/-5s/Jump buttons and shows Show Leaderboard after timer expires', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 30, timeLimit: 30, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));
    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    expect(el.querySelector('#plus-5-button')).toBeNull();
    expect(el.querySelector('#minus-5-button')).toBeNull();
    expect(el.querySelector('#jump-button')).toBeNull();
    expect(el.querySelector('#next-button')?.textContent).toContain('Show Leaderboard');
  });

  it('+5s button increases the displayed timer value by 5', async () => {
    await mountWithActiveTimer(); // 25s remaining

    const before = el.querySelector('.timer-value')?.textContent?.trim();
    expect(before).toBe('25');

    (el.querySelector('#plus-5-button') as HTMLButtonElement).click();

    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('30');
  });

  it('-5s button decreases the displayed timer value by 5', async () => {
    await mountWithActiveTimer(); // 25s remaining

    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('25');

    (el.querySelector('#minus-5-button') as HTMLButtonElement).click();

    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('20');
  });

  it('-5s button does not bring timer below 0', async () => {
    await mountWithActiveTimer({ elapsed: 28, timeLimit: 30 }); // 2s remaining

    (el.querySelector('#minus-5-button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(10); // let render() flush

    // Timer hit 0 — render() was called, +5s/-5s gone, Show Leaderboard appears
    expect(el.querySelector('#minus-5-button')).toBeNull();
    expect(el.querySelector('#plus-5-button')).toBeNull();
    expect(el.querySelector('#next-button')?.textContent).toContain('Show Leaderboard');
  });

  it('clicking -5s at exactly 5s remaining transitions to post-timer state', async () => {
    await mountWithActiveTimer({ elapsed: 25, timeLimit: 30 }); // 5s remaining

    (el.querySelector('#minus-5-button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(10);

    expect(el.querySelector('#next-button')?.textContent).toContain('Show Leaderboard');
    expect(el.querySelector('#end-button')).toBeNull();
  });

  it('Jump to Scoreboard button navigates immediately to /leaderboard', async () => {
    await mountWithActiveTimer();

    (el.querySelector('#jump-button') as HTMLButtonElement).click();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
  });

  it('Jump to Scoreboard cancels any pending auto-navigate timeout', async () => {
    // automaticPace: true so an autoNavigateTimeout gets scheduled when all players answer
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: true, allPlayersAnswered: true }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2));
    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    // The earlyStop path already fired; but Jump should still work without double-navigate
    mockNavigate.mockClear();
    (el.querySelector('#jump-button') as HTMLButtonElement | null)?.click();

    // Advance past any scheduled autopace delay — must not navigate twice
    await vi.advanceTimersByTimeAsync(6000);
    const leaderboardCalls = mockNavigate.mock.calls.filter(c => c[0] === '/leaderboard');
    expect(leaderboardCalls.length).toBeLessThanOrEqual(1);
  });

  it('+5s and -5s buttons are absent when earlyStop fires (automaticPace + allPlayersAnswered)', async () => {
    // earlyStop is only triggered when automaticPace=true and allPlayersAnswered=true
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: true }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2));
    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    // Simulate Yjs doc update with allPlayersAnswered=true → triggers earlyStop
    capturedYjsCallback!({ allPlayersAnswered: true, timeRemaining: 25 });

    expect(el.querySelector('#plus-5-button')).toBeNull();
    expect(el.querySelector('#minus-5-button')).toBeNull();
    expect(el.querySelector('.autopace-status')).toBeTruthy();
  });
});

// ── Server sync tests ────────────────────────────────────────────────────────
describe('QuestionDisplayScreen – server timer synchronization', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    mockNavigate.mockClear();
    mockGetSession.mockReset();
    mockGetPlayers.mockReset();
    capturedYjsCallback = null;
  });

  afterEach(() => {
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    vi.useRealTimers();
  });

  it('+5s button value persists across optimistic window against Yjs updates', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('25');

    // Click +5 → optimistic = 30
    (el.querySelector('#plus-5-button') as HTMLButtonElement).click();
    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('30');

    // Yjs sends update with old server state — optimistic window blocks it
    capturedYjsCallback!({ timeRemaining: 23, timeLimit: 30 });

    // Timer must still show 30, not reverted.
    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('30');
  });

  it('reconciles with server after optimistic window expires', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    // Click +5 → optimistic = 30
    (el.querySelector('#plus-5-button') as HTMLButtonElement).click();

    // Flush microtasks → adjustTimer mock resolves → optimistic window expires
    await vi.advanceTimersByTimeAsync(0);

    // Yjs sends reconciled update: server has timeLimit=35, elapsed=9 → remaining=26
    capturedYjsCallback!({ timeRemaining: 26, timeLimit: 35 });

    expect(el.querySelector('.timer-value')?.textContent?.trim()).toBe('26');
  });

  it('end timer sets time to 0 and does not revert on Yjs updates', async () => {
    mockGetSession.mockResolvedValue(
      makeSession({ elapsed: 5, timeLimit: 30, automaticPace: false }),
    );
    mockGetPlayers.mockResolvedValue(makePlayers(2).map(p => ({ ...p, hasAnswered: false })));

    el = document.createElement(TAG);
    document.body.appendChild(el);
    await vi.advanceTimersByTimeAsync(100);

    // End timer
    (el.querySelector('#end-timer-button') as HTMLButtonElement).click();

    // Timer should show "Show Leaderboard"
    const btnText = el.querySelector('#next-button')?.textContent ?? '';
    expect(btnText).toContain('Show Leaderboard');

    // Even after a Yjs update, timer stays at 0
    capturedYjsCallback!({ timeRemaining: 0, timeLimit: 7 });
    expect(el.querySelector('#next-button')?.textContent).toContain('Show Leaderboard');
  });
});
