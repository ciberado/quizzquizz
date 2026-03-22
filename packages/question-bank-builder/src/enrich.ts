import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

import type { QuestionBank, RawQuestion } from "./types";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface EnrichmentConfig {
  bedrockModelId: string;
  awsRegion: string;
  concurrency?: number;
  limit?: number;
  topicBatchSize?: number;
}

export type IncrementalSaveCallback = (
  partialBank: QuestionBank,
  processedCount: number,
  totalCount: number
) => Promise<void>;

// ---------------------------------------------------------------------------
// Phase 1 — extract a canonical topic list from the whole bank
// ---------------------------------------------------------------------------

export async function extractTopics(
  bank: QuestionBank,
  config: EnrichmentConfig
): Promise<string[]> {
  const batchSize = config.topicBatchSize ?? 100;
  const questions = config.limit ? bank.questions.slice(0, config.limit) : bank.questions;

  logger.info("Phase 1 - extracting topics", {
    totalQuestions: questions.length,
    batchSize,
  });

  const agent = await createAgent(config);
  const topicSets: string[][] = [];

  for (let offset = 0; offset < questions.length; offset += batchSize) {
    const batch = questions.slice(offset, offset + batchSize);
    const prompt = buildTopicExtractionPrompt(batch, offset + 1);
    logger.debug("Topic extraction batch", { offset, count: batch.length });
    const response = await agent.run(prompt);
    const topics = parseTopicList(response);
    logger.debug("Topics from batch", { offset, topics });
    topicSets.push(topics);
  }

  const merged = Array.from(new Set(topicSets.flat().map((t) => t.toLowerCase().trim())))
    .filter((t) => t.length > 0)
    .sort();

  logger.info("Phase 1 complete", { topicCount: merged.length, topics: merged });
  return merged;
}

// ---------------------------------------------------------------------------
// Phase 2 — tag each question with primary_topic, topics[], tags[]
// ---------------------------------------------------------------------------

export async function enrichQuestions(
  bank: QuestionBank,
  canonicalTopics: string[],
  config: EnrichmentConfig,
  onIncrementalSave?: IncrementalSaveCallback
): Promise<QuestionBank> {
  const questions = config.limit ? bank.questions.slice(0, config.limit) : bank.questions;
  const concurrency = config.concurrency ?? 5;
  const maxRetries = parseEnvInt(process.env.ENRICH_MAX_RETRIES, 3);
  const retryBaseMs = parseEnvInt(process.env.ENRICH_RETRY_BASE_MS, 1000);

  logger.info("Phase 2 - enriching questions", {
    questionCount: questions.length,
    topicCount: canonicalTopics.length,
    concurrency,
  });

  const agent = await createAgent(config);
  const results: (RawQuestion | null)[] = new Array(questions.length).fill(null);
  let nextIndex = 0;
  let done = 0;
  let lastSave = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, (_, wid) =>
    (async () => {
      while (true) {
        const idx = nextIndex++;
        if (idx >= questions.length) break;
        const q = questions[idx];

        try {
          const enriched = await withRetry(
            () => enrichOneQuestion(agent, q, canonicalTopics),
            maxRetries,
            retryBaseMs,
            { wid, idx }
          );
          results[idx] = enriched;
        } catch (err) {
          logger.error("Failed to enrich question - keeping original", { idx, wid, err });
          results[idx] = q;
        }

        done++;
        if (onIncrementalSave && done - lastSave >= 20) {
          const valid = results.slice(0, idx + 1).filter((r): r is RawQuestion => r !== null);
          if (valid.length > 0) {
            await onIncrementalSave(
              { ...bank, questions: valid },
              valid.length,
              questions.length
            );
            lastSave = done;
          }
        }
      }
    })()
  );

  await Promise.all(workers);

  const enriched = results.filter((r): r is RawQuestion => r !== null);
  logger.info("Phase 2 complete", { enrichedCount: enriched.length });

  return { ...bank, topics: canonicalTopics, questions: enriched };
}

// ---------------------------------------------------------------------------
// Single-question enrichment
// ---------------------------------------------------------------------------

async function enrichOneQuestion(
  agent: Agent,
  q: RawQuestion,
  canonicalTopics: string[]
): Promise<RawQuestion> {
  const prompt = buildQuestionEnrichmentPrompt(q, canonicalTopics);
  const response = await agent.run(prompt);
  const updates = parseQuestionEnrichment(response);

  const primaryTopic =
    updates.primary_topic && canonicalTopics.includes(updates.primary_topic)
      ? updates.primary_topic
      : updates.topics?.[0] ?? canonicalTopics[0] ?? "general";

  return {
    ...q,
    primary_topic: primaryTopic,
    topics: updates.topics?.length ? updates.topics : q.topics,
    tags: updates.tags?.length ? updates.tags : q.tags,
    difficulty: updates.difficulty ?? q.difficulty,
  };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildTopicExtractionPrompt(questions: RawQuestion[], startNum: number): string {
  const list = questions
    .map((q, i) => `${startNum + i}. ${q.question.slice(0, 200)}`)
    .join("\n");

  return `You are classifying AWS exam questions into broad study topics.

Given the following question texts, derive a concise, coherent list of broad topic slugs
that cover the subject matter. Use kebab-case slugs (e.g. "s3-storage", "iam-security",
"vpc-networking"). Aim for 5-20 broad categories, NOT one per question.

Return ONLY a JSON array of strings, e.g.: ["ec2-compute","s3-storage","iam-security"]

Questions:
${list}`;
}

function buildQuestionEnrichmentPrompt(q: RawQuestion, canonicalTopics: string[]): string {
  const answers = q.answers
    .map((a, i) => `  ${i + 1}. [${a.correct ? "x" : " "}] ${a.text}`)
    .join("\n");

  return `You are tagging an AWS exam question with study metadata.

Canonical topic list (choose ONLY from these):
${canonicalTopics.map((t) => `  - ${t}`).join("\n")}

Question:
${q.question}

Answers:
${answers}

Return a JSON object with:
{
  "primary_topic": "<one topic from the list above>",
  "topics": ["<topic1>", "<topic2>"],
  "tags": ["<fine-grained-tag1>", "<fine-grained-tag2>"],
  "difficulty": "easy" | "medium" | "hard"
}

Rules:
- primary_topic MUST be from the canonical list
- topics should be 1-3 items from the canonical list
- tags are fine-grained labels (e.g. "s3-versioning", "cross-region-replication")
- Only output the JSON, no commentary`;
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

function parseTopicList(response: string): string[] {
  const block = extractJsonArray(response);
  if (!block) return [];
  try {
    const parsed = JSON.parse(block) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    }
  } catch { /* ignore */ }
  return [];
}

interface QuestionEnrichment {
  primary_topic?: string;
  topics?: string[];
  tags?: string[];
  difficulty?: RawQuestion["difficulty"];
}

function parseQuestionEnrichment(response: string): QuestionEnrichment {
  const block = extractJsonObject(response);
  if (!block) return {};
  try {
    const parsed = JSON.parse(block) as Record<string, unknown>;
    const result: QuestionEnrichment = {};

    if (typeof parsed.primary_topic === "string") {
      result.primary_topic = parsed.primary_topic.trim();
    }
    if (Array.isArray(parsed.topics)) {
      result.topics = (parsed.topics as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
    if (Array.isArray(parsed.tags)) {
      result.tags = (parsed.tags as unknown[])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
    const diff = String(parsed.difficulty ?? "").toLowerCase();
    if (diff === "easy" || diff === "medium" || diff === "hard") result.difficulty = diff;

    return result;
  } catch {
    return {};
  }
}

function extractJsonArray(payload: string): string | undefined {
  const start = payload.indexOf("[");
  const end = payload.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return payload.slice(start, end + 1);
}

function extractJsonObject(payload: string): string | undefined {
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return payload.slice(start, end + 1);
}

// ---------------------------------------------------------------------------
// LLM agent
// ---------------------------------------------------------------------------

interface Agent {
  run(prompt: string): Promise<string>;
}

const agentCache = new Map<string, Promise<Agent>>();

async function createAgent(config: EnrichmentConfig): Promise<Agent> {
  const key = `${config.awsRegion}:${config.bedrockModelId}`;
  if (!agentCache.has(key)) {
    agentCache.set(key, buildAgent(config));
  }
  return agentCache.get(key)!;
}

async function buildAgent(config: EnrichmentConfig): Promise<Agent> {
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

  const model = new ChatBedrockConverse({ model: config.bedrockModelId, region: config.awsRegion });
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
