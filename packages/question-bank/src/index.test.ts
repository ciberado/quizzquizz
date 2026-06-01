import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  parseQuestionBank,
  filterQuestions,
  getRandomQuestions,
  loadQuestionBankTree,
  flattenBankTree,
  loadQuestionBanks,
} from './index';
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

  it('should preserve colons in hierarchical topic and tag values', () => {
    const markdown = `# Question Bank: Colon Test

## Metadata
- **Topics**: architecture:ha:multi-region-design, database:nosql:global-tables
- **Default Time Limit**: 30s

---

## Questions

### Q001
**Difficulty**: medium
**Topics**: architecture:ha:multi-region-design, database:nosql:global-tables
**Tags**: dynamodb:global-tables, s3:replication

Which service provides multi-region replication?

- [x] DynamoDB Global Tables
- [ ] RDS Read Replicas

---
`;

    const bank = parseQuestionBank(markdown, 'colon-test');
    expect(bank.metadata.topics).toEqual([
      'architecture:ha:multi-region-design',
      'database:nosql:global-tables',
    ]);

    const q = bank.questions[0];
    expect(q).toBeDefined();
    if (!q) throw new Error('Question not defined');
    expect(q.topics).toEqual([
      'architecture:ha:multi-region-design',
      'database:nosql:global-tables',
    ]);
    expect(q.tags).toEqual(['dynamodb:global-tables', 's3:replication']);
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
      status: 'active',
    },
    {
      id: 'Q2',
      text: 'Hard math question',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'hard',
      topics: ['math'],
      tags: ['algebra'],
      status: 'active',
    },
    {
      id: 'Q3',
      text: 'Medium science question',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'medium',
      topics: ['science'],
      tags: ['biology'],
      status: 'active',
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
      status: 'active',
    },
    {
      id: 'Q2',
      text: 'Question 2',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['test'],
      tags: [],
      status: 'active',
    },
    {
      id: 'Q3',
      text: 'Question 3',
      answers: [{ id: 'A1', text: 'Answer' }],
      correctAnswerIds: ['A1'],
      difficulty: 'easy',
      topics: ['test'],
      tags: [],
      status: 'active',
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

// ─── Tree loader tests ────────────────────────────────────────────────────────

/** Minimal valid question bank markdown for fixture files. */
function minimalBankMd(name: string): string {
  return `# Question Bank: ${name}

## Metadata
- **Topics**: test

---

## Questions

### Q001
**Difficulty**: easy

What is 1+1?

- [x] 2
- [ ] 3

---
`;
}

/** Create a temp dir, run tests, delete it after. */
function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'qb-test-'));
}

describe('loadQuestionBankTree', () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const d of tmps) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    tmps.length = 0;
  });

  it('returns root-level banks with filename-stem ids', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    writeFileSync(join(dir, 'my-bank.md'), minimalBankMd('My Bank'));
    const { tree, banks } = loadQuestionBankTree(dir);
    expect(tree.banks).toHaveLength(1);
    expect(tree.banks[0]!.id).toBe('my-bank');
    expect(banks.has('my-bank')).toBe(true);
    expect(banks.get('my-bank')!.metadata.name).toBe('My Bank');
  });

  it('returns nested structure with path-based ids', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'science', 'physics'), { recursive: true });
    writeFileSync(join(dir, 'science', 'physics', 'mechanics.md'), minimalBankMd('Mechanics'));
    const { tree, banks } = loadQuestionBankTree(dir);
    expect(tree.folders).toHaveLength(1);
    const science = tree.folders[0]!;
    expect(science.name).toBe('science');
    expect(science.path).toBe('science');
    const physics = science.folders[0]!;
    expect(physics.name).toBe('physics');
    expect(physics.path).toBe('science/physics');
    expect(physics.banks[0]!.id).toBe('science/physics/mechanics');
    expect(banks.has('science/physics/mechanics')).toBe(true);
  });

  it('symlinked .md in two dirs → same id, appears in both folder positions', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'a'));
    mkdirSync(join(dir, 'b'));
    writeFileSync(join(dir, 'a', 'shared.md'), minimalBankMd('Shared Bank'));
    symlinkSync(join(dir, 'a', 'shared.md'), join(dir, 'b', 'shared.md'));
    const { tree, banks } = loadQuestionBankTree(dir);
    const aBank = tree.folders.find(f => f.name === 'a')!.banks[0]!;
    const bBank = tree.folders.find(f => f.name === 'b')!.banks[0]!;
    expect(aBank.id).toBe('a/shared');
    expect(bBank.id).toBe('a/shared'); // same canonical id
    expect(banks.size).toBe(1); // only one entry in map
  });

  it('symlink outside rootDir is skipped with no crash', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    const outsideDir = makeTmpDir(); tmps.push(outsideDir);
    writeFileSync(join(outsideDir, 'outside.md'), minimalBankMd('Outside'));
    symlinkSync(join(outsideDir, 'outside.md'), join(dir, 'outside.md'));
    const { tree, banks } = loadQuestionBankTree(dir);
    expect(tree.banks).toHaveLength(0);
    expect(banks.size).toBe(0);
  });

  it('empty subdirectory is included as empty folder', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'empty-folder'));
    const { tree } = loadQuestionBankTree(dir);
    expect(tree.folders).toHaveLength(1);
    expect(tree.folders[0]!.name).toBe('empty-folder');
    expect(tree.folders[0]!.banks).toHaveLength(0);
    expect(tree.folders[0]!.folders).toHaveLength(0);
  });

  it('folders are sorted alphabetically by dir name, banks by file id (not display name)', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'z-folder'));
    mkdirSync(join(dir, 'a-folder'));
    // z-bank.md has display name 'Aardvark', a-bank.md has 'Zebra' — file order wins
    writeFileSync(join(dir, 'z-bank.md'), minimalBankMd('Aardvark'));
    writeFileSync(join(dir, 'a-bank.md'), minimalBankMd('Zebra'));
    const { tree } = loadQuestionBankTree(dir);
    expect(tree.folders[0]!.name).toBe('a-folder');
    expect(tree.folders[1]!.name).toBe('z-folder');
    // sorted by id (file stem): 'a-bank' < 'z-bank'
    expect(tree.banks[0]!.id).toBe('a-bank');
    expect(tree.banks[1]!.id).toBe('z-bank');
    // display names are intentionally in reverse to prove id-ordering was used
    expect(tree.banks[0]!.name).toBe('Zebra');
    expect(tree.banks[1]!.name).toBe('Aardvark');
  });

  it('ignores hidden files and directories (names starting with ".")', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    // A visible bank that should be loaded
    writeFileSync(join(dir, 'visible.md'), minimalBankMd('Visible'));
    // A hidden markdown file — should be skipped
    writeFileSync(join(dir, '.hidden.md'), minimalBankMd('Hidden File'));
    // A hidden directory (e.g. .git) — should be skipped entirely
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git', 'some-bank.md'), minimalBankMd('Inside Git'));
    const { tree, banks } = loadQuestionBankTree(dir);
    expect(banks.size).toBe(1);
    expect(tree.banks).toHaveLength(1);
    expect(tree.banks[0]!.id).toBe('visible');
    expect(tree.folders).toHaveLength(0);
  });

  it('reserved root-level stems are skipped', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    writeFileSync(join(dir, 'bank.md'), minimalBankMd('Bank Reserved'));
    writeFileSync(join(dir, 'questions.md'), minimalBankMd('Questions Reserved'));
    writeFileSync(join(dir, 'ok.md'), minimalBankMd('OK'));
    const { tree, banks } = loadQuestionBankTree(dir);
    expect(banks.size).toBe(1);
    expect(tree.banks[0]!.id).toBe('ok');
  });
});

describe('flattenBankTree', () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const d of tmps) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    tmps.length = 0;
  });

  it('returns banks depth-first', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'root-bank.md'), minimalBankMd('Root'));
    writeFileSync(join(dir, 'sub', 'sub-bank.md'), minimalBankMd('Sub'));
    const { tree, banks } = loadQuestionBankTree(dir);
    const flat = flattenBankTree(tree, banks);
    expect(flat).toHaveLength(2);
    // root bank comes first (banks before sub-folders processing); sub second
    const ids = flat.map(b => b.id);
    expect(ids).toContain('root-bank');
    expect(ids).toContain('sub/sub-bank');
  });

  it('deduplicates symlinked banks — each canonical id appears exactly once', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'a'));
    mkdirSync(join(dir, 'b'));
    writeFileSync(join(dir, 'a', 'shared.md'), minimalBankMd('Shared'));
    symlinkSync(join(dir, 'a', 'shared.md'), join(dir, 'b', 'shared.md'));
    const { tree, banks } = loadQuestionBankTree(dir);
    const flat = flattenBankTree(tree, banks);
    expect(flat).toHaveLength(1);
    expect(flat[0]!.id).toBe('a/shared');
  });
});

describe('loadQuestionBanks (compatibility shim)', () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const d of tmps) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    tmps.length = 0;
  });

  it('returns all banks including nested dirs, deduplicated', () => {
    const dir = makeTmpDir(); tmps.push(dir);
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'root.md'), minimalBankMd('Root'));
    writeFileSync(join(dir, 'sub', 'nested.md'), minimalBankMd('Nested'));
    const banks = loadQuestionBanks(dir);
    expect(banks).toHaveLength(2);
    const ids = banks.map(b => b.id).sort();
    expect(ids).toEqual(['root', 'sub/nested']);
  });
});
