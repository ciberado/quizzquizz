import fs from "node:fs/promises";
import path from "node:path";

import { loadJsonBank } from "./ai_samples";
import { parseMarkdownBank, serializeMarkdownBank } from "./markdown";
import type { QuestionBank, RawQuestion } from "./types";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export async function loadQuestionBank(filePath: string): Promise<QuestionBank> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".md" || ext === ".markdown") {
    return parseMarkdownBank(filePath);
  }

  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return loadJsonBank(parsed, filePath);
}

// ---------------------------------------------------------------------------
// Save a single bank
// ---------------------------------------------------------------------------

export async function saveQuestionBank(bank: QuestionBank, filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".md" || ext === ".markdown") {
    await fs.writeFile(filePath, serializeMarkdownBank(bank), "utf-8");
    logger.debug("Wrote markdown bank", { filePath, questionCount: bank.questions.length });
    return;
  }

  // JSON fallback
  await fs.writeFile(filePath, JSON.stringify(bank, null, 2), "utf-8");
  logger.debug("Wrote JSON bank", { filePath, questionCount: bank.questions.length });
}

// ---------------------------------------------------------------------------
// Split by primary_topic and write one file per topic (max 40 questions each)
// ---------------------------------------------------------------------------

const MAX_QUESTIONS_PER_FILE = 40;

export interface SplitResult {
  topic: string;
  filePath: string;
  questionCount: number;
}

/**
 * Split an enriched bank by primary_topic and write one (or more, if >40 questions)
 * Markdown file per topic into `outputDir`.
 *
 * File naming: `<prefix>-<topic-slug>.md` (e.g. `saa-c03-s3-storage.md`).
 * When a topic overflows 40 questions the files are suffixed `-part-1`, `-part-2`, etc.
 */
export async function splitByTopic(
  bank: QuestionBank,
  outputDir: string,
  prefix: string
): Promise<SplitResult[]> {
  await fs.mkdir(outputDir, { recursive: true });

  // Group by primary_topic
  const byTopic = new Map<string, RawQuestion[]>();
  for (const q of bank.questions) {
    const topic = q.primary_topic || "general";
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(q);
  }

  const results: SplitResult[] = [];

  for (const [topic, questions] of byTopic) {
    const chunks = chunkArray(questions, MAX_QUESTIONS_PER_FILE);

    for (let part = 0; part < chunks.length; part++) {
      const chunk = chunks[part];
      const suffix = chunks.length > 1 ? `-part-${part + 1}` : "";
      const fileName = `${prefix}-${topic}${suffix}.md`;
      const filePath = path.join(outputDir, fileName);

      const chunkBank: QuestionBank = {
        title: `${bank.title} – ${formatTopicTitle(topic)}${chunks.length > 1 ? ` (Part ${part + 1})` : ""}`,
        topics: bank.topics,
        default_time_limit: bank.default_time_limit,
        description: bank.description,
        questions: chunk,
      };

      await saveQuestionBank(chunkBank, filePath);

      results.push({ topic, filePath, questionCount: chunk.length });
      logger.info("Written topic file", { filePath, questionCount: chunk.length });
    }
  }

  logger.info("Split complete", {
    outputDir,
    topicCount: byTopic.size,
    fileCount: results.length,
    totalQuestions: bank.questions.length,
  });

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatTopicTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
