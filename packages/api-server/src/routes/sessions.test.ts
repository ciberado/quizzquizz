import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import sessionRoutes from '../routes/sessions';
import { initDatabase, getPrisma, resetPrismaInstance } from '../db';
import { questionBanks } from '../state';
import { QuestionBank } from '@quizzquizz/common';

const app = new Hono();
app.route('/api/sessions', sessionRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
}

describe('Session Routes', () => {
  beforeAll(async () => {
    await resetPrismaInstance();
    process.env.DATABASE_URL = 'file::memory:?cache=sessions';
    await initDatabase();

    // Create a sample question bank for testing
    const sampleBank: QuestionBank = {
      id: 'test-bank',
      metadata: {
        name: 'Test Bank',
        defaultTimeLimit: 10,
        topics: [],
      },
      questions: [
        {
          id: 'q1',
          text: 'Question 1',
          answers: [
            { id: 'a1', text: 'Answer 1' },
            { id: 'a2', text: 'Answer 2' },
          ],
          correctAnswerIds: ['a1'],
          difficulty: 'easy',
          topics: [],
          tags: [],
        },
        {
          id: 'q2',
          text: 'Question 2',
          answers: [
            { id: 'a3', text: 'Answer 3' },
            { id: 'a4', text: 'Answer 4' },
          ],
          correctAnswerIds: ['a3'],
          difficulty: 'easy',
          topics: [],
          tags: [],
        },
      ],
    };

    questionBanks.set('test-bank', sampleBank);
  });

  beforeEach(async () => {
    await getPrisma().player.deleteMany({});
    await getPrisma().session.deleteMany({});
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });

      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('pin');
      expect(data).toHaveProperty('hostToken');
      expect(data.questionBankId).toBe('test-bank');
      expect(data.status).toBe('lobby');
      expect(data.pin).toHaveLength(6);
    });

    it('should return 400 for missing questionBankId', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('should generate unique PINs', async () => {
      const res1 = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const res2 = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const data1: any = await res1.json();
      const data2: any = await res2.json();
      expect(data1.pin).not.toBe(data2.pin);
    });

    it('should create session with shuffleAnswers enabled by default', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });

      expect(res.status).toBe(201);
      const { id, hostToken }: any = await res.json();
      
      // Verify in database that shuffleAnswers defaults to true
      const session = await getPrisma().session.findUnique({ where: { id } });
      expect(session?.shuffleAnswers).toBe(true);
    });

    it('should create session with shuffleAnswers set to false', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionBankId: 'test-bank',
          shuffleAnswers: false,
        }),
      });

      expect(res.status).toBe(201);
      const { id }: any = await res.json();
      
      // Verify in database
      const session = await getPrisma().session.findUnique({ where: { id } });
      expect(session?.shuffleAnswers).toBe(false);
    });

    it('should create session with shuffleAnswers explicitly set to true', async () => {
      const res = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionBankId: 'test-bank',
          shuffleAnswers: true,
        }),
      });

      expect(res.status).toBe(201);
      const { id }: any = await res.json();
      
      // Verify in database
      const session = await getPrisma().session.findUnique({ where: { id } });
      expect(session?.shuffleAnswers).toBe(true);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with valid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.id).toBe(id);
      expect(data).not.toHaveProperty('hostToken');
    });

    it('should return 401 without host token', async () => {
      const res = await request('/api/sessions/test-id');
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request('/api/sessions/non-existent', {
        headers: { 'X-Host-Token': 'some-token' },
      });
      expect(res.status).toBe(404);
    });

    it('should return 403 for invalid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': 'wrong-token' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete session with valid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'X-Host-Token': hostToken },
      });
      expect(res.status).toBe(200);
      const checkRes = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      expect(checkRes.status).toBe(404);
    });

    it('should return 401 without host token', async () => {
      const res = await request('/api/sessions/test-id', { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for invalid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();
      const res = await request(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'X-Host-Token': 'wrong-token' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/sessions/:id/start', () => {
    it('should start a quiz from lobby state', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.message).toBe('Quiz started');
      expect(data.currentQuestionIndex).toBe(0);

      // Verify session state changed
      const checkRes = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      const sessionData: any = await checkRes.json();
      expect(sessionData.status).toBe('playing');
      expect(sessionData.currentQuestionIndex).toBe(0);
    });

    it('should return 400 if already playing', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Start quiz
      await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // Try to start again
      const res = await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toBe('Session is not in lobby state');
    });

    it('should return 401 without host token', async () => {
      const res = await request('/api/sessions/test-id/start', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/sessions/:id/next', () => {
    it('should move to next question', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Start quiz
      await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // Move to next question
      const res = await request(`/api/sessions/${id}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.message).toBe('Moved to next question');
      expect(data.currentQuestionIndex).toBe(1);
    });

    it('should finish quiz when reaching last question', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Start quiz
      await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // Move to next question (index 0 -> 1)
      await request(`/api/sessions/${id}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // Move next again (should finish, since we have 2 questions)
      const res = await request(`/api/sessions/${id}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.message).toBe('Quiz finished');
      expect(data.status).toBe('finished');

      // Verify session is finished
      const checkRes = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      const sessionData: any = await checkRes.json();
      expect(sessionData.status).toBe('finished');
    });

    it('should return 400 if not playing', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/next`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toBe('Session is not currently playing');
    });
  });

  describe('POST /api/sessions/:id/end', () => {
    it('should end a playing quiz', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Start quiz
      await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // End quiz
      const res = await request(`/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.message).toBe('Quiz ended');

      // Verify session changed to finished
      const checkRes = await request(`/api/sessions/${id}`, {
        headers: { 'X-Host-Token': hostToken },
      });
      const sessionData: any = await checkRes.json();
      expect(sessionData.status).toBe('finished');
    });

    it('should return 400 if already finished', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Start and end quiz
      await request(`/api/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      await request(`/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      // Try to end again
      const res = await request(`/api/sessions/${id}/end`, {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toBe('Session is already finished');
    });
  });

  describe('GET /api/sessions/:id/leaderboard', () => {
    it('should return empty leaderboard for new session', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/leaderboard`);

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.leaderboard).toEqual([]);
    });

    it('should return ranked leaderboard for session with players', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();

      // Add players with different scores
      await getPrisma().player.createMany({
        data: [
          { id: 'p1', sessionId: id, nickname: 'Alice', score: 500, joinedAt: BigInt(Date.now()) },
          { id: 'p2', sessionId: id, nickname: 'Bob', score: 800, joinedAt: BigInt(Date.now()) },
          { id: 'p3', sessionId: id, nickname: 'Charlie', score: 300, joinedAt: BigInt(Date.now()) },
        ],
      });

      const res = await request(`/api/sessions/${id}/leaderboard`);

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.leaderboard).toHaveLength(3);
      expect(data.leaderboard[0]).toBeDefined();
      expect(data.leaderboard[1]).toBeDefined();
      expect(data.leaderboard[2]).toBeDefined();
      expect(data.leaderboard[0].nickname).toBe('Bob');
      expect(data.leaderboard[0].score).toBe(800);
      expect(data.leaderboard[0].rank).toBe(1);
      expect(data.leaderboard[1].nickname).toBe('Alice');
      expect(data.leaderboard[1].rank).toBe(2);
      expect(data.leaderboard[2].nickname).toBe('Charlie');
      expect(data.leaderboard[2].rank).toBe(3);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request('/api/sessions/non-existent/leaderboard');
      expect(res.status).toBe(404);
      const data: any = await res.json();
      expect(data.error).toBe('Session not found');
    });
  });

  describe('GET /api/sessions/:id/question-stats', () => {
    it('should return 401 without host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/question-stats`);
      expect(res.status).toBe(401);
      const data: any = await res.json();
      expect(data.error).toBe('Host token required');
    });

    it('should return 403 with invalid host token', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/question-stats`, {
        headers: { 'X-Host-Token': 'invalid-token' },
      });
      expect(res.status).toBe(403);
      const data: any = await res.json();
      expect(data.error).toBe('Invalid host token');
    });

    it('should return empty question stats for session with no answers', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      const res = await request(`/api/sessions/${id}/question-stats`, {
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.questions).toHaveLength(2);
      expect(data.questions[0]).toMatchObject({
        questionIndex: 0,
        questionId: 'q1',
        questionText: 'Question 1',
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyPercentage: 0,
        difficulty: 'easy',
      });
    });

    it('should return question stats with answer data', async () => {
      const createRes = await request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBankId: 'test-bank' }),
      });
      const { id, hostToken }: any = await createRes.json();

      // Create players
      await getPrisma().player.createMany({
        data: [
          { id: 'p1', sessionId: id, nickname: 'Alice', score: 100, joinedAt: BigInt(Date.now()) },
          { id: 'p2', sessionId: id, nickname: 'Bob', score: 100, joinedAt: BigInt(Date.now()) },
          { id: 'p3', sessionId: id, nickname: 'Charlie', score: 0, joinedAt: BigInt(Date.now()) },
        ],
      });

      // Create answers for q1: 2 correct, 1 incorrect
      await getPrisma().playerAnswer.createMany({
        data: [
          {
            id: 'a1',
            playerId: 'p1',
            questionId: 'q1',
            selectedAnswerIds: JSON.stringify(['a1']),
            isCorrect: true,
            submittedAt: BigInt(Date.now()),
            score: 100,
          },
          {
            id: 'a2',
            playerId: 'p2',
            questionId: 'q1',
            selectedAnswerIds: JSON.stringify(['a1']),
            isCorrect: true,
            submittedAt: BigInt(Date.now()),
            score: 100,
          },
          {
            id: 'a3',
            playerId: 'p3',
            questionId: 'q1',
            selectedAnswerIds: JSON.stringify(['a2']),
            isCorrect: false,
            submittedAt: BigInt(Date.now()),
            score: 0,
          },
        ],
      });

      const res = await request(`/api/sessions/${id}/question-stats`, {
        headers: { 'X-Host-Token': hostToken },
      });

      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.questions).toHaveLength(2);
      
      // Check stats for q1
      expect(data.questions[0]).toMatchObject({
        questionIndex: 0,
        questionId: 'q1',
        questionText: 'Question 1',
        totalAnswers: 3,
        correctAnswers: 2,
        incorrectAnswers: 1,
        accuracyPercentage: 67, // 2/3 = 66.67% rounded to 67
        difficulty: 'easy',
      });

      // Check stats for q2 (no answers)
      expect(data.questions[1]).toMatchObject({
        questionIndex: 1,
        questionId: 'q2',
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyPercentage: 0,
      });
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request('/api/sessions/non-existent/question-stats', {
        headers: { 'X-Host-Token': 'some-token' },
      });
      expect(res.status).toBe(404);
      const data: any = await res.json();
      expect(data.error).toBe('Session not found');
    });
  });
});
