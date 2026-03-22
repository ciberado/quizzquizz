import path from "node:path";

import type { QuestionBank, RawQuestion, Answer } from "./types";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Loader for the source JSON format:
// [{ code, question, correct: string[], incorrect: string[] }, ...]
// ---------------------------------------------------------------------------

interface SourceEntry {
  code?: unknown;
  question?: unknown;
  correct?: unknown;
  incorrect?: unknown;
  difficulty?: unknown;
  category?: unknown;
}

export function loadJsonBank(payload: unknown, filePath: string): QuestionBank {
  if (!Array.isArray(payload)) {
    throw new Error(`Expected an array of questions in ${filePath}`);
  }

  const fallbackTitle = formatTitle(path.basename(filePath, path.extname(filePath)));
  const questions: RawQuestion[] = [];
  let skipped = 0;

  (payload as SourceEntry[]).forEach((entry, idx) => {
    try {
      questions.push(normaliseEntry(entry, idx, filePath));
    } catch (err) {
      skipped++;
      logger.warn("Skipping malformed question", {
        filePath,
        index: idx,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  if (questions.length === 0) {
    throw new Error(`No valid questions found in ${filePath}`);
  }

  logger.info("Loaded JSON question bank", {
    filePath,
    total: payload.length,
    valid: questions.length,
    skipped,
  });

  return {
    title: fallbackTitle,
    topics: [],
    default_time_limit: 30,
    questions,
  };
}

function normaliseEntry(entry: SourceEntry, idx: number, filePath: string): RawQuestion {
  const question = readString(entry.question);
  const correct = readStringArray(entry.correct);
  const incorrect = readStringArray(entry.incorrect);

  if (!question) throw new Error(`Question at index ${idx} in ${filePath} is missing text`);
  if (!correct || correct.length === 0) throw new Error(`Question at index ${idx} in ${filePath} has no correct answers`);
  if (!incorrect || incorrect.length === 0) throw new Error(`Question at index ${idx} in ${filePath} has no incorrect answers`);

  const answers: Answer[] = [
    ...correct.map((text) => ({ text, correct: true })),
    ...incorrect.map((text) => ({ text, correct: false })),
  ];

  const id = readString(entry.code)?.trim() || `Q${String(idx + 1).padStart(3, "0")}`;
  const difficulty = normaliseDifficulty(readString(entry.difficulty));

  return {
    id,
    question: question.trim(),
    answers,
    difficulty,
    primary_topic: "general",
    topics: [],
    tags: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function readStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const r = v.filter((e): e is string => typeof e === "string" && e.trim().length > 0).map((e) => e.trim());
    return r.length > 0 ? r : undefined;
  }
  return undefined;
}

function normaliseDifficulty(raw: string | undefined): RawQuestion["difficulty"] {
  const v = (raw ?? "").toLowerCase();
  if (v === "easy" || v === "medium" || v === "hard") return v;
  return "medium";
}

function formatTitle(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
