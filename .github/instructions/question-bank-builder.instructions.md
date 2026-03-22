---
description: "Use when working on the question-bank-builder package. Covers the CLI tool for JSONL ingestion, AI enrichment via Amazon Bedrock/LangGraph, topic classification, and Markdown question-bank generation."
applyTo: "packages/question-bank-builder/**"
---
# Question Bank Builder Guidelines

## Purpose

`@quizzquizz/question-bank-builder` is a **standalone offline CLI tool** — it is not started by `npm run dev` and is not a runtime dependency of the quiz platform. It reads JSONL question data, optionally enriches it with AI, and writes Markdown files into `question-banks/`.

## Key Architecture

- **Two commands**: `classify` (JSONL → topic taxonomy → per-category Markdown) and the default command (transform + enrich + split-by-topic).
- **AI enrichment**: Amazon Bedrock via `@langchain/langgraph` ReAct agents. Requires `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `BEDROCK_MODEL_ID` (env vars or CLI flags).
- **Module system**: CommonJS (`module: "commonjs"` in tsconfig). Do not convert to ESM.
- **No coupling to runtime packages**: The builder has its own `RawQuestion` and `QuestionBank` types in `src/types.ts`. It does not import from `@quizzquizz/common` or `@quizzquizz/question-bank`. The contract between them is the Markdown file format.

## Output Compatibility

The builder's `serializeMarkdownBank()` produces Markdown following the [QuizzQuizz question-bank format](../../vibe/QUESTION-BANK-FORMAT.md):

- `# Question Bank: <name>` → `## Metadata` → `## Questions` → `### <id>` structure
- `**Difficulty**`, `**Topics**`, `**Tags**`, `**Time Limit**` per-question attributes
- `- [x]` / `- [ ]` checkbox answer syntax

Extra attributes the builder serializes (e.g. `**Quality**`) are silently ignored by the runtime parser — this is safe and expected.

## Type Differences from Runtime

| Field | Builder (`src/types.ts`) | Runtime (`@quizzquizz/common`) |
|---|---|---|
| Question text | `question: string` | `text: string` |
| Answers | `Answer { text, correct: boolean }` | `Answer { id, text }` + `correctAnswerIds[]` |
| Bank wrapper | `{ title, topics[], default_time_limit, questions }` | `{ id, metadata: { name, topics, defaultTimeLimit }, questions }` |
| Extra fields | `primary_topic`, `quality`, `tags` | — (tags parsed from Markdown) |

The Markdown serializer and the runtime parser bridge this gap — no direct type sharing needed.

## Security

- **Never commit** `credentials`, `config`, or `.env` files. They contain AWS keys.
- The package `.gitignore` and root `.gitignore` both exclude these files.
- `output/` and `logs/` directories are also gitignored.

## Build & Run

```bash
npm run build -w @quizzquizz/question-bank-builder
npx question-bank-builder --help
npx question-bank-builder classify --help
```

## Conventions

- Named exports only (consistent with monorepo).
- Winston for logging (`src/logger.ts`). Use `logger.info/debug/warn/error`, not `console.log`.
- Prompt templates live in `src/prompts/`.
- TypeScript strict mode with `noUncheckedIndexedAccess: false` (relaxed for array-heavy code imported from another project).
