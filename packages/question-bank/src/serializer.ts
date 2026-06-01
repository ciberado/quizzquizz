/**
 * Markdown serializer for question bank questions.
 *
 * Provides round-trip editing: parse → modify → serialize → re-parse.
 * The serialized output is appended to the `### <id>` header line by
 * `updateQuestionInFile`, so the body must NOT include the header itself.
 */

import { readFileSync, writeFileSync } from 'fs';
import type { Question, QuestionEdit } from '@quizzquizz/common';

// ─── Body serialiser ─────────────────────────────────────────────────────────

/**
 * Build the Markdown body for a question (everything after the `### ID` header).
 * Attributes are written in canonical order; omitted when at their default value.
 */
export function serializeQuestionBody(q: {
  text: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
  difficulty?: 'easy' | 'medium' | 'hard';
  topics?: string[];
  tags?: string[];
  timeLimit?: number;
  status?: 'active' | 'deactivated' | 'deleted';
  flag?: string;
}): string {
  const lines: string[] = [];

  if (q.difficulty && q.difficulty !== 'medium') {
    lines.push(`**Difficulty**: ${q.difficulty}`);
  } else if (q.difficulty === 'medium') {
    lines.push(`**Difficulty**: medium`);
  } else {
    lines.push(`**Difficulty**: medium`);
  }

  if (q.topics && q.topics.length > 0) {
    lines.push(`**Topics**: ${q.topics.join(', ')}`);
  }

  if (q.tags && q.tags.length > 0) {
    lines.push(`**Tags**: ${q.tags.join(', ')}`);
  }

  if (q.timeLimit != null) {
    lines.push(`**Time Limit**: ${q.timeLimit}s`);
  }

  // Only write Status when not 'active' (active is the implicit default)
  if (q.status && q.status !== 'active') {
    lines.push(`**Status**: ${q.status}`);
  }

  // Only write Flag when present
  if (q.flag) {
    lines.push(`**Flag**: ${q.flag}`);
  }

  lines.push('');
  lines.push(q.text.trim());
  lines.push('');

  for (const answer of q.answers) {
    const marker = answer.isCorrect ? 'x' : ' ';
    lines.push(`- [${marker}] ${answer.text}`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Serialize a full Question object (from the parsed model) back to a Markdown
 * question body.  Answers use their original text; correctness is inferred from
 * correctAnswerIds.
 */
export function serializeQuestion(q: Question): string {
  const answers = q.answers.map((a) => ({
    text: a.text,
    isCorrect: q.correctAnswerIds.includes(a.id),
  }));

  return serializeQuestionBody({
    text: q.text,
    answers,
    difficulty: q.difficulty,
    topics: q.topics,
    tags: q.tags,
    timeLimit: q.timeLimit,
    status: q.status,
    flag: q.flag,
  });
}

/**
 * Serialize a QuestionEdit payload (form-based update) to a Markdown body.
 * Answer IDs are regenerated as `<questionId>_A<n>`.
 */
export function serializeQuestionEdit(edit: QuestionEdit, _questionId: string): string {
  return serializeQuestionBody({
    text: edit.text,
    answers: edit.answers,
    difficulty: edit.difficulty,
    topics: edit.topics,
    tags: edit.tags,
    timeLimit: edit.timeLimit,
    status: edit.status,
    flag: edit.flag,
  });
}

// ─── File-level updater ──────────────────────────────────────────────────────

/**
 * Replace the body of a single question in a Markdown file.
 *
 * The file is read, the block for `questionId` is located, its body is replaced
 * with `newBody`, and the file is written back atomically (synchronously).
 *
 * @throws {Error} if the question ID is not found in the file.
 */
export function updateQuestionInFile(
  filePath: string,
  questionId: string,
  newBody: string,
): void {
  const content = readFileSync(filePath, 'utf-8');
  const updated = replaceQuestionBody(content, questionId, newBody);
  writeFileSync(filePath, updated, 'utf-8');
}

/**
 * Replace the body of a question section inside a Markdown string.
 *
 * A question section starts at `### <id>` and ends just before the next `### `
 * heading OR the end of the file.  The trailing `---` separator is preserved if
 * present in the original section.
 *
 * @returns The updated Markdown string.
 * @throws  {Error} if the question ID is not found.
 */
export function replaceQuestionBody(
  content: string,
  questionId: string,
  newBody: string,
): string {
  // We split on the `### ` marker to find individual sections.
  // sections[0] = everything before the first question (bank header + metadata)
  // sections[1..n] = each question section (starts with the ID line, no `### ` prefix)
  const parts = content.split(/^(### )/m);
  // parts interleaves separators and content: ['prefix', '### ', 'Q001\n...', '### ', 'Q002\n...', ...]

  // Find the index of the section whose first line matches questionId
  // parts[0] = content before first ###
  // parts[1] = '### ', parts[2] = 'Q001\n...'
  // parts[3] = '### ', parts[4] = 'Q002\n...'
  let foundAt = -1;
  for (let i = 2; i < parts.length; i += 2) {
    const sectionFirstLine = (parts[i] ?? '').split('\n')[0]?.trim();
    if (sectionFirstLine === questionId) {
      foundAt = i;
      break;
    }
  }

  if (foundAt === -1) {
    throw new Error(`Question "${questionId}" not found in file`);
  }

  const original = parts[foundAt] ?? '';
  // The ID is on the first line; preserve it
  const idLine = original.split('\n')[0] ?? questionId;

  // Detect whether the original section ended with a --- separator
  const originalTrimmed = original.trimEnd();
  const hasSeparator = originalTrimmed.endsWith('\n---') || originalTrimmed === '---';

  // Build replacement: ID line + new body + optional separator
  const bodyTrimmed = newBody.endsWith('\n') ? newBody : newBody + '\n';
  const replacement = `${idLine}\n${bodyTrimmed}${hasSeparator ? '---\n' : ''}`;

  parts[foundAt] = replacement;
  return parts.join('');
}
