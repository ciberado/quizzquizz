/**
 * Simple state management for host app
 * Stores session information with localStorage persistence
 */

export interface HostState {
  sessionId: string | null;
  hostToken: string | null;
  pin: string | null;
  questionBankId: string | null;
}

type StateListener = (state: HostState) => void;

class StateManager {
  private state: HostState = {
    sessionId: null,
    hostToken: null,
    pin: null,
    questionBankId: null,
  };

  private listeners: Set<StateListener> = new Set();
  private readonly STORAGE_KEY = 'quizzquizz_host_state';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get current state
   */
  getState(): HostState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  setState(updates: Partial<HostState>): void {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.state = {
      sessionId: null,
      hostToken: null,
      pin: null,
      questionBankId: null,
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Load state from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load state from storage:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.getState());
    });
  }
}

// Export singleton instance
export const state = new StateManager();
