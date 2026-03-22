#!/usr/bin/env node

import "./env";

import path from "node:path";
import fs from "node:fs/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { extractTopics, enrichQuestions } from "./enrich";
import type { EnrichmentConfig } from "./enrich";
import { loadQuestionBank, saveQuestionBank, splitByTopic } from "./transform";
import { classifyQuestions } from "./classify";
import { generateTopicQuizzes } from "./generate_quizzes";
import type { QuestionBank } from "./types";
import { logger, setLogLevel } from "./logger";

// ── Shared Bedrock / worker options ─────────────────────────────────────────
const bedrockOptions = {
  "bedrock-model-id": {
    type: "string" as const,
    description: "Amazon Bedrock model ID (or BEDROCK_MODEL_ID env var)",
  },
  "aws-region": {
    type: "string" as const,
    description: "AWS region for Bedrock (or AWS_REGION env var)",
  },
  concurrency: {
    type: "number" as const,
    default: 5,
    description: "Number of parallel AI workers",
  },
  limit: {
    type: "number" as const,
    description: "Process at most N questions (useful for testing)",
  },
  verbose: {
    alias: "v" as const,
    type: "boolean" as const,
    default: false,
    description: "Enable verbose (debug) logging",
  },
} as const;

// ── CLI ──────────────────────────────────────────────────────────────────────

yargs(hideBin(process.argv))
  .scriptName("question-bank-builder")

  // ── classify command ────────────────────────────────────────────────────
  .command(
    "classify",
    "Classify JSONL questions with a topic taxonomy and generate per-category quiz files",
    (y) =>
      y
        .option("input", {
          alias: "i",
          type: "string",
          demandOption: true,
          description: "Source JSONL file (one JSON object per line)",
        })
        .option("topics", {
          alias: "t",
          type: "string",
          demandOption: true,
          description: "Topics taxonomy JSON file",
        })
        .option("output-dir", {
          alias: "o",
          type: "string",
          demandOption: true,
          description: "Output directory for classified JSONL and quiz files",
        })
        .option("prefix", {
          alias: "p",
          type: "string",
          demandOption: true,
          description: "Filename prefix (e.g. 'saa-c03')",
        })
        .options(bedrockOptions),
    async (args) => {
      try {
        if (args.verbose) {
          setLogLevel("debug");
          logger.debug("Verbose logging enabled");
        }

        const inputPath = path.resolve(process.cwd(), args.input);
        const topicsPath = path.resolve(process.cwd(), args.topics);
        const outputDir = path.resolve(process.cwd(), args["output-dir"]);
        const prefix = args.prefix;

        const modelId = args["bedrock-model-id"] ?? process.env.BEDROCK_MODEL_ID ?? "";
        const region = args["aws-region"] ?? process.env.AWS_REGION ?? "";
        if (!modelId || !region) {
          throw new Error(
            "classify requires --bedrock-model-id and --aws-region (or BEDROCK_MODEL_ID / AWS_REGION env vars)"
          );
        }

        const classifiedPath = path.join(outputDir, `${prefix}-classified.jsonl`);

        logger.info("classify pipeline started", { inputPath, topicsPath, outputDir, prefix });

        // Phase 1 — classify each question (appends to JSONL line by line)
        await classifyQuestions(inputPath, topicsPath, classifiedPath, {
          bedrockModelId: modelId,
          awsRegion: region,
          concurrency: args.concurrency,
          limit: args.limit,
        });

        // Phase 2 — generate per-category quiz markdown files
        const results = await generateTopicQuizzes(classifiedPath, topicsPath, outputDir, prefix);

        logger.info("Done", {
          classifiedPath,
          quizFiles: results.length,
          totalQuestionSlots: results.reduce((s, r) => s + r.questionCount, 0),
        });
      } catch (err) {
        handleError(err);
      }
    }
  )

  // ── default command (transform / enrich / split) ───────────────────────
  .command(
    "$0",
    "Transform, enrich, and split a question bank",
    (y) =>
      y
        .usage("$0 --input <file> --output-dir <dir> --prefix <prefix> [options]")
        .option("input", {
          alias: "i",
          type: "string",
          description: "Path to the source question bank (JSON or Markdown)",
          demandOption: true,
        })
        .option("output-dir", {
          alias: "o",
          type: "string",
          description: "Directory where per-topic Markdown files will be written",
          demandOption: true,
        })
        .option("prefix", {
          alias: "p",
          type: "string",
          description: "Filename prefix for output files (e.g. 'saa-c03')",
          demandOption: true,
        })
        .option("enrich", {
          type: "boolean",
          default: false,
          description: "Run AI enrichment (topic extraction + tagging) before splitting",
        })
        .option("topic-batch-size", {
          type: "number",
          default: 100,
          description: "Questions per batch in Phase-1 topic extraction",
        })
        .options(bedrockOptions),
    async (args) => {
      try {
        if (args.verbose) {
          setLogLevel("debug");
          logger.debug("Verbose logging enabled");
        }

        const inputPath = path.resolve(process.cwd(), args.input);
        const outputDir = path.resolve(process.cwd(), args["output-dir"]);
        const prefix = args.prefix;

        logger.info("question-bank-builder started", {
          inputPath,
          outputDir,
          prefix,
          enrich: args.enrich,
        });

        // ── Load ───────────────────────────────────────────────────────────
        let bank: QuestionBank = await loadQuestionBank(inputPath);
        logger.info("Loaded question bank", {
          title: bank.title,
          questionCount: bank.questions.length,
        });

        // ── Enrich (optional) ──────────────────────────────────────────────
        if (args.enrich) {
          const modelId = args["bedrock-model-id"] ?? process.env.BEDROCK_MODEL_ID ?? "";
          const region = args["aws-region"] ?? process.env.AWS_REGION ?? "";

          if (!modelId || !region) {
            throw new Error(
              "--enrich requires --bedrock-model-id and --aws-region (or BEDROCK_MODEL_ID / AWS_REGION env vars)"
            );
          }

          const config: EnrichmentConfig = {
            bedrockModelId: modelId,
            awsRegion: region,
            concurrency: args.concurrency,
            topicBatchSize: args["topic-batch-size"],
            limit: args.limit,
          };

          // Phase 1 – extract canonical topic list
          const canonicalTopics = await extractTopics(bank, config);

          // Persist the intermediate enriched bank for inspection / restart
          const intermediatePath = path.join(outputDir, `${prefix}-enriched.json`);
          await fs.mkdir(outputDir, { recursive: true });

          // Phase 2 – tag each question; save incrementally every 20 questions
          const incrementalSave = async (
            partial: QuestionBank,
            done: number,
            total: number
          ) => {
            const tmpPath = intermediatePath.replace(
              /\.json$/,
              `.tmp-${done}-of-${total}.json`
            );
            await saveQuestionBank(partial, tmpPath);
            logger.info("Incremental save", {
              tmpPath,
              done,
              total,
              pct: `${((done / total) * 100).toFixed(1)}%`,
            });
          };

          bank = await enrichQuestions(bank, canonicalTopics, config, incrementalSave);

          // Save final enriched bank
          await saveQuestionBank(bank, intermediatePath);
          logger.info("Enriched bank saved", {
            intermediatePath,
            questionCount: bank.questions.length,
          });
        }

        // ── Split by topic ─────────────────────────────────────────────────
        const splitResults = await splitByTopic(bank, outputDir, prefix);

        logger.info("Done", {
          fileCount: splitResults.length,
          outputDir,
          files: splitResults.map((r) => path.basename(r.filePath)),
        });
      } catch (err) {
        handleError(err);
      }
    }
  )

  .help()
  .parse();

// ── Error handler ───────────────────────────────────────────────────────────

function handleError(err: unknown): void {
  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.error("Unexpected error", { err });
  }
  process.exitCode = 1;
}
