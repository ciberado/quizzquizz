# Phase 12: Analytics Package — Implementation Plan

**Design document**: [ANALYTICS-PACKAGE.md](../ANALYTICS-PACKAGE.md)

**Prerequisites**: Phase 9F (Granular Question Statistics) ✅ COMPLETE

**Packages created**: `@quizzquizz/analytics` (backend), `@quizzquizz/analytics-ui` (frontend)

---

## Sub-Phase Overview

| Sub-Phase | Scope | Est. Time | Dependencies |
|---|---|---|---|
| **12A** | Package scaffolding & shared computation library | 2–3 hrs | Phase 9F ✅ |
| **12B** | Host analytics backend (session report, bank health) | 3–4 hrs | 12A |
| **12C** | Player analytics backend (dashboard, trends, practice) | 3–4 hrs | 12A |
| **12D** | API routes & authorization | 2–3 hrs | 12B, 12C |
| **12E** | Analytics-UI app: shared components & host screens | 3–4 hrs | 12D |
| **12F** | Analytics-UI app: player screens & linking | 3–4 hrs | 12D, 12E |
| **12G** | Docker & deployment integration | 1–2 hrs | 12E, 12F |

**Total estimate**: 17–24 hours

---

## Phase 12A: Package Scaffolding & Shared Computation Library

**Goal**: Create both packages and implement the reusable statistical primitives.

### Tasks

- [ ] **12A-1**: Create `packages/analytics/` package
  - `package.json` (`@quizzquizz/analytics`, dependencies: `@quizzquizz/common`, `@prisma/client`, `simple-statistics`, `date-fns`, `lru-cache`)
  - `tsconfig.json` (extends `tsconfig.base.json`, project references to `common`)
  - `vitest.config.ts`
  - `src/index.ts` barrel export

- [ ] **12A-2**: Create `packages/analytics-ui/` package
  - `package.json` (`@quizzquizz/analytics-ui`, dependencies: `@quizzquizz/common`)
  - `tsconfig.json`
  - `vite.config.ts` (dev server port, API proxy to api-server)
  - `vitest.config.ts`
  - `index.html` (minimal shell)
  - `src/main.ts`, `src/router.ts`, `src/api-client.ts` (stub files)

- [ ] **12A-3**: Implement `shared/stats.ts`
  - `rollingAverage(values: number[], window: number): number[]`
  - `percentiles(values: number[], quantiles: number[]): number[]`
  - `slope(series: number[]): number`
  - `standardDeviation(values: number[]): number`
  - `histogram(values: number[], bucketCount: number): { min: number; max: number; count: number }[]`
  - Use `simple-statistics` internally

- [ ] **12A-4**: Implement `shared/quality.ts`
  - `compositeQualityScore(question: QuestionGlobalStatData): number`
  - `distractorPower(answerSelections: Record<string, number>, correctIds: string[], totalAnswers: number): Record<string, number>`
  - `isDominantDistractor(answerId: string, answerSelections: Record<string, number>, correctIds: string[]): boolean`

- [ ] **12A-5**: Implement `shared/streaks.ts`
  - `streaks(booleans: boolean[]): { current: number; longest: number }`

- [ ] **12A-6**: Tests for all shared modules
  - Unit tests for every function with edge cases (empty arrays, single element, NaN, all-same values)
  - Target: 90%+ coverage on `shared/`

- [ ] **12A-7**: Register packages in workspace
  - Add both packages to root `package.json` workspaces
  - Verify `npm install` and `npm run build --workspaces` succeed
  - Add TypeScript project references

**Deliverable**: Both packages exist in the monorepo. `shared/` library is fully implemented and tested.

---

## Phase 12B: Host Analytics Backend

**Goal**: Implement the four host-facing analytics modules and their data loaders.

### Tasks

- [ ] **12B-1**: Implement `loaders.ts` — host data loaders
  - `loadSessionAnswers(sessionId: string)` — all `PlayerAnswer` rows for a session with player info
  - `loadSessionPlayers(sessionId: string)` — all players with scores
  - `loadBankGlobalStats(questionBankId: string)` — all `QuestionGlobalStat` rows for a bank
  - `loadHostedSessions(userId: string, questionBankId?: string)` — `HostedSession` rows with player counts

- [ ] **12B-2**: Implement `host/session-report.ts`
  - Input: `sessionId`
  - Output: per-question accuracy, answer-option heatmap, response-time percentiles (p25/p50/p75/p95), player performance spread (min/median/max/stddev/histogram), unanswered rate
  - Uses `loadSessionAnswers()` + `loadSessionPlayers()` → `percentiles()`, `histogram()`, `standardDeviation()`

- [ ] **12B-3**: Implement `host/bank-health.ts`
  - Input: `questionBankId`
  - Output: difficulty calibration (declared vs empirical), distractor effectiveness per question, staleness detection, coverage gaps, composite quality ranking
  - Uses `loadBankGlobalStats()` + in-memory question bank data → `compositeQualityScore()`, `distractorPower()`

- [ ] **12B-4**: Implement `host/engagement.ts`
  - Input: `userId`, `questionBankId`, `range` (day/week/month)
  - Output: sessions per period, average players per session, average accuracy per session
  - Uses `loadHostedSessions()` → `date-fns` grouping

- [ ] **12B-5**: Implement `host/comparative.ts`
  - Input: `sessionId1`, `sessionId2`
  - Output: per-question accuracy delta, questions that improved/regressed
  - Uses `loadSessionAnswers()` for both sessions → compare

- [ ] **12B-6**: Tests for host modules
  - Unit tests with mock data arrays (no Prisma)
  - Integration tests for loaders against in-memory SQLite
  - Target: 80%+ coverage

**Deliverable**: All host analytics functions return correct results from test data.

---

## Phase 12C: Player Analytics Backend

**Goal**: Implement the six player-facing analytics modules and their data loaders.

### Tasks

- [ ] **12C-1**: Implement `loaders.ts` — player data loaders
  - `loadPlayerStats(userId: string)` — all `PlayerStat` rows for a user
  - `loadUserQuestionStats(userId: string, bankId?: string)` — `UserQuestionStat` rows with pagination
  - `loadPlayerAnswersForUser(userId: string)` — `PlayerAnswer` rows joined with question metadata

- [ ] **12C-2**: Implement `player/dashboard.ts`
  - Input: `userId`
  - Output: lifetime stats (total played, total answered, overall accuracy, average rank), recent 10 sessions, engagement streak, mastery streak (accuracy > 80%)
  - Uses `loadPlayerStats()` → `streaks()`

- [ ] **12C-3**: Implement `player/accuracy-trend.ts`
  - Input: `userId`
  - Output: per-session accuracy time series, 5-session rolling average, slope, milestone markers
  - Uses `loadPlayerStats()` → `rollingAverage()`, `slope()`

- [ ] **12C-4**: Implement `player/weak-topics.ts`
  - Input: `userId`, optional `bankId`
  - Output: per-topic accuracy breakdown, prioritised study list, trend per topic
  - Uses `loadUserQuestionStats()` + question bank metadata → group by topic, sort by accuracy ASC

- [ ] **12C-5**: Implement `player/response-profile.ts`
  - Input: `userId`
  - Output: speed vs accuracy scatter data (per question: avgResponseMs, accuracy), difficulty curve
  - Uses `loadUserQuestionStats()` → quadrant classification

- [ ] **12C-6**: Implement `player/practice.ts`
  - Input: `userId`, optional `bankId`, `limit`
  - Output: priority queue of high-`practiceWeight` questions, mastered count, recommended session size
  - Uses `loadUserQuestionStats()` → sort by `practiceWeight` DESC, filter mastered (`< 0.3` and `>= 5` attempts)

- [ ] **12C-7**: Implement `player/global-comparison.ts`
  - Input: `userId`, `bankId`
  - Output: per-question delta (player accuracy − global accuracy), percentile rank
  - Uses `loadUserQuestionStats()` + `loadBankGlobalStats()` → compare

- [ ] **12C-8**: Tests for player modules
  - Unit tests with mock data arrays
  - Integration tests for loaders
  - Target: 80%+ coverage

**Deliverable**: All player analytics functions return correct results from test data.

---

## Phase 12D: API Routes & Authorization

**Goal**: Wire analytics functions into API server routes with proper authentication and ownership checks.

### Tasks

- [ ] **12D-1**: Add `@quizzquizz/analytics` as dependency of `api-server`
  - Update `packages/api-server/package.json`
  - Verify TypeScript project references and build order

- [ ] **12D-2**: Create `routes/analytics.ts` in api-server
  - Mount at `/api/analytics`
  - Apply `requireAuth` middleware to all routes

- [ ] **12D-3**: Implement host analytics routes with ownership checks
  - `GET /api/analytics/sessions/:id/report` — verify user owns `HostedSession` for this session
  - `GET /api/analytics/banks/:id/health` — verify user has hosted ≥1 session with this bank
  - `GET /api/analytics/banks/:id/engagement` — same ownership check as bank health
  - `GET /api/analytics/sessions/compare` — verify user owns both sessions
  - Return `403` if ownership check fails

- [ ] **12D-4**: Implement player analytics routes
  - `GET /api/analytics/me/dashboard` — scope to `user.id` from session
  - `GET /api/analytics/me/accuracy-trend` — scope to `user.id`
  - `GET /api/analytics/me/weak-topics` — scope to `user.id`, optional `?bankId=` filter
  - `GET /api/analytics/me/response-profile` — scope to `user.id`
  - `GET /api/analytics/me/practice` — scope to `user.id`, optional `?bankId=`, `?limit=`
  - `GET /api/analytics/me/global-comparison` — scope to `user.id`, required `?bankId=`
  - No ownership check needed beyond auth — `user.id` is the filter

- [ ] **12D-5**: Add Zod schemas for query parameters and response shapes
  - Request validation: `limit`, `offset`, `bankId`, `range`, `sessionIds`
  - Response DTOs: typed Zod schemas exported from analytics package

- [ ] **12D-6**: Implement LRU caching layer
  - Cache analytics results for 30–60s keyed by `(endpoint, userId, params)`
  - ETag header support for client-side cache validation

- [ ] **12D-7**: Authorization tests
  - Test 401 for unauthenticated requests
  - Test 403 for wrong-user access to host endpoints
  - Test that player endpoints only return own data
  - Test that host endpoints reject non-owners
  - Integration tests against in-memory SQLite

**Deliverable**: All 10 analytics endpoints working with correct auth. No data leaks between users.

---

## Phase 12E: Analytics-UI — Shared Components & Host Screens

**Goal**: Build the analytics-ui frontend app with reusable chart components and all host-facing screens.

### Tasks

- [ ] **12E-1**: Set up analytics-ui app shell
  - `src/main.ts` — mount router, check auth (redirect to sign-in if needed)
  - `src/router.ts` — hash-based routing with all `#/host/*` and `#/player/*` routes
  - `src/api-client.ts` — fetch wrapper for all `/api/analytics/*` endpoints with error handling
  - Navigation sidebar: host section / player section links

- [ ] **12E-2**: Implement shared chart components
  - `<line-chart>` — SVG-based line chart with optional rolling average overlay
  - `<bar-chart>` — horizontal/vertical bar chart with color coding
  - `<scatter-plot>` — SVG scatter with quadrant labels
  - `<data-table>` — sortable table with expandable rows (based on existing `question-stats-table` pattern)
  - `<stat-card>` — summary card showing a number + label + trend arrow
  - All components: `setData(data)` method, responsive sizing

- [ ] **12E-3**: Host — Session Report screen
  - Route: `#/host/sessions/:id`
  - Components: per-question accuracy bar chart, answer-option heatmap table, response-time percentile cards, player score histogram, unanswered rate indicators

- [ ] **12E-4**: Host — Bank Health Dashboard screen
  - Route: `#/host/banks/:id/health`
  - Components: difficulty calibration scatter plot (declared vs empirical), distractor table, staleness alert cards, coverage gap list, quality-ranked question table

- [ ] **12E-5**: Host — Engagement Timeline screen
  - Route: `#/host/banks/:id/engagement`
  - Components: three line charts (sessions/week, avg players, avg accuracy), date range selector

- [ ] **12E-6**: Host — Session Comparison screen
  - Route: `#/host/sessions/compare`
  - Components: session selector (dropdown of owned sessions), side-by-side per-question accuracy table with delta highlighting

- [ ] **12E-7**: Unit tests for shared chart components
  - Test data rendering, empty state, sorting

**Deliverable**: Host can access all four analytics screens with live data.

---

## Phase 12F: Analytics-UI — Player Screens & Linking

**Goal**: Build all player-facing screens and add navigation links from existing apps.

### Tasks

- [ ] **12F-1**: Player — Personal Dashboard screen
  - Route: `#/player/dashboard`
  - Components: stat cards (total played, accuracy, avg rank), recent activity feed, streak counters

- [ ] **12F-2**: Player — Accuracy Trend screen
  - Route: `#/player/trend`
  - Components: line chart with rolling average, slope indicator badge, milestone markers

- [ ] **12F-3**: Player — Weak Topics screen
  - Route: `#/player/topics`
  - Components: sortable data table (topic, accuracy %, times answered, trend arrow), bank filter dropdown

- [ ] **12F-4**: Player — Response-Time Profile screen
  - Route: `#/player/speed`
  - Components: scatter plot (speed vs accuracy, four quadrant labels), difficulty curve line chart

- [ ] **12F-5**: Player — Practice Recommendations screen
  - Route: `#/player/practice`
  - Components: priority question list, mastered count card, recommended session size, "Start Practice Session" button (creates session from recommended questions)

- [ ] **12F-6**: Player — Global Comparison screen
  - Route: `#/player/compare`
  - Components: per-question delta bar chart (positive/negative), percentile rank card, bank selector

- [ ] **12F-7**: Add navigation links from existing apps
  - Host-app: "View Analytics" link on final results screen and session history page → `analytics-ui#/host/sessions/:id`
  - Player-app: "My Analytics" link in profile/account section → `analytics-ui#/player/dashboard`

- [ ] **12F-8**: E2E tests
  - Full workflow: sign in → play game → finish → navigate to analytics → verify data displayed
  - Host flow: create session → play → view session report → view bank health
  - Player flow: sign in → play → view dashboard → view trend → view weak topics
  - Authorization: verify 403 when accessing other user's data

**Deliverable**: Complete analytics-ui app with all screens. Linked from host-app and player-app.

---

## Phase 12G: Docker & Deployment Integration

**Goal**: Serve analytics-ui through the existing Docker/Caddy setup.

### Tasks

- [ ] **12G-1**: Build analytics-ui in Dockerfile
  - Add build step for `@quizzquizz/analytics-ui` in multi-stage Dockerfile
  - Serve built assets from API server (same pattern as host-app, player-app)

- [ ] **12G-2**: Add Caddy route for analytics-ui
  - Route `/analytics*` to analytics-ui static files
  - Ensure shared auth cookies work across `/`, `/host`, `/analytics` paths

- [ ] **12G-3**: Update `docker-compose.yml`
  - Rebuild and verify all routes work through Caddy

- [ ] **12G-4**: Smoke test in Docker
  - Verify analytics endpoints accessible through Caddy
  - Verify auth cookies shared between apps
  - Verify all three apps load correctly

**Deliverable**: Single `docker compose up` serves api, host, player, and analytics apps. All auth works across apps.

---

## Testing Summary

| Sub-Phase | Tests | Coverage Target |
|---|---|---|
| 12A | Shared stats/quality/streaks unit tests | 90%+ |
| 12B | Host module unit + loader integration tests | 80%+ |
| 12C | Player module unit + loader integration tests | 80%+ |
| 12D | Authorization integration tests (401/403 scenarios) | 100% of auth paths |
| 12E | Shared component unit tests | 70%+ |
| 12F | E2E tests (Playwright) | 3+ full workflow scenarios |
| 12G | Docker smoke tests | Manual verification |

---

## Completion Criteria

Phase 12 is **complete** when:

1. All 10 analytics API endpoints return correct data with proper authorization.
2. No user can access another user's analytics data (verified by tests).
3. Analytics-ui app renders all host and player screens with live data.
4. Host-app and player-app link to analytics-ui.
5. Everything works through Docker/Caddy.
6. Test suite passes with target coverage levels.
