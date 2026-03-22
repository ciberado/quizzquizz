---
description: "Add a new end-to-end quiz feature. Walks through shared contract → API handler → frontend integration → tests → changelog. Use when implementing any player or host feature that touches multiple packages."
agent: "agent"
argument-hint: "Describe the feature to add, e.g. 'hint option on questions' or 'skip-question button'"
---

You are helping implement a new end-to-end feature in the QuizzQuizz monorepo. Follow the steps below in order, confirming progress at each stage.

## Feature to Implement

The feature being added is: **${input}**

---

## Step 1 — Understand Existing Contracts

- Read the relevant types in [packages/common/src/types.ts](../../packages/common/src/types.ts) and adjacent schema files.
- Identify whether new Zod schemas or fields on existing schemas are required.
- Check [vibe/PROJECT.md](../../vibe/PROJECT.md) for any design constraints that apply.

## Step 2 — Update Shared Contract (`packages/common`)

If the feature touches API request/response shapes or shared utilities:

1. Add or update Zod schemas. Infer the TypeScript type from the schema — do not define it separately.
2. Add or update any shared utility (scoring helpers, validators) if needed.
3. Export everything with named exports.
4. Run `npm run build -w @quizzquizz/common` to validate.

## Step 3 — API Handler (`packages/api-server`)

1. Add or modify the Hono route in `src/index.ts` or the relevant route module.
2. Validate request data with the Zod schema before processing.
3. Use server timestamps for any time-sensitive logic — not client-supplied values.
4. If the schema changes, regenerate the Prisma client with `npx prisma generate` first.
5. Run `npm run build -w @quizzquizz/api-server`.

## Step 4 — Frontend Integration

Depending on which app is affected:

- **Host app** (`packages/host-app`): update or add a Web Component. Use hash routing if navigation is needed.
- **Player app** (`packages/player-app`): same conventions; polling at `GET /api/sessions/:id/state` if game state is involved.
- **Analytics UI** (`packages/analytics-ui`): update the post-game view if analytics data changes.

No shared UI code between apps. No UI frameworks — vanilla Web Components only.

## Step 5 — Tests

1. Add Vitest unit tests alongside changed source files (`*.test.ts`).
2. If the feature is user-facing and interactive, add or extend an E2E spec under `e2e/`.
   - Verify actual component text before writing selectors.
   - Use `page.getByRole` or `page.getByTestId` over CSS selectors.
3. Run one-shot tests: `npm test -- --run`.

## Step 6 — Finalize

1. Update [CHANGELOG.md](../../CHANGELOG.md) under `## [Unreleased]` with a concise entry.
2. Report a summary: what changed in each package and which tests cover the new behaviour.
