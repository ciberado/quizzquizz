import fs from "node:fs/promises";
import path from "node:path";

import type { ClassifiedQuestion, TopicTaxonomy } from "./classify";
import { loadClassifiedJsonl, loadTopicTaxonomy, getCategoriesForTopics } from "./classify";
import { serializeMarkdownBank } from "./markdown";
import type { QuestionBank, RawQuestion, Answer } from "./types";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GenerateResult {
  category: string;
  filePath: string;
  questionCount: number;
}

// ---------------------------------------------------------------------------
// Main quiz generation
// ---------------------------------------------------------------------------

export async function generateTopicQuizzes(
  classifiedJsonlPath: string,
  topicsPath: string,
  outputDir: string,
  prefix: string
): Promise<GenerateResult[]> {
  const taxonomy = await loadTopicTaxonomy(topicsPath);
  const classified = await loadClassifiedJsonl(classifiedJsonlPath);

  logger.info("Generating topic quizzes", {
    classifiedCount: classified.length,
    categoryCount: Object.keys(taxonomy).length,
  });

  // Group questions by topic category
  const byCategory = new Map<string, ClassifiedQuestion[]>();

  for (const q of classified) {
    const cats = getCategoriesForTopics(q.topics, taxonomy);
    for (const cat of cats) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(q);
    }
  }

  // Report questions that matched no category
  const unmatched = classified.filter(
    (q) => getCategoriesForTopics(q.topics, taxonomy).length === 0
  );
  if (unmatched.length > 0) {
    logger.warn("Questions with no matching category", {
      count: unmatched.length,
      codes: unmatched.slice(0, 10).map((q) => q.code),
    });
  }

  // Write one markdown file per category
  await fs.mkdir(outputDir, { recursive: true });
  const results: GenerateResult[] = [];

  for (const [category, questions] of byCategory) {
    const slug = category.replace(/:/g, "-");
    const fileName = `${prefix}-${slug}.md`;
    const filePath = path.join(outputDir, fileName);

    const bank = buildQuizBank(category, questions, taxonomy);
    const content = serializeMarkdownBank(bank);
    await fs.writeFile(filePath, content, "utf-8");

    results.push({ category, filePath, questionCount: questions.length });
    logger.info("Written quiz file", { category, filePath, questionCount: questions.length });
  }

  logger.info("Quiz generation complete", {
    outputDir,
    categoryCount: byCategory.size,
    fileCount: results.length,
    totalQuestionSlots: results.reduce((s, r) => s + r.questionCount, 0),
  });

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuizBank(
  category: string,
  questions: ClassifiedQuestion[],
  taxonomy: TopicTaxonomy
): QuestionBank {
  const rawQuestions: RawQuestion[] = questions.map((q) => {
    const answers: Answer[] = [
      ...q.correct.map((text) => ({ text, correct: true })),
      ...q.incorrect.map((text) => ({ text, correct: false })),
    ];

    return {
      id: String(q.code).replace(/\s+/g, "-"),
      question: q.question,
      answers,
      difficulty: q.difficulty,
      primary_topic: category,
      topics: q.topics,
      tags: q.tags,
      quality: q.quality,
    };
  });

  return {
    title: formatCategoryTitle(category),
    topics: taxonomy[category] ?? [],
    default_time_limit: 30,
    description: `Questions covering ${formatCategoryTitle(category)}`,
    questions: rawQuestions,
  };
}

function formatCategoryTitle(category: string): string {
  return category
    .split(":")
    .map((part) =>
      part
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" — ");
}
