import fs from "node:fs/promises";
import path from "node:path";

import type { QuestionBank, RawQuestion, Answer } from "./types";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a question-bank Markdown file that follows the new format:
 *
 *   # Question Bank: <name>
 *   ## Metadata
 *   - **Topics**: ...
 *   - **Default Time Limit**: 30s
 *   - **Description**: ...
 *   ---
 *   ## Questions
 *   ### Q001
 *   **Difficulty**: easy
 *   **Topics**: topic1, topic2
 *   **Tags**: tag1, tag2
 *   **Time Limit**: 40s
 *   <question text>
 *   - [x] correct answer
 *   - [ ] wrong answer
 *   ---
 */
export async function parseMarkdownBank(filePath: string): Promise<QuestionBank> {
  const raw = await fs.readFile(filePath, "utf-8");
  return parseMarkdownBankString(raw, filePath);
}

export function parseMarkdownBankString(raw: string, filePath: string): QuestionBank {
  const lines = raw.split(/\r?\n/);
  const fallbackTitle = path.basename(filePath, path.extname(filePath));

  // ── Title ────────────────────────────────────────────────────────────────
  let title = fallbackTitle;
  const titleLine = lines.find((l) => l.startsWith("# "));
  if (titleLine) {
    title = titleLine.replace(/^#\s+Question Bank:\s*/i, "").trim() || fallbackTitle;
  }

  // ── Metadata section (before ## Questions) ───────────────────────────────
  let default_time_limit = 20;
  let description: string | undefined;
  const bankTopics: string[] = [];

  const metaStart = lines.findIndex((l) => /^##\s+Metadata/i.test(l));
  const questionsStart = lines.findIndex((l) => /^##\s+Questions/i.test(l));

  if (metaStart !== -1) {
    const metaEnd = questionsStart !== -1 ? questionsStart : lines.length;
    for (let i = metaStart + 1; i < metaEnd; i++) {
      const l = lines[i];
      const topics = parseInlineBoldAttr(l, "Topics");
      if (topics !== null) {
        bankTopics.push(...splitCommaList(topics));
        continue;
      }
      const tl = parseInlineBoldAttr(l, "Default Time Limit");
      if (tl !== null) {
        default_time_limit = parseSeconds(tl);
        continue;
      }
      const desc = parseInlineBoldAttr(l, "Description");
      if (desc !== null) {
        description = desc;
      }
    }
  }

  if (questionsStart === -1) {
    throw new Error(`Markdown bank at ${filePath} is missing a ## Questions section`);
  }

  // ── Split on ### <id> ─────────────────────────────────────────────────────
  const questionBlocks: Array<{ id: string; lines: string[] }> = [];
  let currentId: string | null = null;
  let currentLines: string[] = [];

  for (let i = questionsStart + 1; i < lines.length; i++) {
    const l = lines[i];
    const headerMatch = /^###\s+(\S+)/.exec(l);
    if (headerMatch) {
      if (currentId !== null) {
        questionBlocks.push({ id: currentId, lines: currentLines });
      }
      currentId = headerMatch[1];
      currentLines = [];
    } else if (currentId !== null) {
      currentLines.push(l);
    }
  }
  if (currentId !== null) {
    questionBlocks.push({ id: currentId, lines: currentLines });
  }

  if (questionBlocks.length === 0) {
    throw new Error(`Markdown bank at ${filePath} contains no questions`);
  }

  // ── Parse each block ──────────────────────────────────────────────────────
  const questions: RawQuestion[] = [];
  let skipped = 0;

  for (const block of questionBlocks) {
    try {
      questions.push(parseQuestionBlock(block.id, block.lines, default_time_limit));
    } catch (err) {
      skipped++;
      logger.warn("Skipping malformed question", {
        filePath,
        id: block.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (questions.length === 0) {
    throw new Error(`No valid questions found in ${filePath}`);
  }

  // Derive canonical topic list from questions if not set in metadata
  const resolvedTopics =
    bankTopics.length > 0
      ? bankTopics
      : Array.from(new Set(questions.flatMap((q) => q.topics))).sort();

  logger.debug("Parsed markdown bank", { filePath, questionCount: questions.length, skipped });

  return { title, topics: resolvedTopics, default_time_limit, description, questions };
}

function parseQuestionBlock(id: string, lines: string[], bankDefaultLimit: number): RawQuestion {
  let difficulty: RawQuestion["difficulty"] = "medium";
  let topics: string[] = [];
  let tags: string[] = [];
  let time_limit: number | undefined;
  let quality: RawQuestion["quality"];

  // Read attribute lines at the top (stop at first non-attr, non-empty line)
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "" || l === "---") { bodyStart = i + 1; continue; }

    const diff = parseInlineBoldAttr(lines[i], "Difficulty");
    if (diff !== null) { difficulty = normaliseDifficulty(diff); bodyStart = i + 1; continue; }

    const tp = parseInlineBoldAttr(lines[i], "Topics");
    if (tp !== null) { topics = splitCommaList(tp); bodyStart = i + 1; continue; }

    const tg = parseInlineBoldAttr(lines[i], "Tags");
    if (tg !== null) { tags = splitCommaList(tg); bodyStart = i + 1; continue; }

    const tlv = parseInlineBoldAttr(lines[i], "Time Limit");
    if (tlv !== null) { time_limit = parseSeconds(tlv); bodyStart = i + 1; continue; }

    const ql = parseInlineBoldAttr(lines[i], "Quality");
    if (ql !== null) { quality = parseQualityAttr(ql); bodyStart = i + 1; continue; }

    // First non-attr non-empty line → body starts here
    break;
  }

  // Everything between bodyStart and the first answer line is the question text
  const answerLineRe = /^- \[[x ]\] /i;
  let answerStart = lines.length;
  for (let i = bodyStart; i < lines.length; i++) {
    if (answerLineRe.test(lines[i])) { answerStart = i; break; }
  }

  const questionText = lines
    .slice(bodyStart, answerStart)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "---")
    .join(" ");

  if (!questionText) {
    throw new Error(`Question ${id} has no text`);
  }

  // Parse answers
  const answers: Answer[] = [];
  for (let i = answerStart; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "---") break;
    const correctMatch = /^- \[x\] (.+)/i.exec(l);
    if (correctMatch) { answers.push({ text: correctMatch[1].trim(), correct: true }); continue; }
    const wrongMatch = /^- \[ \] (.+)/.exec(l);
    if (wrongMatch) { answers.push({ text: wrongMatch[1].trim(), correct: false }); }
  }

  if (answers.length === 0) {
    throw new Error(`Question ${id} has no answers`);
  }
  if (!answers.some((a) => a.correct)) {
    throw new Error(`Question ${id} has no correct answer`);
  }

  const primary_topic = topics[0] ?? "general";

  const result: RawQuestion = {
    id,
    question: questionText,
    answers,
    difficulty,
    primary_topic,
    topics,
    tags,
  };

  // Only set time_limit if it differs from the bank default (saves noise)
  if (time_limit !== undefined && time_limit !== bankDefaultLimit) {
    result.time_limit = time_limit;
  }

  if (quality) {
    result.quality = quality;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

export function serializeMarkdownBank(bank: QuestionBank): string {
  const lines: string[] = [];

  lines.push(`# Question Bank: ${bank.title}`, "");
  lines.push("## Metadata");
  if (bank.topics.length > 0) {
    lines.push(`- **Topics**: ${bank.topics.join(", ")}`);
  }
  lines.push(`- **Default Time Limit**: ${bank.default_time_limit}s`);
  if (bank.description) {
    lines.push(`- **Description**: ${bank.description}`);
  }
  lines.push("", "---", "", "## Questions", "");

  bank.questions.forEach((q) => {
    lines.push(`### ${q.id}`);
    lines.push(`**Difficulty**: ${q.difficulty}`);
    if (q.topics.length > 0) {
      lines.push(`**Topics**: ${q.topics.join(", ")}`);
    }
    if (q.tags.length > 0) {
      lines.push(`**Tags**: ${q.tags.join(", ")}`);
    }
    if (q.time_limit !== undefined) {
      lines.push(`**Time Limit**: ${q.time_limit}s`);
    }
    if (q.quality) {
      lines.push(`**Quality**: ${q.quality.score}/5 — ${q.quality.rationale}`);
    }
    lines.push("");
    lines.push(q.question);
    lines.push("");
    q.answers.forEach((a) => {
      lines.push(`- [${a.correct ? "x" : " "}] ${a.text}`);
    });
    lines.push("", "---", "");
  });

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Match `- **Key**: value` or `**Key**: value` and return the value portion.
 * Returns null if the line does not match.
 */
function parseInlineBoldAttr(line: string, key: string): string | null {
  const re = new RegExp(`^(?:-\\s+)?\\*\\*${key}\\*\\*:\\s*(.+)$`, "i");
  const m = re.exec(line.trim());
  return m ? m[1].trim() : null;
}

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseSeconds(raw: string): number {
  const n = parseInt(raw.replace(/s$/i, "").trim(), 10);
  return Number.isNaN(n) ? 20 : n;
}

function normaliseDifficulty(raw: string): RawQuestion["difficulty"] {
  const v = raw.toLowerCase().trim();
  if (v === "easy" || v === "medium" || v === "hard") return v;
  return "medium";
}

function parseQualityAttr(raw: string): RawQuestion["quality"] | undefined {
  // Expected format: "3/5 — Some rationale text"
  const m = /^(\d)\/5\s*(?:—|-)\s*(.+)$/.exec(raw.trim());
  if (!m) return undefined;
  const score = parseInt(m[1], 10);
  if (score < 1 || score > 5) return undefined;
  return { score, rationale: m[2].trim() };
}

