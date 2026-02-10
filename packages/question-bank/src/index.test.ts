import { describe, it, expect } from 'vitest';
import { parseQuestionBank, filterQuestions, getRandomQuestions } from './index';
import type { Question } from '@quizzquizz/common';

describe('parseQuestionBank', () => {
  it('should parse a valid question bank', () => {
    const markdown = `# Question Bank: Test Bank

## Metadata
- **Topics**: science, math
- **Default Time Limit**: 30s
- **Description**: A test bank

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: science
**Tags**: physics, gravity

What is the speed of light?

- [x] 299,792,458 m/s
- [ ] 150,000,000 m/s
- [ ] 500,000,000 m/s

---

### Q002
**Difficulty**: medium
**Topics**: math
**Tags**: algebra

Which are prime numbers?

- [x] 2
- [ ] 4
- [x] 3
- [ ] 6

---
`;

    const bank = parseQuestionBank(markdown, 'test-bank');

    expect(bank.id).toBe('test-bank');
    expect(bank.metadata.name).toBe('Test Bank');
    expect(bank.metadata.description).toBe('A test bank');
    expect(bank.metadata.topics).toEqual(['science', 'math']);
    expect(bank.metadata.defaultTimeLimit).toBe(30);
    expect(bank.questions).toHaveLength(2);
  });

  it('should parse question metadata correctly', () => {
    const markdown = `# Question Bank: Test

## Metadata
- **Topics**: test
- **Default Time Limit**: 20s

---

## Questions

### Q001
**Difficulty**: hard
**Topics**: advanced
**Tags**: complex, tricky
**Time Limit**: 45

What is the answer?

- [x] Correct
- [ ] Wrong

---
`;

    const bank = parseQuestionBank(markdown, 'test');
    const q = bank.questions[0];
    expect(q).toBeDefined();
    if (!q) throw new Error('Question not defined');

    expect(q.id).toBe('Q001');
    expect(q.difficulty).toBe('hard');
    expect(q.topics).toEqual(['advanced']);
    expect(q.tags).toEqual(['complex', 'tricky']);
    expect(q.timeLimit).toBe(45);
  });

  it('should identify correct answers', () => {
    const markdown = `# Question Bank: Test

## Metadata
- **Topics**: test
- **Default Time Limit**: 20s

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: test
**Tags**: test

Multiple correct answers?

- [x] Yes
- [ ] No
- [x] Maybe
- [ ] Never

---
`;

    const bank = parseQuestionBank(markdown, 'test');
    const q = bank.questions[0];
    expect(q).toBeDefined();
    if (!q) throw new Error('Question not defined');

    expect(q.correctAnswerIds).toHaveLength(2);
    expect(q.answers).toHaveLength(4);
    expect(q.correctAnswerIds).toContain('Q001_A1');
    expect(q.correctAnswerIds).toContain('Q001_A3');
  });

  it('should handle questions without optional metadata', () => {
    const markdown = `# Question Bank: Minimal

## Metadata
- **Topics**: test
- **Default Time Limit**: 20s

---

## Questions

### Q001
**Difficulty**: medium
**Topics**: basic
**Tags**: simple

Simple question?

- [x] Yes
- [ ] No

---
`;

    const bank = parseQuestionBank(markdown, 'minimal');
    const q = bank.questions[0];
    expect(q).toBeDefined();
    if (!q) throw new Error('Question not defined');

    expect(q.timeLimit).toBeUndefined();
    expect(q.difficulty).toBe('medium');
  });

  it('should throw error for missing metadata section', () => {
    const markdown = `# Question Bank: Bad

### Q001
Question without metadata section
`;

    expect(() => parseQuestionBank(markdown, 'bad')).toThrow(
      'Missing ## Metadata section'
    );
  });

  it('should throw error for missing name', () => {
    const markdown = `## Metadata
- **Topics**: test
- **Default Time Limit**: 20s

---
`;

    expect(() => parseQuestionBank(markdown, 'bad')).toThrow(
      'Question bank must have a name in the title'
    );
  });
});

describe('filterQuestions', () => {
  const questions: Question[] = [
    {
      id: 'Q1',
      text: 'Easy science question',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['science'],
      tags: ['physics'],
    },
    {
      id: 'Q2',
      text: 'Hard math question',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'hard',
      topics: ['math'],
      tags: ['algebra'],
    },
    {
      id: 'Q3',
      text: 'Medium science question',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'medium',
      topics: ['science'],
      tags: ['biology'],
    },
  ];

  it('should filter by difficulty', () => {
    const filtered = filterQuestions(questions, { difficulty: 'easy' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('Q1');
  });

  it('should filter by topics', () => {
    const filtered = filterQuestions(questions, { topics: ['science'] });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((q) => q.id)).toEqual(['Q1', 'Q3']);
  });

  it('should filter by tags', () => {
    const filtered = filterQuestions(questions, { tags: ['physics'] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('Q1');
  });

  it('should filter by multiple criteria', () => {
    const filtered = filterQuestions(questions, {
      topics: ['science'],
      difficulty: 'easy',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('Q1');
  });

  it('should limit results', () => {
    const filtered = filterQuestions(questions, { limit: 2 });
    expect(filtered).toHaveLength(2);
  });

  it('should return all questions with empty filter', () => {
    const filtered = filterQuestions(questions, {});
    expect(filtered).toHaveLength(3);
  });
});

describe('getRandomQuestions', () => {
  const questions: Question[] = [
    {
      id: 'Q1',
      text: 'Question 1',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['test'],
      tags: [],
    },
    {
      id: 'Q2',
      text: 'Question 2',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['test'],
      tags: [],
    },
    {
      id: 'Q3',
      text: 'Question 3',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['test'],
      tags: [],
    },
  ];

  it('should return requested number of questions', () => {
    const random = getRandomQuestions(questions, 2);
    expect(random).toHaveLength(2);
  });

  it('should not return more than available', () => {
    const random = getRandomQuestions(questions, 10);
    expect(random).toHaveLength(3);
  });

  it('should return different questions on multiple calls', () => {
    const results = new Set<string>();
    
    // Run multiple times to check randomness
    for (let i = 0; i < 10; i++) {
      const random = getRandomQuestions(questions, 3);
      results.add(random.map((q) => q.id).join(','));
    }
    
    // Should have at least 2 different orderings in 10 attempts
    expect(results.size).toBeGreaterThan(1);
  });

  it('should not modify original array', () => {
    const original = [...questions];
    getRandomQuestions(questions, 2);
    expect(questions).toEqual(original);
  });
});
