# QuizzQuizz Workspace Instructions

## Read First

- Start with [`vibe/PROJECT.md`](vibe/PROJECT.md) for architecture and core product decisions.
- Use [`vibe/PLAN.md`](vibe/PLAN.md) for roadmap and feature-phase context.
- Use [`vibe/QUICK-REFERENCE.md`](vibe/QUICK-REFERENCE.md) for commands, ports, and troubleshooting shortcuts.
- Link to detailed docs instead of repeating them. Important references include [`vibe/QUESTION-BANK-FORMAT.md`](vibe/QUESTION-BANK-FORMAT.md), [`vibe/ANALYTICS-PACKAGE.md`](vibe/ANALYTICS-PACKAGE.md), [`docs/analytics/README.md`](docs/analytics/README.md), [`docs/authentication.md`](docs/authentication.md), [`EC2_PROXY_SETUP.md`](EC2_PROXY_SETUP.md), and [`EC2_TROUBLESHOOTING.md`](EC2_TROUBLESHOOTING.md).

## Skills

Reusable step-by-step workflows live in `.github/skills/`. Load them when the task matches.

| Skill | When to use |
|---|---|
| [`commit-changes`](.github/skills/commit-changes/SKILL.md) | Committing work: groups files, runs tests, updates CHANGELOG, optional patch/minor version bump |
| [`quiz-bank-change`](.github/skills/quiz-bank-change/SKILL.md) | Adding or modifying question-bank Markdown format, parser, or Zod schema |

## Project Shape

QuizzQuizz is a Kahoot-style quiz platform in an npm workspaces monorepo.

- `packages/common`: shared Zod schemas, types, and utilities
- `packages/question-bank`: Markdown question-bank parsing and loading
- `packages/question-bank-builder`: standalone CLI — JSONL ingestion, AI enrichment (Bedrock/LangGraph), Markdown generation
- `packages/api-server`: Hono API, Prisma, SQLite, auth, game/session logic
- `packages/host-app`: host UI built with Web Components and Vite — quiz host interface (projector display)
- `packages/player-app`: player UI built with Web Components and Vite — quiz player interface (mobile)
- `packages/flashcard-app`: flashcard player UI built with Web Components and Vite — standalone self-study mode served at `/flashcard/`
- `packages/admin-app`: admin UI built with Web Components and Vite — user management, served at `/admin/`; login, forced password change, and user CRUD (toggle admin, reset password, delete)
- `packages/analytics`: analytics calculation and aggregation logic
- `packages/analytics-ui`: analytics dashboard UI
- `question-banks/`: built-in and user-uploaded quiz banks

## Core Conventions

- Keep the architecture simple: **REST for all mutations, Yjs + y-websocket for real-time push**. Do not revert to polling; do not add additional WebSocket protocols.
- Preserve the frontend stack: vanilla TypeScript with Web Components, not React or other frameworks.
- Keep TypeScript strict. Avoid implicit `any` and prefer explicit types.
- Use named exports, not default exports.
- Follow a Zod-first pattern for shared contracts: define the schema, then infer the TypeScript type.
- Keep frontend packages separate. Do not introduce shared UI code between `host-app`, `player-app`, `flashcard-app`, and `analytics-ui` unless the repo already establishes that pattern.
- Use server time for answer validation and scoring decisions.

## Build, Test, And Run

- Install dependencies from the repo root with `npm install`.
- Build all packages from the repo root with `npm run build`.
- Run all dev services with `npm run dev`.
- Run one package with `npm run dev -w @quizzquizz/<package-name>`.
- Run unit and package tests with `npm test -- --run` when you need a one-shot run.
- Run tests for a single workspace: `npm test -- --run -w @quizzquizz/api-server`.
- Run a single test file directly: `npx vitest run packages/api-server/src/routes/sessions.test.ts`.
- Run Playwright coverage with `npm run test:e2e`.
- Run a single E2E spec: `npx playwright test e2e/full-workflow.spec.ts`.
- Lint all packages: `npm run lint`. Format: `npm run format`. Check formatting: `npm run format:check`.
- Run Docker workflows with the root `docker:*` scripts or `docker compose`.
- The question-bank-builder is **not** part of `npm run dev`. Build it with `npm run build -w @quizzquizz/question-bank-builder` and run via `npx question-bank-builder`. It requires AWS credentials for AI enrichment — see its [README](packages/question-bank-builder/README.md).

### Dev Service Ports

| Service        | Port |
|----------------|------|
| API server     | 3000 |
| Host app       | 3001 |
| Player app     | 3002 |
| Analytics UI   | 3003 |
| Flashcard app  | 3004 |

In Docker, Caddy proxies everything through port 3000:

| Path prefix   | App            |
|---------------|----------------|
| `/api/*`      | API server     |
| `/host*`      | host-app       |
| `/analytics*` | analytics-ui   |
| `/flashcard*` | flashcard-app  |
| `/admin*`     | admin-app      |
| `/*`          | player-app     |

## Implementation Guidance

- Respect TypeScript project references. Build order matters: `@quizzquizz/common` → `@quizzquizz/question-bank` → `@quizzquizz/api-server`. Frontend apps depend on `common`. Run `npm run build -w @quizzquizz/common` first when its types change.
- Do not edit generated Prisma client files under `packages/api-server/src/generated/prisma`.
- After changing `packages/api-server/prisma/schema.prisma`, regenerate with `npx prisma generate` (inside `packages/api-server`) before building. Run `npx prisma migrate dev` for schema migrations.
- Question banks are Markdown files. Keep new parsing or validation behavior aligned with the documented format instead of inventing new syntax.
- The question-bank-builder has its own internal types (`RawQuestion`, `QuestionBank`) that are a superset of the runtime types in `@quizzquizz/common`. It does **not** import from `@quizzquizz/common`; it generates Markdown that the `@quizzquizz/question-bank` parser reads. Do not couple the builder to runtime packages.
- User-uploaded banks live under `question-banks/user-quizzes/` and should remain treated as user data.
- When changing API contracts, update shared types and validate both API and consuming apps.
- Keep tests close to the code they validate, matching the existing Vitest and Playwright patterns.

### Yjs Real-time Sync

The real-time layer uses **Yjs + y-websocket**. Key files:

| File | Role |
|---|---|
| `packages/api-server/src/session-doc-manager.ts` | In-memory Yjs doc registry per session (`getOrCreateSession`, `updateDoc`, `destroySession`) |
| `packages/api-server/src/ws-handler.ts` | WebSocket upgrade handler; validates auth via `?playerId=` or `?hostToken=` query params |
| `packages/host-app/src/yjs-provider.ts` | Singleton `WebsocketProvider` for the host; `connectYjs` / `disconnectYjs` |
| `packages/player-app/src/yjs-provider.ts` | Same for the player |

Rules:
- All **mutations** (join, answer, start, next, end, adjust-timer) go through REST endpoints. The route handler calls `updateDoc` after every DB write.
- All **state observations** (lobby count, question, timer, leaderboard) happen by observing the `Y.Map` in the Yjs doc — no polling.
- The server runs a **5-second heartbeat** that updates `serverTime` in every active doc; clients compute remaining timer as `questionStartedAt + timeLimit - serverTime`.
- A 5-second **server heartbeat** (`setInterval` in `session-doc-manager.ts`) keeps timer state fresh for all clients.
- `correctAnswerIds` are **never** placed in the Yjs doc (security boundary).

### Web Component Pattern

All screen components extend `BaseComponent` (in each app's `src/components/base-component.ts`). The standard lifecycle is:

```typescript
protected onMount(): void { /* setup — connect Yjs provider, observe doc */ }
protected onUnmount(): void { /* teardown — disconnect Yjs provider, clear ALL intervals/timeouts */ }
protected render(): void { this.setContent(html); this.attachEventListeners(); }
protected attachEventListeners(): void { /* querySelector + addEventListener */ }
```

`setContent(html)` replaces inner HTML. Always re-attach event listeners after calling it. Disconnect the Yjs provider and clear every `setInterval`/`setTimeout` in `onUnmount` — leaks cause subtle bugs across navigations.

## Commit Expectations

- If asked to commit, use Conventional Commits.
- Update [`CHANGELOG.md`](CHANGELOG.md) under `## [Unreleased]` for every commit.

## Bug Fixes

**Always write a failing test before fixing a bug.** Reproduce the exact failure in a test first, confirm the test fails, then fix the code until the test passes. Never attempt a fix without a test that proves the bug exists — blind fixes are unverifiable and often miss the actual root cause.

## Common Pitfalls

- Do not reintroduce REST polling for game state. The architecture uses Yjs + y-websocket for all push updates; `setInterval` polling for game state has been removed.
- Do not add a UI framework where Web Components are the established pattern.
- Do not assume old phase docs reflect current status without checking the code and package scripts.
- Prisma generation is part of the API server workflow; generated output may need regeneration before builds in fresh environments.
- E2E tests can be sensitive to text and selector drift. Check the current UI before changing tests.
- The question-bank-builder uses `commonjs` modules and has relaxed `noUncheckedIndexedAccess`. This is intentional — it is a standalone CLI tool imported from another project. Do not try to convert it to ESM or tighten its type checks without cause.
- The `flashcard-app` is a fully independent frontend. It has its own `styles.css`, `router.ts`, `state.ts`, `api-client.ts`, and `BaseComponent`. The `play-screen` component also injects additional scoped styles at runtime via `injectStyles()` — edit those inline styles inside `play-screen.ts`, not a separate CSS file.
- Never commit AWS credentials or `.env` files from the builder. The builder's `.gitignore` and root `.gitignore` both guard against this.
- Each screen component that needs real-time state must call the `connectYjs(sessionId)` helper from `yjs-provider.ts` and **disconnect in `onUnmount`**. Forgetting to disconnect leaks WebSocket connections across route changes.
- `correctAnswerIds` are **never** placed in the Yjs doc — they are only fetched by the host via REST after the question ends. This is a security boundary; do not add them to the doc.
