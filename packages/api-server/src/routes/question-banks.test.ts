import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import questionBankRoutes from '../routes/question-banks';
import { questionBanks, setBankTree } from '../state';
import { QuestionBank } from '@quizzquizz/common';

const app = new Hono();
app.route('/api/question-banks', questionBankRoutes);

async function request(path: string, options: RequestInit = {}) {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
}

describe('Question Bank Routes', () => {
  beforeAll(() => {
    const testBank1: QuestionBank = {
      id: 'test-bank-1',
      metadata: {
        name: 'Test Bank 1',
        description: 'A test bank',
        topics: ['math', 'science'],
        defaultTimeLimit: 20,
      },
      questions: [{
        id: 'Q1',
        text: 'Test question?',
        answers: [{ id: 'A1', text: 'Answer 1' }, { id: 'A2', text: 'Answer 2' }],
        correctAnswerIds: ['A1'],
        difficulty: 'easy',
        topics: ['math'],
        tags: ['arithmetic'],
      }],
    };

    const testBank2: QuestionBank = {
      id: 'test-bank-2',
      metadata: {
        name: 'Test Bank 2',
        topics: ['history'],
        defaultTimeLimit: 30,
      },
      questions: [
        {
          id: 'Q1',
          text: 'History question?',
          answers: [{ id: 'A1', text: 'Year 1' }, { id: 'A2', text: 'Year 2' }],
          correctAnswerIds: ['A2'],
          difficulty: 'medium',
          topics: ['history'],
          tags: ['dates'],
        },
        {
          id: 'Q2',
          text: 'Another history question?',
          answers: [{ id: 'A1', text: 'Event 1' }, { id: 'A2', text: 'Event 2' }],
          correctAnswerIds: ['A1'],
          difficulty: 'hard',
          topics: ['history'],
          tags: ['events'],
        },
      ],
    };

    questionBanks.set('test-bank-1', testBank1);
    questionBanks.set('test-bank-2', testBank2);

    // Set up the folder tree so GET /api/question-banks includes these banks
    setBankTree({
      name: '', path: '', folders: [],
      banks: [
        { id: 'test-bank-1', name: testBank1.metadata.name, description: testBank1.metadata.description, topics: testBank1.metadata.topics, questionCount: testBank1.questions.length },
        { id: 'test-bank-2', name: testBank2.metadata.name, description: testBank2.metadata.description, topics: testBank2.metadata.topics, questionCount: testBank2.questions.length },
      ],
    });
  });

  describe('GET /api/question-banks', () => {
    it('should return a folder tree with the banks at root', async () => {
      const res = await request('/api/question-banks');
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.tree).toBeDefined();
      expect(data.tree.banks).toHaveLength(2);
    });

    it('should include question count in tree banks', async () => {
      const res = await request('/api/question-banks');
      const data: any = await res.json();
      const bank1 = data.tree.banks.find((b: any) => b.id === 'test-bank-1');
      const bank2 = data.tree.banks.find((b: any) => b.id === 'test-bank-2');
      expect(bank1).toBeDefined();
      expect(bank2).toBeDefined();
      expect(bank1.questionCount).toBe(1);
      expect(bank2.questionCount).toBe(2);
    });

    it('should include optional description in tree banks', async () => {
      const res = await request('/api/question-banks');
      const data: any = await res.json();
      const bank1 = data.tree.banks.find((b: any) => b.id === 'test-bank-1');
      const bank2 = data.tree.banks.find((b: any) => b.id === 'test-bank-2');
      expect(bank1).toBeDefined();
      expect(bank2).toBeDefined();
      expect(bank1.description).toBe('A test bank');
      expect(bank2.description).toBeUndefined();
    });
  });

  describe('GET /api/question-banks/bank?id=', () => {
    it('should return full question bank by query param id', async () => {
      const res = await request('/api/question-banks/bank?id=test-bank-1');
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.id).toBe('test-bank-1');
      expect(data.metadata.name).toBe('Test Bank 1');
    });

    it('should return 400 when id param is missing', async () => {
      const res = await request('/api/question-banks/bank');
      expect(res.status).toBe(400);
    });

    it('should return 404 for unknown id', async () => {
      const res = await request('/api/question-banks/bank?id=no-such-bank');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/question-banks/questions?bankId=', () => {
    it('should return questions for a bank', async () => {
      const res = await request('/api/question-banks/questions?bankId=test-bank-2');
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.questions).toHaveLength(2);
    });

    it('should return 400 when bankId is missing', async () => {
      const res = await request('/api/question-banks/questions');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/question-banks/:id', () => {
    it('should return full question bank with questions', async () => {
      const res = await request('/api/question-banks/test-bank-1');
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.id).toBe('test-bank-1');
      expect(data.metadata.name).toBe('Test Bank 1');
      expect(data.questions).toHaveLength(1);
      expect(data.questions[0]).toBeDefined();
      expect(data.questions[0].id).toBe('Q1');
      expect(data.questions[0].answers).toHaveLength(2);
    });

    it('should return 404 for non-existent bank', async () => {
      const res = await request('/api/question-banks/non-existent');
      expect(res.status).toBe(404);
    });

    it('should include all question details', async () => {
      const res = await request('/api/question-banks/test-bank-2');
      const data: any = await res.json();
      const question = data.questions[0];
      expect(question).toBeDefined();
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('text');
      expect(question).toHaveProperty('answers');
      expect(question).toHaveProperty('correctAnswerIds');
      expect(question).toHaveProperty('difficulty');
      expect(question).toHaveProperty('topics');
      expect(question).toHaveProperty('tags');
    });
  });

  describe('POST /api/question-banks/reload', () => {
    it('should reload question banks successfully', async () => {
      const res = await request('/api/question-banks/reload', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.banks).toBeDefined();
      expect(Array.isArray(data.banks)).toBe(true);
    });

    it('should return list of reloaded banks with metadata', async () => {
      const res = await request('/api/question-banks/reload', {
        method: 'POST',
      });
      const data: any = await res.json();
      expect(data.banks).toBeDefined();
      expect(Array.isArray(data.banks)).toBe(true);
      
      // Each bank should have id, name, and questionCount
      data.banks.forEach((bank: any) => {
        expect(bank).toHaveProperty('id');
        expect(bank).toHaveProperty('name');
        expect(bank).toHaveProperty('questionCount');
        expect(typeof bank.id).toBe('string');
        expect(typeof bank.name).toBe('string');
        expect(typeof bank.questionCount).toBe('number');
      });
    });

    it('should allow reload without authentication', async () => {
      // No authentication headers required
      const res = await request('/api/question-banks/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.success).toBe(true);
    });
  });
});