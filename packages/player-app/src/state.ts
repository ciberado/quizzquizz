/**
 * Simple state management with pub/sub pattern
 */

import { api } from './api-client';

type Listener<T> = (state: T) => void;

/**
 * Player context stored during quiz session
 */
export interface PlayerState {
  sessionId: string | null;
  playerId: string | null;
  nickname: string | null;
  score: number;
  currentQuestionIndex: number;
}

class StateManager {
  private state: PlayerState = {
    sessionId: null,
    playerId: null,
    nickname: null,
    score: 0,
    currentQuestionIndex: -1,
  };

  private listeners: Set<Listener<PlayerState>> = new Set();

  /**
   * Get current state (immutable copy)
   */
  getState(): Readonly<PlayerState> {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  setState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: Listener<PlayerState>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all state (logout/reset)
   */
  clearState(): void {
    this.state = {
      sessionId: null,
      playerId: null,
      nickname: null,
      score: 0,
      currentQuestionIndex: -1,
    };
    this.clearStorage();
    
    // Clear API client cache and cancel pending requests
    api.clearCache();
    api.cancelAllRequests();
    
    this.notifyListeners();
  }

  /**
   * Load state from localStorage (for reconnection)
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('quizzquizz_player_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
        this.notifyListeners();
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
      localStorage.setItem('quizzquizz_player_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }

  /**
   * Clear localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem('quizzquizz_player_state');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Notify all subscribers of state change
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
}

// Export singleton instance
export const state = new StateManager();
