# QuizzQuizz Workspace Instructions

## Read First

- Start with [`vibe/PROJECT.md`](../vibe/PROJECT.md) for architecture and core product decisions.
- Use [`vibe/PLAN.md`](../vibe/PLAN.md) for roadmap and feature-phase context.
- Use [`vibe/QUICK-REFERENCE.md`](../vibe/QUICK-REFERENCE.md) for commands, ports, and troubleshooting shortcuts.
- Link to detailed docs instead of repeating them. Important references include [`vibe/QUESTION-BANK-FORMAT.md`](../vibe/QUESTION-BANK-FORMAT.md), [`vibe/ANALYTICS-PACKAGE.md`](../vibe/ANALYTICS-PACKAGE.md), [`docs/analytics/README.md`](../docs/analytics/README.md), [`EC2_PROXY_SETUP.md`](../EC2_PROXY_SETUP.md), and [`EC2_TROUBLESHOOTING.md`](../EC2_TROUBLESHOOTING.md).

## Project Shape

QuizzQuizz is a Kahoot-style quiz platform in an npm workspaces monorepo.

- `packages/common`: shared Zod schemas, types, and utilities
- `packages/question-bank`: Markdown question-bank parsing and loading
- `packages/api-server`: Hono API, Prisma, SQLite, auth, game/session logic
- `packages/host-app`: host UI built with Web Components and Vite
- `packages/player-app`: player UI built with Web Components and Vite
- `packages/analytics`: analytics calculation and aggregation logic
- `packages/analytics-ui`: analytics dashboard UI
- `question-banks/`: built-in and user-uploaded quiz banks

## Core Conventions

- Keep the architecture simple: REST plus polling, not WebSockets.
- Preserve the frontend stack: vanilla TypeScript with Web Components, not React or other frameworks.
- Keep TypeScript strict. Avoid implicit `any` and prefer explicit types.
- Use named exports, not default exports.
- Follow a Zod-first pattern for shared contracts: define the schema, then infer the TypeScript type.
- Keep frontend packages separate. Do not introduce shared UI code between host and player apps unless the repo already establishes that pattern.
- Use server time for answer validation and scoring decisions.

## Build, Test, And Run

- Install dependencies from the repo root with `npm install`.
- Build all packages from the repo root with `npm run build`.
- Run all dev services with `npm run dev`.
- Run one package with `npm run dev -w @quizzquizz/<package-name>`.
- Run unit and package tests with `npm test -- --run` when you need a one-shot run.
- Run Playwright coverage with `npm run test:e2e`.
- Run Docker workflows with the root `docker:*` scripts or `docker compose`.

## Implementation Guidance

- Respect TypeScript project references. If a package build fails, check whether its dependencies need to be built first.
- Do not edit generated Prisma client files under `packages/api-server/src/generated/prisma`.
- Question banks are Markdown files. Keep new parsing or validation behavior aligned with the documented format instead of inventing new syntax.
- User-uploaded banks live under `question-banks/user-quizzes/` and should remain treated as user data.
- When changing API contracts, update shared types and validate both API and consuming apps.
- Keep tests close to the code they validate, matching the existing Vitest and Playwright patterns.

## Commit Expectations

- If asked to commit, use Conventional Commits.
- Update [`CHANGELOG.md`](../CHANGELOG.md) under `## [Unreleased]` for every commit.

## Common Pitfalls

- Do not replace polling with sockets unless the user explicitly requests an architectural change.
- Do not add a UI framework where Web Components are the established pattern.
- Do not assume old phase docs reflect current status without checking the code and package scripts.
- Prisma generation is part of the API server workflow; generated output may need regeneration before builds in fresh environments.
- E2E tests can be sensitive to text and selector drift. Check the current UI before changing tests.
