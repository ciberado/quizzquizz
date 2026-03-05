import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, ApiError } from './api-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('Error Handling', () => {
    it('should throw ApiError on non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Session not found' }),
      });

      await expect(api.getQuestionBankTree()).rejects.toThrow(ApiError);
    });

    it('should include error data in ApiError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid question bank ID' }),
      });

      try {
        await api.createSession('invalid-id');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).data).toEqual({ error: 'Invalid question bank ID' });
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getQuestionBankTree()).rejects.toThrow(ApiError);
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        },
        text: async () => 'Server error occurred',
      });

      await expect(api.getQuestionBankTree()).rejects.toThrow(ApiError);
    });
  });

  describe('Question Banks', () => {
    it('should fetch the question bank tree', async () => {
      const mockTree = {
        name: '',
        path: '',
        folders: [],
        banks: [
          { id: 'bank-1', name: 'General Knowledge', topics: [], questionCount: 10 },
          { id: 'bank-2', name: 'Science', topics: [], questionCount: 15 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tree: mockTree }),
      });

      const result = await api.getQuestionBankTree();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/question-banks',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockTree);
      expect(result.banks).toHaveLength(2);
    });

    it('should fetch a single bank by id via getQuestionBankDetails', async () => {
      const mockBank = {
        id: 'bank-1',
        metadata: { name: 'General Knowledge', topics: [], defaultTimeLimit: 20 },
        questions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBank,
      });

      const result = await api.getQuestionBankDetails('bank-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/question-banks/bank?id=bank-1',
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result.metadata.name).toBe('General Knowledge');
    });

    it('should encode slashes in bank IDs for getQuestionBankDetails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'science/physics/electromagnetism', metadata: { name: 'Electromagnetism', topics: [], defaultTimeLimit: 20 }, questions: [] }),
      });

      await api.getQuestionBankDetails('science/physics/electromagnetism');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/question-banks/bank?id=science%2Fphysics%2Felectromagnetism',
        expect.any(Object)
      );
    });

    it('should reload question banks', async () => {
      const mockReloadResponse = {
        success: true,
        message: 'Reloaded 2 question bank(s)',
        banks: [
          { id: 'bank-1', name: 'General Knowledge', questionCount: 10 },
          { id: 'bank-2', name: 'Science', questionCount: 15 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReloadResponse,
      });

      const result = await api.reloadQuestionBanks();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/question-banks/reload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockReloadResponse);
      expect(result.success).toBe(true);
      expect(result.banks).toHaveLength(2);
    });
  });

  describe('Session Management', () => {
    it('should create a session', async () => {
      const mockResponse = {
        id: 'session-123',
        pin: '654321',
        hostToken: 'token-abc',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createSession('bank-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ questionBankId: 'bank-1' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get session with host token', async () => {
      const mockSession = {
        id: 'session-123',
        pin: '654321',
        status: 'lobby',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await api.getSession('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
      expect(result).toEqual(mockSession);
    });

    it('should delete session with host token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.deleteSession('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
    });
  });

  describe('Game Control', () => {
    it('should start quiz with host token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.startQuiz('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/start',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
    });

    it('should advance to next question', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.nextQuestion('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/next',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
    });

    it('should end quiz', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.endQuiz('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/end',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
    });
  });

  describe('Player Data', () => {
    it('should get players in session', async () => {
      const mockPlayers = [
        { id: 'player-1', nickname: 'Alice', score: 100 },
        { id: 'player-2', nickname: 'Bob', score: 50 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ players: mockPlayers }),
      });

      const result = await api.getPlayers('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/players',
        expect.any(Object)
      );
      expect(result).toEqual(mockPlayers);
    });

    it('should get leaderboard', async () => {
      const mockLeaderboard = {
        entries: [
          { playerId: 'player-1', nickname: 'Alice', score: 500, rank: 1 },
          { playerId: 'player-2', nickname: 'Bob', score: 300, rank: 2 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaderboard,
      });

      const result = await api.getLeaderboard('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/leaderboard',
        expect.any(Object)
      );
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('Game State', () => {
    it('should get game state with host token', async () => {
      const mockState = {
        status: 'playing',
        currentQuestionIndex: 2,
        currentQuestion: {
          id: 'q3',
          text: 'What is 2+2?',
          answers: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockState,
      });

      const result = await api.getGameState('session-123', 'token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/session-123/state',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Host-Token': 'token-abc',
          }),
        })
      );
      expect(result).toEqual(mockState);
    });
  });
});
