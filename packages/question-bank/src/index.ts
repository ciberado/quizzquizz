import { readFileSync, readdirSync, statSync, realpathSync } from 'fs';
import { join, extname, relative, isAbsolute } from 'path';
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

// ─── Tree types ──────────────────────────────────────────────────────────────

/** Lightweight bank descriptor used inside folder trees (no question payload). */
export interface QuestionBankSummary {
  id: string;
  name: string;
  description?: string;
  topics: string[];
  questionCount: number;
}

/** Node in the question-bank folder tree. */
export interface QuestionBankFolder {
  /** Raw directory basename (empty string for root). */
  name: string;
  /** Relative path from rootDir using '/' separators (empty string for root). */
  path: string;
  folders: QuestionBankFolder[];
  banks: QuestionBankSummary[];
}

/** Result of loadQuestionBankTree — tree for browsing + full bank map for lookups. */
export interface LoadQuestionBankTreeResult {
  tree: QuestionBankFolder;
  /** Canonical id → full QuestionBank (deduplicated across symlinks). */
  banks: Map<string, QuestionBank>;
}

/** File-stem IDs that collide with fixed API route paths; skipped by the loader. */
const RESERVED_STEMS = new Set(['bank', 'questions', 'stats', 'reload']);

// ─── File-level loaders ──────────────────────────────────────────────────────

/**
 * Load a question bank from a file.
 * @param filePath  Absolute path to the .md file.
 * @param bankId    Explicit id; defaults to the filename stem.
 */
export function loadQuestionBank(filePath: string, bankId?: string): QuestionBank {
  const content = readFileSync(filePath, 'utf-8');
  const resolvedId = bankId ?? (filePath.split('/').pop()?.replace('.md', '') || 'unknown');
  return parseQuestionBank(content, resolvedId);
}

// ─── Tree loader ─────────────────────────────────────────────────────────────

/**
 * Recursively scan `rootDir` and return a folder tree of summaries plus a
 * deduplicated Map of full QuestionBank objects keyed by canonical id.
 *
 * Symlinked .md files are included at every logical position in the tree but
 * share a single id (canonical path relative to rootDir) so statistics remain
 * unified.  Symlinks that point outside rootDir are skipped with a warning.
 * Circular directory symlinks are detected via ancestor tracking and skipped.
 */
export function loadQuestionBankTree(rootDir: string): LoadQuestionBankTreeResult {
  const realRoot = realpathSync(rootDir);
  const banksMap = new Map<string, QuestionBank>();

  function buildFolder(
    logicalDir: string,
    folderName: string,
    folderPath: string,
    ancestorRealDirs: ReadonlySet<string>,
  ): QuestionBankFolder {
    const folder: QuestionBankFolder = { name: folderName, path: folderPath, folders: [], banks: [] };

    let entries: string[];
    try {
      entries = readdirSync(logicalDir);
    } catch {
      return folder;
    }

    for (const entry of entries) {
      const logicalEntryPath = join(logicalDir, entry);

      let realPath: string;
      try {
        realPath = realpathSync(logicalEntryPath);
      } catch {
        continue; // dangling symlink or permission error
      }

      let realStat: ReturnType<typeof statSync>;
      try {
        realStat = statSync(realPath);
      } catch {
        continue;
      }

      if (realStat.isFile() && extname(entry) === '.md') {
        // Compute id from canonical path relative to realRoot
        const relPath = relative(realRoot, realPath);
        if (relPath.startsWith('..') || isAbsolute(relPath)) {
          console.warn(`[question-bank] Skipping ${logicalEntryPath}: canonical path is outside rootDir`);
          continue;
        }
        const bankId = relPath.replace(/\.md$/, '').replace(/\\/g, '/'); // normalise on Windows

        // Reject reserved stems (root-level only, where id has no '/')
        if (!bankId.includes('/') && RESERVED_STEMS.has(bankId)) {
          console.warn(`[question-bank] Skipping ${logicalEntryPath}: id "${bankId}" is reserved`);
          continue;
        }

        // Load full bank once per canonical id; reuse on subsequent encounters
        let bank: QuestionBank;
        if (banksMap.has(bankId)) {
          bank = banksMap.get(bankId)!;
        } else {
          try {
            bank = loadQuestionBank(realPath, bankId);
            banksMap.set(bankId, bank);
          } catch (err) {
            console.warn(`[question-bank] Failed to load ${realPath}: ${err}`);
            continue;
          }
        }

        folder.banks.push({
          id: bank.id,
          name: bank.metadata.name,
          description: bank.metadata.description,
          topics: bank.metadata.topics,
          questionCount: bank.questions.length,
        });

      } else if (realStat.isDirectory()) {
        if (ancestorRealDirs.has(realPath)) {
          console.warn(`[question-bank] Skipping ${logicalEntryPath}: circular symlink detected`);
          continue;
        }
        const childAncestors = new Set(ancestorRealDirs);
        childAncestors.add(realPath);
        const subFolderPath = folderPath ? `${folderPath}/${entry}` : entry;
        const subFolder = buildFolder(realPath, entry, subFolderPath, childAncestors);
        folder.folders.push(subFolder);
      }
    }

    // Sort: folders first (alphabetical), then banks (alphabetical by display name)
    folder.folders.sort((a, b) => a.name.localeCompare(b.name));
    folder.banks.sort((a, b) => a.name.localeCompare(b.name));
    return folder;
  }

  const initialAncestors = new Set<string>([realRoot]);
  const tree = buildFolder(realRoot, '', '', initialAncestors);
  return { tree, banks: banksMap };
}

// ─── Flatten utility ─────────────────────────────────────────────────────────

/**
 * Depth-first flatten of a QuestionBankFolder tree into a deduplicated array
 * of full QuestionBank objects.  A single canonical bank that appears at
 * multiple logical locations (via symlinks) is included exactly once.
 */
export function flattenBankTree(
  root: QuestionBankFolder,
  banks: Map<string, QuestionBank>,
): QuestionBank[] {
  const seenIds = new Set<string>();
  const result: QuestionBank[] = [];

  function traverse(folder: QuestionBankFolder): void {
    for (const summary of folder.banks) {
      if (!seenIds.has(summary.id)) {
        seenIds.add(summary.id);
        const bank = banks.get(summary.id);
        if (bank) result.push(bank);
      }
    }
    for (const sub of folder.folders) traverse(sub);
  }

  traverse(root);
  return result;
}

/**
 * Load all question banks from a directory (compatibility shim).
 * Returns full QuestionBank objects, deduplicated by canonical id.
 */
export function loadQuestionBanks(dirPath: string): QuestionBank[] {
  const { banks } = loadQuestionBankTree(dirPath);
  return Array.from(banks.values());
}

// ─── Filter / random utilities ───────────────────────────────────────────────

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
