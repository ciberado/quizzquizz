import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from '../router';
import { state } from '../state';
import '../components/join-screen';
import type { JoinScreen } from '../components/join-screen';

// ── Yjs mock ──────────────────────────────────────────────────────────────────
const { mockConnectToSession } = vi.hoisted(() => ({
  mockConnectToSession: vi.fn(() => vi.fn()),
}));

vi.mock('../yjs-provider', () => ({
  connectToSession: mockConnectToSession,
}));

describe('JoinScreen Component', () => {
  let component: JoinScreen;

  beforeEach(() => {
    // Create a fresh component for each test
    component = document.createElement('join-screen') as JoinScreen;
    document.body.appendChild(component);
    
    // Clear state
    state.clearState();
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(component);
  });

  it('should render the join screen with PIN input', () => {
    expect(component.querySelector('h1')?.textContent).toBe('Join Quiz');
    expect(component.querySelector('#pin-input')).toBeTruthy();
    expect(component.querySelector('#submit-button')).toBeTruthy();
  });

  it('should show error when PIN is empty', async () => {
    const form = component.querySelector('form');
    const pinInput = component.querySelector('#pin-input') as HTMLInputElement;
    
    pinInput.value = '';
    form?.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 10));

    const errorMessage = component.querySelector('#error-message') as HTMLElement;
    expect(errorMessage.style.display).not.toBe('none');
    expect(errorMessage.textContent).toContain('6-digit PIN');
  });

  it('should show error when PIN is not 6 digits', async () => {
    const form = component.querySelector('form');
    const pinInput = component.querySelector('#pin-input') as HTMLInputElement;
    
    pinInput.value = '12345'; // Only 5 digits
    form?.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 10));

    const errorMessage = component.querySelector('#error-message') as HTMLElement;
    expect(errorMessage.style.display).not.toBe('none');
  });

  it('should navigate to nickname screen with valid PIN', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const form = component.querySelector('form');
    const pinInput = component.querySelector('#pin-input') as HTMLInputElement;
    
    pinInput.value = '123456';
    form?.dispatchEvent(new Event('submit'));

    expect(navigateSpy).toHaveBeenCalledWith('/nickname?pin=123456');
  });
});

// Router functionality is tested via integration/manual tests

describe('State Management', () => {
  beforeEach(() => {
    state.clearState();
    localStorage.clear();
  });

  it('should store and retrieve player state', () => {
    state.setState({
      sessionId: 'session-123',
      playerId: 'player-456',
      nickname: 'TestPlayer',
      score: 0,
      currentQuestionIndex: -1,
    });

    const retrieved = state.getState();
    expect(retrieved.sessionId).toBe('session-123');
    expect(retrieved.playerId).toBe('player-456');
    expect(retrieved.nickname).toBe('TestPlayer');
  });

  it('should persist state to localStorage', () => {
    state.setState({
      sessionId: 'session-123',
      playerId: 'player-456',
      nickname: 'TestPlayer',
      score: 100,
      currentQuestionIndex: 2,
    });

    // Create a new state manager and load from storage
    const stored = localStorage.getItem('quizzquizz_player_state');
    expect(stored).toBeTruthy();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.score).toBe(100);
    }
  });

  it('should notify subscribers on state change', () => {
    const updates: number[] = [];
    
    state.subscribe((newState) => {
      updates.push(newState.score);
    });

    state.setState({ score: 50 });
    state.setState({ score: 100 });

    expect(updates).toEqual([50, 100]);
  });

  it('should clear state', () => {
    state.setState({
      sessionId: 'session-123',
      playerId: 'player-456',
      nickname: 'TestPlayer',
      score: 100,
      currentQuestionIndex: 2,
    });

    state.clearState();

    const cleared = state.getState();
    expect(cleared.sessionId).toBeNull();
    expect(cleared.playerId).toBeNull();
    expect(cleared.score).toBe(0);
  });
});

describe('QuestionScreen Component', () => {
  let component: HTMLElement;

  beforeEach(() => {
    mockConnectToSession.mockClear();

    // Set up state
    state.setState({
      sessionId: 'session-123',
      playerId: 'player-456',
      nickname: 'TestPlayer',
      score: 0,
      currentQuestionIndex: 0,
    });

    // Dynamically import the component
    import('../components/question-screen');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    state.clearState();
  });

  it('should instantiate QuestionScreen component', () => {
    component = document.createElement('question-screen');
    expect(component).toBeTruthy();
    expect(component.tagName).toBe('QUESTION-SCREEN');
  });

  it('should connect to Yjs session when mounted', async () => {
    component = document.createElement('question-screen');
    document.body.appendChild(component);

    // Wait for onMount to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockConnectToSession).toHaveBeenCalled();
    
    if (component.parentNode) {
      document.body.removeChild(component);
    }
  });
});

describe('WaitingScreen Component', () => {
  let component: HTMLElement;

  beforeEach(() => {
    mockConnectToSession.mockClear();

    state.setState({
      sessionId: 'session-123',
      playerId: 'player-456',
      nickname: 'TestPlayer',
      score: 100,
      currentQuestionIndex: 1,
    });

    import('../components/waiting-screen');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (component && component.parentNode) {
      document.body.removeChild(component);
    }
    state.clearState();
  });

  it('should instantiate WaitingScreen component', () => {
    component = document.createElement('waiting-screen');
    expect(component).toBeTruthy();
    expect(component.tagName).toBe('WAITING-SCREEN');
  });

  it('should connect to Yjs session when mounted', async () => {
    component = document.createElement('waiting-screen');
    document.body.appendChild(component);

    // Wait for onMount to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockConnectToSession).toHaveBeenCalled();
  });
});
