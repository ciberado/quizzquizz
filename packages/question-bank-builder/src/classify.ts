import fs from "node:fs/promises";
import path from "node:path";

import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TopicTaxonomy {
  [category: string]: string[];
}

export interface SourceQuestion {
  code: string;
  question: string;
  correct: string[];
  incorrect: string[];
  [key: string]: unknown;
}

export interface QuestionQuality {
  score: 1 | 2 | 3 | 4 | 5;
  rationale: string;
}

export interface ClassifiedQuestion extends SourceQuestion {
  topics: string[];
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  quality: QuestionQuality;
}

export interface ClassifyConfig {
  bedrockModelId: string;
  awsRegion: string;
  concurrency?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

export async function loadTopicTaxonomy(filePath: string): Promise<TopicTaxonomy> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as TopicTaxonomy;
}

export function flattenTopics(taxonomy: TopicTaxonomy): string[] {
  return Object.values(taxonomy).flat().sort();
}

export function getCategoriesForTopics(
  topics: string[],
  taxonomy: TopicTaxonomy
): string[] {
  const cats = new Set<string>();
  for (const topic of topics) {
    for (const [category, catTopics] of Object.entries(taxonomy)) {
      if (catTopics.includes(topic)) cats.add(category);
    }
  }
  return Array.from(cats).sort();
}

export async function loadSourceJsonl(filePath: string): Promise<SourceQuestion[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => JSON.parse(line) as SourceQuestion);
}

export async function loadClassifiedJsonl(filePath: string): Promise<ClassifiedQuestion[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => JSON.parse(line) as ClassifiedQuestion);
}

// ---------------------------------------------------------------------------
// Main classification pipeline
// ---------------------------------------------------------------------------

export async function classifyQuestions(
  inputPath: string,
  topicsPath: string,
  outputPath: string,
  config: ClassifyConfig
): Promise<string> {
  const taxonomy = await loadTopicTaxonomy(topicsPath);
  const allTopics = flattenTopics(taxonomy);
  const categories = Object.keys(taxonomy);

  const questions = await loadSourceJsonl(inputPath);
  const total = config.limit
    ? Math.min(config.limit, questions.length)
    : questions.length;
  const toProcess = questions.slice(0, total);

  // Resume: count lines already written
  const alreadyDone = await countExistingLines(outputPath);
  if (alreadyDone > 0) {
    logger.info("Resuming classification", { alreadyDone, total });
  }

  const remaining = toProcess.slice(alreadyDone);
  if (remaining.length === 0) {
    logger.info("All questions already classified", { total });
    return outputPath;
  }

  const concurrency = config.concurrency ?? 5;
  const maxRetries = parseEnvInt(process.env.ENRICH_MAX_RETRIES, 3);
  const retryBaseMs = parseEnvInt(process.env.ENRICH_RETRY_BASE_MS, 1000);

  logger.info("Classifying questions", {
    total,
    remaining: remaining.length,
    resumedFrom: alreadyDone,
    concurrency,
    categoryCount: categories.length,
    topicCount: allTopics.length,
  });

  const agent = await createAgent(config);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  // Pre-create the file if it doesn't exist so appendFile never hits ENOENT
  await fs.appendFile(outputPath, "");

  // Ordered output buffer — flush consecutive completed results to disk.
  // Each flush is chained serially via writeLock. Errors in a flush are caught
  // and logged so they never break the promise chain for subsequent flushes.
  const results: (ClassifiedQuestion | null)[] = new Array(remaining.length).fill(null);
  let nextIndex = 0;
  let flushedUpTo = 0;
  let done = 0;
  let writeLock = Promise.resolve();

  const flushCompleted = () => {
    writeLock = writeLock
      .catch((err) => {
        logger.error("Previous flush failed, retrying flush", { err });
      })
      .then(async () => {
        while (flushedUpTo < results.length && results[flushedUpTo] !== null) {
          try {
            await fs.appendFile(outputPath, JSON.stringify(results[flushedUpTo]) + "\n");
            flushedUpTo++;
          } catch (err) {
            logger.error("appendFile failed, will retry on next flush", { flushedUpTo, err });
            break;
          }
        }
      });
    return writeLock;
  };

  const workers = Array.from(
    { length: Math.min(concurrency, remaining.length) },
    (_, wid) =>
      (async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= remaining.length) break;
          const q = remaining[idx];

          try {
            const classified = await withRetry(
              () => classifyOneQuestion(agent, q, allTopics, categories),
              maxRetries,
              retryBaseMs,
              { wid, idx: idx + alreadyDone }
            );
            results[idx] = classified;
          } catch (err) {
            logger.error("Failed to classify question — keeping with empty topics", {
              idx: idx + alreadyDone,
              wid,
              err,
            });
            results[idx] = { ...q, topics: [], tags: [], difficulty: "medium", quality: { score: 0 as QuestionQuality["score"], rationale: "classification failed" } };
          }

          // Flush completed results; catch so a transient I/O error never kills a worker
          try {
            await flushCompleted();
          } catch (err) {
            logger.error("Flush error (non-fatal)", { idx: idx + alreadyDone, err });
          }

          done++;
          if (done % 10 === 0 || done === remaining.length) {
            logger.info("Classification progress", {
              done: done + alreadyDone,
              total,
              pct: `${(((done + alreadyDone) / total) * 100).toFixed(1)}%`,
            });
          }
        }
      })()
  );

  await Promise.all(workers);
  // Final flush to catch any results that weren't flushed by the last worker
  await flushCompleted();
  await writeLock;

  logger.info("Classification complete", { outputPath, total });
  return outputPath;
}

// ---------------------------------------------------------------------------
// Single-question classification
// ---------------------------------------------------------------------------

async function classifyOneQuestion(
  agent: Agent,
  q: SourceQuestion,
  allTopics: string[],
  categories: string[]
): Promise<ClassifiedQuestion> {
  const prompt = await buildClassificationPrompt(q, allTopics, categories);
  const response = await agent.run(prompt);
  const parsed = parseClassificationResponse(response, allTopics);

  return {
    ...q,
    topics: parsed.topics,
    tags: parsed.tags,
    difficulty: parsed.difficulty ?? "medium",
    quality: parsed.quality ?? { score: 3 as QuestionQuality["score"], rationale: "not assessed" },
  };
}

// ---------------------------------------------------------------------------
// Prompt & parsing
// ---------------------------------------------------------------------------

let promptTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (promptTemplate) return promptTemplate;
  // Works from both src/ (ts-node) and dist/ (compiled) — the .md lives in src/prompts/
  const candidates = [
    path.join(__dirname, "prompts", "classify.prompt.md"),
    path.join(__dirname, "..", "src", "prompts", "classify.prompt.md"),
  ];
  for (const p of candidates) {
    try {
      promptTemplate = await fs.readFile(p, "utf-8");
      return promptTemplate;
    } catch { /* try next */ }
  }
  throw new Error(`classify.prompt.md not found in ${candidates.join(", ")}`);
}

function buildClassificationPrompt(
  q: SourceQuestion,
  allTopics: string[],
  categories: string[]
): Promise<string> {
  const answers = [
    ...q.correct.map((a) => `  [CORRECT] ${a}`),
    ...q.incorrect.map((a) => `  [ ] ${a}`),
  ].join("\n");

  return loadPromptTemplate().then((template) =>
    template
      .replace("{{CATEGORIES}}", categories.map((c) => `  - ${c}`).join("\n"))
      .replace("{{TOPICS}}", allTopics.map((t) => `  - ${t}`).join("\n"))
      .replace("{{QUESTION}}", q.question)
      .replace("{{ANSWERS}}", answers)
  );
}

interface ParsedClassification {
  topics: string[];
  tags: string[];
  difficulty?: "easy" | "medium" | "hard";
  quality?: QuestionQuality;
}

function parseClassificationResponse(
  response: string,
  validTopics: string[]
): ParsedClassification {
  const block = extractJsonObject(response);
  if (!block) return { topics: [], tags: [] };

  try {
    const parsed = JSON.parse(block) as Record<string, unknown>;
    const result: ParsedClassification = {
      topics: [],
      tags: [],
    };

    if (Array.isArray(parsed.topics)) {
      result.topics = (parsed.topics as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => validTopics.includes(v));
    }

    if (Array.isArray(parsed.tags)) {
      result.tags = (parsed.tags as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v.length > 0);
    }

    const diff = String(parsed.difficulty ?? "").toLowerCase();
    if (diff === "easy" || diff === "medium" || diff === "hard") result.difficulty = diff;

    if (parsed.quality && typeof parsed.quality === "object") {
      const qObj = parsed.quality as Record<string, unknown>;
      const score = Number(qObj.score);
      if (score >= 1 && score <= 5) {
        result.quality = {
          score: Math.round(score) as QuestionQuality["score"],
          rationale: typeof qObj.rationale === "string" ? qObj.rationale.trim() : "",
        };
      }
    }

    return result;
  } catch {
    return { topics: [], tags: [] };
  }
}

// ---------------------------------------------------------------------------
// LLM agent (same pattern as enrich.ts)
// ---------------------------------------------------------------------------

interface Agent {
  run(prompt: string): Promise<string>;
}

const agentCache = new Map<string, Promise<Agent>>();

async function createAgent(config: ClassifyConfig): Promise<Agent> {
  const key = `${config.awsRegion}:${config.bedrockModelId}`;
  if (!agentCache.has(key)) {
    agentCache.set(key, buildAgent(config));
  }
  return agentCache.get(key)!;
}

async function buildAgent(config: ClassifyConfig): Promise<Agent> {
  const langgraphPrebuilt = await import("@langchain/langgraph/prebuilt");
  const awsMod = await import("@langchain/aws");

  const { createReactAgent } = langgraphPrebuilt as unknown as {
    createReactAgent: (cfg: { llm: unknown; tools?: unknown[] }) => {
      invoke: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  };

  const { ChatBedrockConverse } = awsMod as unknown as {
    ChatBedrockConverse: new (args: { model: string; region: string }) => unknown;
  };

  const model = new ChatBedrockConverse({
    model: config.bedrockModelId,
    region: config.awsRegion,
  });
  const agent = createReactAgent({ llm: model, tools: [] });

  return {
    async run(prompt: string): Promise<string> {
      logger.debug("Invoking LLM", { promptLen: prompt.length });
      const result = await agent.invoke({ messages: [new HumanMessage(prompt)] });
      return extractOutput(result);
    },
  };
}

function extractOutput(result: unknown): string {
  if (typeof result === "string") return result;
  const r = result as Record<string, unknown>;
  if (typeof r.output === "string" && r.output.trim()) return r.output;
  if (Array.isArray(r.messages) && r.messages.length > 0) {
    const last = r.messages[r.messages.length - 1] as BaseMessage;
    const c = last.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return (c as Array<string | { text?: string }>)
        .map((e) => (typeof e === "string" ? e : (e.text ?? "")))
        .filter((t) => t.length > 0)
        .join("\n");
    }
  }
  return JSON.stringify(result);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function countExistingLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseMs: number,
  context: Record<string, unknown>
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxRetries) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) break;
      const delay = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * baseMs);
      logger.warn("Retrying after error", { ...context, attempt, delay });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function parseEnvInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
}

function extractJsonObject(payload: string): string | undefined {
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return payload.slice(start, end + 1);
}
