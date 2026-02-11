import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from '../routes/sessions';
import gameRoutes from '../routes/game';
import { getPrisma, initDatabase, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';

// Mount routes like in the main app
const app = new Hono();
app.route('/api/sessions', sessionRoutes);
app.route('/api/sessions', gameRoutes);

const request = async (path: string, options: RequestInit = {}) => {
  const req = new Request(`http://localhost${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const res = await app.fetch(req);
  const data = await res.json();
  return { res, data };
};

describe('GET /api/sessions/:sessionId/players/:playerId/review', () => {
  beforeAll(async () => {
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=playerreview';
    await initDatabase();

    // Create a sample question bank for testing
    const sampleBank: QuestionBank = {
      id: 'test-bank-1',
      metadata: {
        name: 'Test Bank 1',
        defaultTimeLimit: 10,
        topics: [],
      },
      questions: [
        {
          id: 'q1',
          text: 'What is 2+2?',
          answers: [
            { id: 'a1', text: '4' },
            { id: 'a2', text: '5' },
          ],
          correctAnswerIds: ['a1'],
          difficulty: 'easy',
          topics: [],
          tags: [],
          timeLimit: 10,
        },
        {
          id: 'q2',
          text: 'What is 3+3?',
          answers: [
            { id: 'b1', text: '6' },
            { id: 'b2', text: '7' },
          ],
          correctAnswerIds: ['b1'],
          difficulty: 'easy',
          topics: [],
          tags: [],
          timeLimit: 10,
        },
      ],
    };
    questionBanks.set('test-bank-1', sampleBank);
  });

  beforeEach(async () => {
    // Clean database between tests
    await getPrisma().playerAnswer.deleteMany();
    await getPrisma().player.deleteMany();
    await getPrisma().session.deleteMany();
  });

  it('should return complete player review with stats and questions', async () => {
    // Create session
    const createRes = await request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionBankId: 'test-bank-1' }),
    });
    const session = createRes.data as { sessionId: string; hostToken: string; pin: string };

    // Join as player
    const joinRes = await request('/api/sessions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: session.pin, nickname: 'TestPlayer' }),
    });
    const player = joinRes.data as { playerId: string; sessionId: string };

    // Start quiz
    await request(`/api/sessions/${session.sessionId}/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': session.hostToken },
    });

    // Submit answer for first question
    await request(`/api/sessions/${session.sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Player-Id': player.playerId,
      },
      body: JSON.stringify({
        questionId: 'q1',
        selectedAnswerIds: ['a1'], // correct answer
      }),
    });

    // End quiz
    await getPrisma().session.update({
      where: { id: session.sessionId },
      data: { status: 'finished' },
    });

    // Get player review
    const { res, data } = await request(
      `/api/sessions/${session.sessionId}/players/${player.playerId}/review`,
      {
        method: 'GET',
        headers: { 'X-Player-Id': player.playerId },
      }
    );

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('relativeLeaderboard');
    expect(data).toHaveProperty('questions');

    // Verify stats
    const stats = data.stats as {
      totalQuestions: number;
      correctAnswers: number;
      totalScore: number;
      rank: number;
      totalPlayers: number;
      accuracyPercentage: number;
    };
    expect(stats.totalQuestions).toBe(2);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.totalScore).toBeGreaterThan(0);
    expect(stats.rank).toBe(1);
    expect(stats.totalPlayers).toBe(1);
    expect(stats.accuracyPercentage).toBe(50); // 1/2 = 50%

    // Verify relative leaderboard (only player)
    const leaderboard = data.relativeLeaderboard as Array<{
      playerId: string;
      nickname: string;
      score: number;
      rank: number;
      isCurrentPlayer: boolean;
    }>;
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].isCurrentPlayer).toBe(true);
    expect(leaderboard[0].nickname).toBe('TestPlayer');

    // Verify questions
    const questions = data.questions as Array<{
      questionId: string;
      questionText: string;
      playerSelectedAnswerIds: string[];
      correctAnswerIds: string[];
      isCorrect: boolean;
      pointsEarned: number;
    }>;
    expect(questions).toHaveLength(2);
    expect(questions[0].questionId).toBe('q1');
    expect(questions[0].isCorrect).toBe(true);
    expect(questions[0].pointsEarned).toBeGreaterThan(0);
    expect(questions[1].questionId).toBe('q2');
    expect(questions[1].isCorrect).toBe(false);
    expect(questions[1].pointsEarned).toBe(0);
  });

  it('should return relative leaderboard with neighbors', async () => {
    // Create session
    const createRes = await request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionBankId: 'test-bank-1' }),
    });
    const session = createRes.data as { sessionId: string; hostToken: string; pin: string };

    // Join 3 players
    const player1 = (
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player1' }),
      })
    ).data as { playerId: string };

    const player2 = (
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player2' }),
      })
    ).data as { playerId: string };

    const player3 = (
      await request('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: session.pin, nickname: 'Player3' }),
      })
    ).data as { playerId: string };

    // Set scores (Player2 is in the middle)
    await getPrisma().player.update({
      where: { id: player1.playerId },
      data: { score: 1000 }, // 1st
    });
    await getPrisma().player.update({
      where: { id: player2.playerId },
      data: { score: 500 }, // 2nd
    });
    await getPrisma().player.update({
      where: { id: player3.playerId },
      data: { score: 200 }, // 3rd
    });

    // Mark session as finished
    await getPrisma().session.update({
      where: { id: session.sessionId },
      data: { status: 'finished' },
    });

    // Get Player2's review (middle player)
    const { res, data } = await request(
      `/api/sessions/${session.sessionId}/players/${player2.playerId}/review`,
      {
        method: 'GET',
        headers: { 'X-Player-Id': player2.playerId },
      }
    );

    expect(res.status).toBe(200);

    // Verify relative leaderboard shows 3 players (1 above + current + 1 below)
    const leaderboard = data.relativeLeaderboard as Array<{
      playerId: string;
      nickname: string;
      rank: number;
      isCurrentPlayer: boolean;
    }>;
    expect(leaderboard).toHaveLength(3);
    expect(leaderboard[0].nickname).toBe('Player1');
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].isCurrentPlayer).toBe(false);
    expect(leaderboard[1].nickname).toBe('Player2');
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].isCurrentPlayer).toBe(true);
    expect(leaderboard[2].nickname).toBe('Player3');
    expect(leaderboard[2].rank).toBe(3);
    expect(leaderboard[2].isCurrentPlayer).toBe(false);
  });

  it('should require player authentication', async () => {
    // Create minimal session
    const createRes = await request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionBankId: 'test-bank-1' }),
    });
    const session = createRes.data as { sessionId: string };

    // Try to access without X-Player-Id header
    const { res, data } = await request(
      `/api/sessions/${session.sessionId}/players/fake-player-id/review`,
      {
        method: 'GET',
      }
    );

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error');
    expect((data as { error: string }).error).toBe('Unauthorized');
  });

  it('should return 404 for non-existent session', async () => {
    const { res, data } = await request(
      '/api/sessions/non-existent-session/players/fake-player/review',
      {
        method: 'GET',
        headers: { 'X-Player-Id': 'fake-player' },
      }
    );

    expect(res.status).toBe(404);
    expect((data as { error: string }).error).toBe('Session not found');
  });
});
