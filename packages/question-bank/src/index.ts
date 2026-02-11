import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import {
  Question,
  QuestionBank,
  QuestionSchema,
  QuestionBankSchema,
  DifficultySchema,
} from '@quizzquizz/common';

interface ParsedMetadata {
  name: string;
  description?: string;
  topics: string[];
  defaultTimeLimit: number;
}

interface ParsedQuestion {
  id: string;
  text: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean }>;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  tags: string[];
  timeLimit?: number;
}

/**
 * Parse the metadata section of a question bank markdown file
 */
function parseMetadata(content: string): ParsedMetadata {
  const lines = content.split('\n');
  const metadata: Partial<ParsedMetadata> = {
    topics: [],
    defaultTimeLimit: 20,
  };

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+Question Bank:\s*(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    metadata.name = titleMatch[1].trim();
  }

  // Find metadata section
  const metadataStart = lines.findIndex((line) => line.trim() === '## Metadata');
  if (metadataStart === -1) {
    throw new Error('Missing ## Metadata section');
  }

  const metadataEnd = lines.findIndex(
    (line, idx) => idx > metadataStart && line.trim() === '---'
  );

  for (let i = metadataStart + 1; i < metadataEnd; i++) {
    const line = lines[i]?.trim();
    if (!line || !line.startsWith('-')) continue;

    const match = line.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)$/);
    if (!match || !match[1] || !match[2]) continue;

    const [, key, value] = match;
    const trimmedValue = value.trim();

    switch (key) {
      case 'Topics':
        metadata.topics = trimmedValue.split(',').map((t) => t.trim());
        break;
      case 'Default Time Limit': {
        const timeMatch = trimmedValue.match(/(\d+)/);
        if (timeMatch && timeMatch[1]) {
          metadata.defaultTimeLimit = parseInt(timeMatch[1], 10);
        }
        break;
      }
      case 'Description':
        metadata.description = trimmedValue;
        break;
    }
  }

  if (!metadata.name) {
    throw new Error('Question bank must have a name in the title');
  }

  return metadata as ParsedMetadata;
}

/**
 * Parse a single question section
 */
function parseQuestion(
  section: string,
  questionId: string
): ParsedQuestion | null {
  const lines = section.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return null;

  const question: Partial<ParsedQuestion> & { 
    answers: Array<{ id: string; text: string; isCorrect: boolean }>; 
    topics: string[]; 
    tags: string[] 
  } = {
    id: questionId,
    answers: [],
    difficulty: 'medium',
    topics: [],
    tags: [],
  };

  let textStartIdx = 0;

  // Parse metadata lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    if (line.startsWith('**Difficulty**:')) {
      const parts = line.split(':');
      if (!parts[1]) continue;
      const diff = parts[1].trim() as 'easy' | 'medium' | 'hard';
      const result = DifficultySchema.safeParse(diff);
      if (result.success) {
        question.difficulty = result.data;
      }
      textStartIdx = i + 1;
    } else if (line.startsWith('**Topics**:')) {
      const topicPart = line.split(':')[1];
      if (topicPart) {
        question.topics = topicPart
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
      textStartIdx = i + 1;
    } else if (line.startsWith('**Tags**:')) {
      const tagPart = line.split(':')[1];
      if (tagPart) {
        question.tags = tagPart
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
      textStartIdx = i + 1;
    } else if (line.startsWith('**Time Limit**:')) {
      const timeMatch = line.match(/(\d+)/);
      if (timeMatch && timeMatch[1]) {
        question.timeLimit = parseInt(timeMatch[1], 10);
      }
      textStartIdx = i + 1;
    } else if (!line.startsWith('**')) {
      break;
    }
  }

  // Find where answers start
  let answerStartIdx = textStartIdx;
  for (let i = textStartIdx; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    if (line.startsWith('- [')) {
      answerStartIdx = i;
      break;
    }
  }

  // Extract question text (between metadata and answers)
  const questionTextLines = lines
    .slice(textStartIdx, answerStartIdx)
    .filter((line) => line.trim() && !line.startsWith('**'));
  question.text = questionTextLines.join(' ').trim();

  if (!question.text) {
    return null;
  }

  // Parse answers
  for (let i = answerStartIdx; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line || !line.startsWith('- [')) continue;

    const match = line.match(/^-\s+\[([x\s])\]\s+(.+)$/);
    if (match && match[1] && match[2]) {
      const [, checked, text] = match;
      const answerId = `${questionId}_A${question.answers.length + 1}`;
      question.answers.push({
        id: answerId,
        text: text.trim(),
        isCorrect: checked.toLowerCase() === 'x',
      });
    }
  }

  if (question.answers.length === 0) {
    return null;
  }

  return question as ParsedQuestion;
}

/**
 * Parse a markdown question bank file
 */
export function parseQuestionBank(content: string, bankId: string): QuestionBank {
  const metadata = parseMetadata(content);

  // Split into question sections
  const sections = content.split(/^###\s+/m).slice(1);

  const questions: Question[] = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const questionId = lines[0]?.trim();
    if (!questionId) continue;

    const parsed = parseQuestion(lines.slice(1).join('\n'), questionId);
    if (!parsed) continue;

    const correctAnswerIds = parsed.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id);

    const question: Question = {
      id: parsed.id,
      text: parsed.text,
      answers: parsed.answers.map((a) => ({ id: a.id, text: a.text })),
      correctAnswerIds,
      difficulty: parsed.difficulty,
      topics: parsed.topics,
      tags: parsed.tags,
      timeLimit: parsed.timeLimit,
    };

    // Validate with Zod
    const result = QuestionSchema.safeParse(question);
    if (result.success) {
      questions.push(result.data);
    } else {
      console.warn(`Invalid question ${parsed.id}:`, result.error);
    }
  }

  const questionBank: QuestionBank = {
    id: bankId,
    metadata: {
      name: metadata.name,
      description: metadata.description,
      topics: metadata.topics,
      defaultTimeLimit: metadata.defaultTimeLimit,
    },
    questions,
  };

  // Validate the entire bank
  const result = QuestionBankSchema.safeParse(questionBank);
  if (!result.success) {
    throw new Error(`Invalid question bank: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Load a question bank from a file
 */
export function loadQuestionBank(filePath: string): QuestionBank {
  const content = readFileSync(filePath, 'utf-8');
  const bankId = filePath.split('/').pop()?.replace('.md', '') || 'unknown';
  return parseQuestionBank(content, bankId);
}

/**
 * Load all question banks from a directory
 */
export function loadQuestionBanks(dirPath: string): QuestionBank[] {
  const banks: QuestionBank[] = [];

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      if (extname(file) !== '.md') continue;

      const filePath = join(dirPath, file);
      const stat = statSync(filePath);

      if (stat.isFile()) {
        try {
          const bank = loadQuestionBank(filePath);
          banks.push(bank);
        } catch (error) {
          console.error(`Failed to load question bank ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to read directory ${dirPath}:`, error);
  }

  return banks;
}

/**
 * Filter questions by criteria
 */
export function filterQuestions(
  questions: Question[],
  options: {
    difficulty?: 'easy' | 'medium' | 'hard';
    topics?: string[];
    tags?: string[];
    limit?: number;
  }
): Question[] {
  let filtered = [...questions];

  if (options.difficulty) {
    filtered = filtered.filter((q) => q.difficulty === options.difficulty);
  }

  if (options.topics && options.topics.length > 0) {
    const topicsToFilter = options.topics;
    filtered = filtered.filter((q) =>
      q.topics.some((t) => topicsToFilter.includes(t))
    );
  }

  if (options.tags && options.tags.length > 0) {
    const tagsToFilter = options.tags;
    filtered = filtered.filter((q) =>
      q.tags.some((t) => tagsToFilter.includes(t))
    );
  }

  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get random questions from a question bank
 */
export function getRandomQuestions(
  questions: Question[],
  count: number
): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}
