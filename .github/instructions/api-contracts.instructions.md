---
description: "Use when working on the api-server, common, or question-bank packages. Covers Hono endpoints, Prisma ORM, Zod-first contracts, auth, game state, scoring, and question-bank parsing for quizzquizz."
applyTo: "packages/api-server/**,packages/common/**,packages/question-bank/**"
---
# API and Shared-Contract Guidelines

## Shared Types (`packages/common`)

- Define the Zod schema first, then infer the TypeScript type:
  ```typescript
  export const SessionSchema = z.object({ id: z.string().uuid(), pin: z.string() });
  export type Session = z.infer<typeof SessionSchema>;
  ```
- Export types from `packages/common` so that `api-server`, `host-app`, and `player-app` all share the same source of truth.
- Named exports only — no default exports.
- Run `npm run build -w @quizzquizz/common` before building dependents.

## API Server (`packages/api-server`)

- Framework: Hono. Match the existing middleware and routing patterns in `src/index.ts`.
- Validate every request body and query param with a Zod schema before use.
- Use **server timestamps** for answer validation and scoring — never trust client-supplied times.
- Auth: Better Auth (`v1.4.18`). Host operations require a host token (UUID); player join uses a PIN (6-digit numeric).
- Do not edit generated Prisma client files under `src/generated/prisma`. Regenerate with `npx prisma generate` after schema changes.
- After changing `prisma/schema.prisma`, run `npx prisma migrate dev` in dev and regenerate the client before building.

## Prisma / Database

- ORM: Prisma v6. Schema lives in `packages/api-server/prisma/schema.prisma`.
- Database: SQLite (`:memory:` in test/dev, file-based in production via `DATABASE_URL`).
- Never mutate generated client files. If types look wrong, regenerate.
- Build order: `prisma generate` → `tsc -b`. CI/Docker does this explicitly; be aware in fresh clones.

## Game State

State machine: `lobby` → `playing` → `finished`. Enforce valid transitions server-side; reject invalid ones with a 400.

## Scoring

Kahoot-style formula (implemented in `packages/common/src/utils.ts`):
```
score = basePoints * (1 - (timeTaken / timeLimit) * 0.5)
```
Do not duplicate this logic — import it from `@quizzquizz/common`.

## Question Bank (`packages/question-bank`)

- Parses Markdown files. See [`vibe/QUESTION-BANK-FORMAT.md`](../../vibe/QUESTION-BANK-FORMAT.md) for the canonical format.
- Add new parsing or validation behaviour that extends—not breaks—the existing format.
- User-uploaded banks live under `question-banks/user-quizzes/{userId}/` — treat as user data, not source.

## Changing API Contracts

When modifying a request or response shape:
1. Update the Zod schema in `packages/common`.
2. Update the API handler in `packages/api-server`.
3. Check all consumers (`host-app`, `player-app`, `analytics-ui`) for type errors.
4. Update or add Vitest unit tests and, if the flow is user-facing, an E2E scenario.

## Tests

- Vitest, tests alongside source as `*.test.ts`.
- One-shot run: `npm test -- --run -w @quizzquizz/api-server` (or relevant workspace).
- HTTP integration tests: use the `.http` files in `packages/api-server/` with the VS Code REST Client.
