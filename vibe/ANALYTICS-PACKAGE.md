# Analytics Package — Design Document

## Purpose

The `@quizzquizz/analytics` package is a **new monorepo package** that provides a self-contained analytics exploration layer on top of the statistics data already collected by the API server (Phase 9F). It reads from the existing `UserQuestionStat`, `QuestionGlobalStat`, `PlayerStat`, `HostedSession`, and `PlayerAnswer` tables to produce actionable insights — without modifying any upstream recording logic.

The system is split into **two new packages**:

- `@quizzquizz/analytics` — backend computation library (calculations → JSON). No UI.
- `@quizzquizz/analytics-ui` — standalone frontend app (Web Components + Vite) that visualises the data. Separate from host-app and player-app to avoid increasing their complexity.

The package serves two audiences:

| Audience | What they want |
|---|---|
| **Hosts / question-bank authors** | Understand how their quizzes perform: which questions are too easy or too hard, which distractors mislead, how engagement evolves over time, and whether declared difficulties match reality. |
| **Players** | Track personal progress: accuracy trends, weak topics, improvement velocity, response-time patterns, and personalised practice recommendations. |

---

## Package Location & Dependencies

```
packages/
  analytics/              ← new package: @quizzquizz/analytics (backend)
    src/
      index.ts
      loaders.ts
      host/               ← host-facing analytics modules
      player/             ← player-facing analytics modules
      shared/             ← shared computation helpers
    package.json
    tsconfig.json
    vitest.config.ts
  analytics-ui/           ← new package: @quizzquizz/analytics-ui (frontend)
    index.html
    vite.config.ts
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      main.ts
      api-client.ts       ← fetches /api/analytics/* endpoints
      router.ts           ← hash-based routing (same pattern as host/player apps)
      components/
        host/             ← host-facing dashboard components
        player/           ← player-facing dashboard components
        shared/           ← reusable chart/table web components
```

### Dependency graph

```
@quizzquizz/analytics          (backend library)
  ├── @quizzquizz/common       (types, scoring utils)
  └── @prisma/client           (read-only DB access)

@quizzquizz/analytics-ui       (frontend app)
  └── @quizzquizz/common       (types only — for API response shapes)
```

The analytics backend package **never writes** to the database. It is a pure consumer of data produced by `recordSessionStats()` in the API server.

The analytics-ui package is a **standalone Vite app** — it does not depend on host-app or player-app code to avoid coupling. It shares only `@quizzquizz/common` types for API contract alignment.

---

## Feature Overview

### 1. Host Analytics

#### 1.1 Session Report

Given a session ID and host token, produce a complete post-game breakdown:

- **Per-question accuracy** — percentage of players who answered correctly, indexed by question order.
- **Answer-option heatmap** — for each question, the selection count and percentage per answer option, highlighting dominant distractors (wrong answers chosen more often than the correct one).
- **Response-time distribution** — per-question percentiles (p25 / p50 / p75 / p95) computed from `PlayerAnswer.responseTimeMs`. Distinguishes "snap decisions" from "deliberate reasoning".
- **Player performance spread** — min / median / max score; standard deviation; histogram buckets showing how scores cluster.
- **Unanswered rate** — fraction of players who did not submit an answer for each question (timed out), derived from comparing `timesAppeared` against `timesAnswered`.

#### 1.2 Question-Bank Health Report

Aggregates `QuestionGlobalStat` rows for an entire bank. Surfaces quality signals:

- **Difficulty calibration** — scatter each question by its declared difficulty (`easy` / `medium` / `hard`) vs. `empiricalDifficulty`. Flag any question where divergence exceeds 0.3 (already stored as `flagDifficultyMismatch`).
- **Distractor effectiveness** — for every wrong answer, compute a "distractor power" score: `selectionCount / totalAnswers`. A perfectly balanced 4-option question should have ~0.25 per wrong answer. Outliers indicate ambiguous wording or implausible distractors.
- **Staleness detection** — questions with `timesAppeared > 50` but where the last 20 sessions show accuracy > 0.95 are likely memorised by the player base and should be rotated.
- **Coverage gaps** — compare the set of topics and tags in the bank against the set of topics that appear in `QuestionGlobalStat`; topics with zero plays are "dead" content.
- **Question ranking** — sort questions by composite quality score (balanced accuracy, effective distractors, reasonable response times) to highlight the best and worst questions.

#### 1.3 Engagement Over Time

Time-series views built from `HostedSession.completedAt`:

- **Sessions per day / week / month** — how often the bank is used.
- **Average players per session** — engagement trend.
- **Average accuracy per session** — are players collectively improving, or is the bank getting stale?

#### 1.4 Comparative Analysis

When a host has run the same bank multiple times:

- **Session-over-session delta** — did accuracy improve between runs? Did the same questions remain problematic?
- **Cohort comparison** — compare two arbitrary sessions (e.g., "Class A on Monday" vs. "Class B on Tuesday") on per-question accuracy.

---

### 2. Player Analytics

#### 2.1 Personal Dashboard Summary

Aggregate stats for the authenticated player:

- **Lifetime stats** — total quizzes played, total questions answered, overall accuracy, average rank.
- **Recent activity** — last 10 sessions with score, rank, accuracy, and date.
- **Current streaks** — consecutive sessions played (engagement streak) and consecutive sessions with accuracy > 80% (mastery streak).

#### 2.2 Accuracy Trend

Time-series of per-session accuracy (`correctAnswers / totalQuestions`) plotted over the player's history:

- **Rolling average** — 5-session moving average to smooth noise.
- **Slope indicator** — positive slope = improving; negative = regressing.
- **Milestone markers** — first time above 50%, 75%, 90%.

#### 2.3 Weak-Topic Analysis

Builds on the existing `GET /api/users/me/weak-topics` data:

- **Topic accuracy breakdown** — per topic: times answered, times correct, accuracy percentage.
- **Prioritised study list** — topics sorted by accuracy ascending (weakest first), secondarily by volume (more data = higher confidence).
- **Cross-bank awareness** — the same topic may appear in multiple banks; aggregate across all of them for a true picture.
- **Trend per topic** — is the player's accuracy on "History" going up or down over the last 5 sessions?

#### 2.4 Response-Time Profile

Derived from `UserQuestionStat.averageResponseMs` and per-answer `responseTimeMs`:

- **Speed vs. accuracy scatter** — plot each question the player has attempted by average response time (x) vs. accuracy (y). Four quadrants emerge: fast+correct (mastered), slow+correct (knows but hesitates), fast+wrong (guessing), slow+wrong (confused).
- **Difficulty curve** — average response time grouped by declared difficulty. Are "hard" questions actually harder for this player, or are they answering everything in the same time?

#### 2.5 Practice Recommendations

Powered by `UserQuestionStat.practiceWeight` (spaced-repetition weight):

- **Priority queue** — surface the N questions with highest `practiceWeight` (questions the player keeps getting wrong).
- **Bank-scoped drill** — filter recommendations to a specific bank for focused study.
- **Mastered questions** — questions with `practiceWeight < 0.3` and `timesAnswered >= 5` are considered mastered; show a count and allow filtering them out.
- **Recommended session size** — suggest a practice session length based on the number of high-weight questions (e.g., "You have 12 questions to review — try a 15-question session mixing 12 weak + 3 mastered for confidence").

#### 2.6 Comparison to Global

Uses `QuestionGlobalStat` to contextualise personal performance:

- **Per-question delta** — player accuracy minus global accuracy. Positive = outperforming the crowd; negative = struggling more than average.
- **Percentile rank** — where the player sits in the distribution of all players who attempted the same bank.

---

### 3. Shared Computations

Reusable statistical primitives used by both host and player modules.

| Function | Purpose |
|---|---|
| `rollingAverage(values, window)` | Compute a moving average over a series. |
| `percentiles(values, [25, 50, 75, 95])` | Return requested percentile values from a numeric array. |
| `slope(series)` | Linear regression slope over a time-indexed series (positive = improving). |
| `standardDeviation(values)` | Population standard deviation. |
| `histogram(values, bucketCount)` | Bucket a numeric array into N equal-width bins with counts. |
| `compositeQualityScore(question)` | Weighted score combining accuracy balance, distractor spread, and response-time reasonableness. |
| `streaks(booleans)` | Longest and current streak of consecutive `true` values. |

---

## Architecture

### Design Principles

1. **Read-only** — the analytics package never writes to the database. It consumes tables populated by the API server's `recordSessionStats()`.
2. **Pure functions where possible** — most computations accept plain data arrays and return results. This makes them trivially testable and decoupled from Prisma.
3. **Thin Prisma query layer** — a small set of "data loader" functions issue Prisma queries to fetch the rows needed, then delegate to pure computation functions.
4. **No new tables** — all analytics are derived from existing schema. If a query is too expensive, add a database index; do not duplicate data into analytics-specific tables.
5. **Pagination by default** — every list-returning function accepts `limit` and `offset`. Analytics datasets can grow large.

### Module Structure

```
src/
├── index.ts                    # Public API barrel export
├── loaders.ts                  # Prisma data-fetching functions
├── host/
│   ├── session-report.ts       # §1.1 Session Report
│   ├── bank-health.ts          # §1.2 Question-Bank Health Report
│   ├── engagement.ts           # §1.3 Engagement Over Time
│   └── comparative.ts          # §1.4 Comparative Analysis
├── player/
│   ├── dashboard.ts            # §2.1 Personal Dashboard Summary
│   ├── accuracy-trend.ts       # §2.2 Accuracy Trend
│   ├── weak-topics.ts          # §2.3 Weak-Topic Analysis
│   ├── response-profile.ts     # §2.4 Response-Time Profile
│   ├── practice.ts             # §2.5 Practice Recommendations
│   └── global-comparison.ts    # §2.6 Comparison to Global
└── shared/
    ├── stats.ts                # rollingAverage, percentiles, slope, stddev, histogram
    ├── quality.ts              # compositeQualityScore, distractor analysis
    └── streaks.ts              # streak computation
```

### Data Flow

```
┌──────────────┐      ┌──────────────┐      ┌───────────────────┐
│  SQLite DB   │─────▶│  loaders.ts  │─────▶│  host/ or player/ │
│  (Prisma)    │      │  (queries)   │      │  (pure functions) │
└──────────────┘      └──────────────┘      └───────┬───────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │  Result DTOs   │
                                            │  (plain objects)│
                                            └───────────────┘
```

1. **API route handler** calls an analytics function (e.g., `getSessionReport(sessionId)`).
2. The analytics function calls a loader to fetch raw rows from Prisma.
3. Raw rows are passed to pure computation functions in `shared/`.
4. A typed result DTO is returned — ready for JSON serialisation by the API route.

### Integration with API Server

The analytics package is consumed by the API server as a library dependency:

```
@quizzquizz/api-server
  └── @quizzquizz/analytics   (new dependency)
```

New routes are added under `/api/analytics/...` in the API server, delegating to analytics package functions. The analytics package itself does not define routes — it is framework-agnostic.

Suggested route structure:

| Route | Analytics function | Authorization |
|---|---|---|
| `GET /api/analytics/sessions/:id/report` | `host/session-report` | Authenticated user who hosted the session |
| `GET /api/analytics/banks/:id/health` | `host/bank-health` | Authenticated host (must have hosted ≥1 session with this bank) |
| `GET /api/analytics/banks/:id/engagement` | `host/engagement` | Authenticated host (must have hosted ≥1 session with this bank) |
| `GET /api/analytics/sessions/compare` | `host/comparative` | Authenticated user who hosted both sessions |
| `GET /api/analytics/me/dashboard` | `player/dashboard` | Authenticated player (own data only) |
| `GET /api/analytics/me/accuracy-trend` | `player/accuracy-trend` | Authenticated player (own data only) |
| `GET /api/analytics/me/weak-topics` | `player/weak-topics` | Authenticated player (own data only) |
| `GET /api/analytics/me/response-profile` | `player/response-profile` | Authenticated player (own data only) |
| `GET /api/analytics/me/practice` | `player/practice` | Authenticated player (own data only) |
| `GET /api/analytics/me/global-comparison` | `player/global-comparison` | Authenticated player (own data only) |

---

## Authorization

All analytics endpoints require authentication. Anonymous users cannot access analytics — they must sign in first.

### Principles

1. **Authentication is mandatory** — every `/api/analytics/*` route uses `requireAuth` middleware. Unauthenticated requests receive `401 Unauthorized`.
2. **Players see only their own data** — all `/api/analytics/me/*` routes are scoped to `user.id` from the session cookie. No `userId` parameter is accepted; the server derives the user from the authentication context. This prevents IDOR (Insecure Direct Object Reference) attacks.
3. **Hosts see only their own sessions** — host analytics routes verify that the authenticated user's `id` matches the `userId` on the `HostedSession` record. A host cannot view analytics for sessions they did not create.
4. **Bank-level stats require hosting history** — `GET /api/analytics/banks/:id/health` and `/engagement` are restricted to users who have hosted at least one session with that bank (checked via `HostedSession` records). This prevents arbitrary users from browsing question-bank performance data.
5. **Global question stats are read-through only** — `QuestionGlobalStat` data (empirical difficulty, answer selections) is exposed _within_ authorized host and player reports. There is no public endpoint to enumerate all global stats directly.

### Access Control Matrix

| Resource | Player (own data) | Host (own sessions) | Admin (future) |
|---|---|---|---|
| Personal dashboard, trends, topics | ✅ | ✅ | ✅ All users |
| Practice recommendations | ✅ | ✅ | ✅ All users |
| Session report | ❌ | ✅ (if they hosted it) | ✅ All sessions |
| Bank health & engagement | ❌ | ✅ (if they hosted with that bank) | ✅ All banks |
| Session comparison | ❌ | ✅ (if they hosted both) | ✅ Any pair |
| Cross-user analytics | ❌ | ❌ | ✅ |

### Implementation Pattern

The authorization logic lives in the **API server route handlers**, not in the analytics package. The analytics package is a pure computation library — it accepts a `userId` or `sessionId` and returns data. The route handler is responsible for:

1. Authenticating the user (via `requireAuth` middleware, using Better Auth session cookies).
2. Verifying ownership before calling the analytics function.
3. Returning `403 Forbidden` if the user does not own the requested resource.

```
Request → requireAuth (401 if no session)
        → ownership check (403 if not owner)
        → analytics function (compute & return)
```

**Host ownership check** (example logic for session report):
```
const session = await prisma.hostedSession.findFirst({
  where: { sessionId: params.id, userId: user.id },
});
if (!session) return 403;
```

**Bank ownership check** (example logic for bank health):
```
const hasHosted = await prisma.hostedSession.findFirst({
  where: { questionBankId: params.id, userId: user.id },
});
if (!hasHosted) return 403;
```

Player `/me/*` routes need no ownership check beyond authentication — the `user.id` from the session cookie is used directly as the query filter.

### Admin Role (Future Phase)

A future phase will introduce an `admin` role with elevated analytics access:

- Admins can view analytics for **any** session, bank, or user.
- Admins access a platform-wide analytics dashboard (total users, total sessions, global engagement metrics).
- The admin role will be stored on the `User` model (e.g., `role: 'user' | 'admin'`).
- A `requireAdmin` middleware will gate admin-only endpoints.
- Admin routes will live under `/api/analytics/admin/*`.

This is deferred because the role system does not exist yet and the platform is single-tenant for now.

---

### Recommended Libraries

#### Computation

| Library | Purpose | Why |
|---|---|---|
| **[simple-statistics](https://www.npmjs.com/package/simple-statistics)** | Percentiles, standard deviation, linear regression, histograms | Zero-dependency, pure-function API, TypeScript types included. Covers everything in `shared/stats.ts` without reinventing the wheel. |
| **[date-fns](https://www.npmjs.com/package/date-fns)** | Date grouping (by week/month), interval arithmetic, formatting | Tree-shakeable, no mutable state (unlike Moment/Luxon). Needed for engagement time-series and trend calculations. |

#### Data Access

| Library | Purpose | Why |
|---|---|---|
| **[Prisma Client](https://www.npmjs.com/package/@prisma/client)** | Database queries | Already used by the API server. Re-use the same generated client — no additional ORM needed. |

#### Caching

| Library | Purpose | Why |
|---|---|---|
| **[lru-cache](https://www.npmjs.com/package/lru-cache)** | In-memory TTL cache for computed results | Mature, zero-dependency, supports TTL and max-size eviction. A single shared instance per analytics module is sufficient. |

#### Validation

| Library | Purpose | Why |
|---|---|---|
| **[Zod](https://www.npmjs.com/package/zod)** | Request parameter validation, result DTO schemas | Already the project standard. Validate incoming query params (`limit`, `offset`, `bankId`) and define result shapes as Zod schemas with inferred types. |

#### Testing

| Library | Purpose | Why |
|---|---|---|
| **[Vitest](https://www.npmjs.com/package/vitest)** | Unit and integration tests | Already the project standard. Use `vi.mock()` to stub Prisma in computation tests. |

#### Libraries to Avoid

| Library | Reason to skip |
|---|---|
| **D3 / Chart.js / Recharts** | Charts belong in the frontend apps, not in the analytics computation package. The package returns data; the UI renders it. |
| **Pandas-style dataframes (Danfo.js, Arquero)** | Over-engineered for the query patterns here. Prisma + simple-statistics covers all needs at lower complexity. |
| **Redis** | Not warranted for the current scale. In-memory LRU cache is sufficient; adding Redis introduces deployment complexity against the project's simplicity principle. |
| **Heavy stats/ML libraries (TensorFlow.js, ml.js)** | Predictive models are explicitly out of scope for v1. Don't pay the dependency cost. |

---

### Caching Strategy

Analytics queries can be expensive (aggregating thousands of rows). Recommended approach:

- **Short TTL in-memory cache** — cache computed results for 30–60 seconds keyed by `(functionName, args)`. Sufficient for the polling-based UI.
- **ETag support** — return a version hash with each response; clients skip re-processing if nothing changed.
- **No pre-computation** — keep the system simple. Only add materialised views or background jobs if profiling shows unacceptable latency.

---

## Testing Strategy

Following the project convention (Vitest, `*.test.ts` co-located):

| Layer | What to test | Approach |
|---|---|---|
| `shared/` | Pure math functions | Unit tests with known inputs/outputs. Edge cases: empty arrays, single element, all-same values, NaN guards. |
| `host/` and `player/` | Computation modules | Unit tests with mock data arrays (no Prisma). Verify correct aggregation, sorting, and edge cases. |
| `loaders.ts` | Prisma queries | Integration tests against in-memory SQLite (same pattern as `session-stats.test.ts`). Seed data, call loader, assert shape. |
| API routes | End-to-end correctness | E2E tests (Playwright) following existing patterns: create session → play through → finish → hit analytics endpoints → verify response. |

Target: **90%+ coverage on `shared/`**, 80%+ on computation modules, integration tests for every loader.

---

## Relation to Existing Endpoints

Several analytics features overlap with endpoints that already exist today. The analytics package **subsumes and extends** them:

| Existing endpoint | Analytics equivalent | Difference |
|---|---|---|
| `GET /api/sessions/:id/question-stats` | `host/session-report` | Adds response-time percentiles, player spread, unanswered rate. |
| `GET /api/users/me/stats` | `player/dashboard` | Adds streaks, recent activity, richer aggregates. |
| `GET /api/users/me/question-stats` | `player/practice` | Adds mastery detection, session-size recommendations. |
| `GET /api/users/me/weak-topics` | `player/weak-topics` | Adds per-topic trend, cross-bank aggregation. |
| `GET /api/question-banks/:id/stats` | `host/bank-health` | Adds staleness detection, coverage gaps, quality ranking. |

The existing endpoints remain available for backward compatibility. New analytics routes live under `/api/analytics/` and provide the richer output. Over time, clients migrate to the analytics routes.

---

## Frontend Package — `@quizzquizz/analytics-ui`

The analytics UI is a **standalone Vite app** served on its own port, separate from host-app and player-app. This avoids bloating either existing app with analytics-specific components, keeps build times isolated, and allows independent deployment.

### Access & Navigation

The analytics-ui app uses **hash-based routing** (same pattern as host-app / player-app):

| Route | Screen | Auth | API Endpoint |
|---|---|---|---|
| `#/host/sessions/:id` | Session Report | Authenticated host (must own session) | `GET /api/analytics/sessions/:id/report` |
| `#/host/banks/:id/health` | Bank Health Dashboard | Authenticated host (must have hosted with bank) | `GET /api/analytics/banks/:id/health` |
| `#/host/banks/:id/engagement` | Engagement Timeline | Authenticated host (must have hosted with bank) | `GET /api/analytics/banks/:id/engagement` |
| `#/host/sessions/compare` | Session Comparison | Authenticated host (must own both sessions) | `GET /api/analytics/sessions/compare` |
| `#/player/dashboard` | Personal Dashboard | Authenticated player (own data) | `GET /api/analytics/me/dashboard` |
| `#/player/trend` | Accuracy Trend | Authenticated player (own data) | `GET /api/analytics/me/accuracy-trend` |
| `#/player/topics` | Weak Topics | Authenticated player (own data) | `GET /api/analytics/me/weak-topics` |
| `#/player/speed` | Response-Time Profile | Authenticated player (own data) | `GET /api/analytics/me/response-profile` |
| `#/player/practice` | Practice Recommendations | Authenticated player (own data) | `GET /api/analytics/me/practice` |
| `#/player/compare` | Global Comparison | Authenticated player (own data) | `GET /api/analytics/me/global-comparison` |

The analytics-ui requires authentication. If a user navigates to it without being signed in, the app redirects to a sign-in screen (shared authentication cookies with host-app and player-app via same-origin).

Host-app and player-app link to the analytics-ui via simple anchor tags (e.g., "View detailed analytics →") pointing at the analytics-ui URL with the appropriate hash route. No code sharing or iframe embedding required.

### Host Screens

- **Session Report** — enriched version of the existing question-stats table: per-question accuracy, answer-option heatmap, response-time percentiles (p25/p50/p75), player score distribution (histogram + std dev), unanswered rate.
- **Bank Health Dashboard** — scatter plot (declared vs. empirical difficulty), distractor effectiveness table, staleness alerts, coverage gap warnings, composite quality ranking.
- **Engagement Timeline** — line charts: sessions per week, average players per session, average accuracy over time.
- **Session Comparison** — side-by-side per-question accuracy for two selected sessions; highlights questions that improved or regressed.

### Player Screens

- **Personal Dashboard** — lifetime stats (total played, overall accuracy, average rank), recent 10-session feed, engagement streak, mastery streak.
- **Accuracy Trend** — line chart with 5-session rolling average, slope indicator (improving / regressing), milestone markers (first 50% / 75% / 90%).
- **Weak Topics** — sortable table: topic, accuracy %, times answered, trend arrow (up/down over last 5 sessions). Weakest topics first.
- **Response-Time Profile** — scatter plot with four quadrants: fast+correct (mastered), slow+correct (hesitant), fast+wrong (guessing), slow+wrong (confused).
- **Practice Recommendations** — priority list of high-`practiceWeight` questions, mastered count, recommended session size. "Start Practice Session" button creates a quiz session from the recommended question set.
- **Global Comparison** — per-question delta (player accuracy − global accuracy), percentile rank within the bank's player pool.

### Visualization Guidelines

Following the project's **simplicity-first** approach:

- **No charting library by default** — use native SVG or HTML5 `<canvas>` for line charts, bar charts, and scatter plots. This keeps the bundle minimal.
- **Web Components** — each visualization is a custom element (e.g., `<accuracy-trend-chart>`, `<topic-breakdown-table>`) with a `setData(data)` method.
- **Progressive enhancement** — tables first; charts as enhancement. All data must be readable in tabular form without JavaScript-rendered graphics.
- **Polling updates** — screens re-fetch data every 5–10 seconds using the same polling pattern as the game UI.

If native SVG becomes too complex for scatter plots or histograms, consider **[uPlot](https://github.com/leeoniya/uPlot)** (~45KB, fast) or **[Chart.js](https://www.chartjs.org/)** (~200KB, broader feature set) — but only after attempting native rendering first.

### Linking from Existing Apps

The host-app and player-app remain untouched except for adding navigation links:

- **Host-app**: a "View Analytics" link on the final results screen and on the session history page, pointing to `analytics-ui#/host/sessions/:id`.
- **Player-app**: a "My Analytics" link in the profile/account section, pointing to `analytics-ui#/player/dashboard`.

This keeps the change footprint in existing apps to a few anchor tags.

---

## Out of Scope (for v1)

These features are intentionally deferred:

- **Real-time in-game analytics** — requires live aggregation during a running session; covered separately in Phase 12's "Real-time stats" item.
- **PDF / CSV export** — a presentation concern, not a computation concern. Should live in the API server or a dedicated export module.
- **LMS integration** — Phase 15 scope.
- **Team-based analytics** — depends on Phase 11 (Team Mode); add once teams exist.
- **Predictive models** — e.g., "predict this player's score on the next quiz." Interesting but premature; insufficient data volume in early deployment.
- **Admin role and platform-wide analytics** — an `admin` role that can view all users' data, all sessions, and platform-wide metrics. Requires adding a role field to the User model and `requireAdmin` middleware. Planned for a later phase once the role system is implemented.
