import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from './state';

describe('State Management', () => {
  beforeEach(() => {
    // Clear state and localStorage
    state.clearState();
    localStorage.clear();
  });

  describe('Basic State Operations', () => {
    it('should initialize with empty state', () => {
      const currentState = state.getState();
      
      expect(currentState).toEqual({
        sessionId: null,
        hostToken: null,
        pin: null,
        questionBankId: null,
      });
    });

    it('should update state with partial updates', () => {
      state.setState({ sessionId: 'session-123' });
      
      const currentState = state.getState();
      
      expect(currentState.sessionId).toBe('session-123');
      expect(currentState.hostToken).toBeNull();
    });

    it('should update multiple fields at once', () => {
      state.setState({
        sessionId: 'session-abc',
        hostToken: 'token-xyz',
        pin: '123456',
      });
      
      const currentState = state.getState();
      
      expect(currentState.sessionId).toBe('session-abc');
      expect(currentState.hostToken).toBe('token-xyz');
      expect(currentState.pin).toBe('123456');
    });

    it('should clear all state', () => {
      state.setState({
        sessionId: 'session-123',
        hostToken: 'token-abc',
        pin: '999888',
        questionBankId: 'bank-1',
      });
      
      state.clearState();
      
      const currentState = state.getState();
      
      expect(currentState).toEqual({
        sessionId: null,
        hostToken: null,
        pin: null,
        questionBankId: null,
      });
    });
  });

  describe('localStorage Persistence', () => {
    it('should save state to localStorage', () => {
      state.setState({ sessionId: 'session-123', pin: '654321' });
      
      const stored = localStorage.getItem('quizzquizz_host_state');
      expect(stored).toBeTruthy();
      if (!stored) throw new Error('State not stored');
      
      const parsed = JSON.parse(stored);
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.pin).toBe('654321');
    });

    it('should load state from localStorage', () => {
      // Manually set localStorage
      localStorage.setItem(
        'quizzquizz_host_state',
        JSON.stringify({
          sessionId: 'session-loaded',
          hostToken: 'token-loaded',
          pin: '111222',
          questionBankId: 'bank-loaded',
        })
      );
      
      // Load from storage
      state.loadFromStorage();
      
      const currentState = state.getState();
      expect(currentState.sessionId).toBe('session-loaded');
      expect(currentState.hostToken).toBe('token-loaded');
      expect(currentState.pin).toBe('111222');
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('quizzquizz_host_state', 'invalid json {{{');
      
      // Should not throw
      expect(() => state.loadFromStorage()).not.toThrow();
      
      // State should remain empty
      const currentState = state.getState();
      expect(currentState.sessionId).toBeNull();
    });

    it('should clear localStorage on clearState', () => {
      state.setState({ sessionId: 'session-123' });
      expect(localStorage.getItem('quizzquizz_host_state')).toBeTruthy();
      
      state.clearState();
      
      const stored = localStorage.getItem('quizzquizz_host_state');
      expect(stored).toBeTruthy();
      if (!stored) throw new Error('State not stored');
      const parsed = JSON.parse(stored);
      expect(parsed.sessionId).toBeNull();
    });
  });

  describe('State Subscriptions', () => {
    it('should notify subscribers on state change', () => {
      const listener = vi.fn();
      state.subscribe(listener);
      
      state.setState({ sessionId: 'session-123' });
      
      expect(listener).toHaveBeenCalledWith({
        sessionId: 'session-123',
        hostToken: null,
        pin: null,
        questionBankId: null,
      });
    });

    it('should support multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      state.subscribe(listener1);
      state.subscribe(listener2);
      
      state.setState({ pin: '999888' });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should unsubscribe via returned function', () => {
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);
      
      unsubscribe();
      
      state.setState({ sessionId: 'session-123' });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify subscribers on clearState', () => {
      const listener = vi.fn();
      state.subscribe(listener);
      
      state.setState({ sessionId: 'session-123' });
      listener.mockClear();
      
      state.clearState();
      
      expect(listener).toHaveBeenCalledWith({
        sessionId: null,
        hostToken: null,
        pin: null,
        questionBankId: null,
      });
    });

    it('should not notify after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);
      
      state.setState({ sessionId: 'session-1' });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      listener.mockClear();
      
      state.setState({ sessionId: 'session-2' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('State Immutability', () => {
    it('should return a copy of state, not the original', () => {
      state.setState({ sessionId: 'session-123' });
      
      const state1 = state.getState();
      const state2 = state.getState();
      
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should not allow external mutation of state', () => {
      state.setState({ sessionId: 'session-123' });
      
      const currentState = state.getState();
      currentState.sessionId = 'mutated';
      
      const actualState = state.getState();
      expect(actualState.sessionId).toBe('session-123');
    });
  });
});
