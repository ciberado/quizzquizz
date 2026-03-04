# Phases 7-8: Features, Deployment & Documentation

---

## Phase 7: Enhanced Features

**Goal**: Add features that improve usability and engagement.

**Dependencies**: Phase 6 complete (core experience polished).

### Phase 7A: Advanced Question Bank Management ✅ COMPLETE (Feb 11, 2026)

**Status**: COMPLETE (2.5 hours actual development time)

**Objective**: More control over question selection and ordering.

**Completed**:
- [x] Question preview API:
  - ✅ `GET /api/question-banks/:id/questions` - Return all questions in bank
  - ✅ Include difficulty, topics, tags in response
  - ✅ Pagination support (query params: page, limit)
  - ✅ Filter support (query params: difficulty, topic, tag)
- [x] Host UI enhancements:
  - ✅ Preview questions before creating session
  - ✅ Question list with expandable details
  - ✅ Filter by difficulty (Easy, Medium, Hard)
  - ✅ Filter by topic/tag (multi-select)
  - ✅ Select specific questions (checkboxes) vs. all
  - ✅ Random order toggle vs. sequential
  - ✅ Collapsible answers (triangle ▶/▼ on left side)
  - ✅ Compact layout with badges under question text
  - ✅ Button repositioning (Cancel/Create above questions list)
  - ✅ Question limit field with automatic random selection
  - ✅ Smart validation (auto-adjust when filters reduce available)
  - ✅ Manual selection mode with read-only limit
  - ✅ Random subset selection when limit is set
- [x] Question bank validation:
  - ✅ Check for minimum questions (1+)
  - ✅ Warn if no questions match filters
  - ✅ Display selected question count before creating
  
**Testing**: 15 E2E Playwright tests covering all functionality - 100% pass rate

**Deliverable**: ✅ Hosts can preview and customize question selection before starting quiz.

**Additional Features**:
- [x] Question bank hot-reload:
  - ✅ `POST /api/question-banks/reload` endpoint
  - ✅ Host UI "Refresh Banks" button on session creation screen
  - ✅ Loading state ("Reloading...") and success confirmation ("Reloaded!")
  - ✅ No restart needed when question bank files are edited
  - ✅ 3 API server tests + 1 host app client test (9/9 passing)
- [x] Multiple correct answers validation:
  - ✅ Visual warning banner: "⚠️ Select exactly N answers"
  - ✅ Submit button disabled until exact count selected
  - ✅ Selection counter: "X/Y selected" in footer
  - ✅ Timeout auto-submits regardless of selection count
  - ✅ Host display: "ℹ️ This question has N correct answers"
  - ✅ 17 comprehensive tests for validation logic
- [x] Answer shuffling:
  - ✅ Option to shuffle answer order within questions (enabled by default)
  - ✅ Prevents players from memorizing answer positions
  - ✅ Default: Enabled (`shuffleAnswers: true`) for fair gameplay
  - ✅ Host control: Checkbox in question preview screen
  - ✅ Implemented: Answers shuffled once at session creation, all players see same order
  - ✅ Validation: Answer IDs unchanged, correct answer validation works regardless
  - ✅ 21 new tests (7 shuffle utility, 11 session-utils, 3 API tests)
  - ✅ All 74 API tests pass + 32 common tests pass = 106 total tests passing
- [x] QR code to lobby screen:
  - ✅ QR code displayed on right side of PIN display
  - ✅ Encodes full player app URL with PIN
  - ✅ Players can scan and join without manually entering PIN
  - ✅ Generated dynamically using QR Server API
  - ✅ Styled with white background and border for better scanning
  - ✅ Layout adjusted to accommodate QR code
  - ✅ 4 component tests verifying QR generation and layout

---

### Phase 7B: Game Configuration Options ⚠️ PARTIALLY COMPLETE

**Status**: Core configuration + automatic features implemented, advanced scoring pending.

**Objective**: Customizable quiz parameters.

**Completed**:
- [x] Configuration UI (host create session):
  - ✅ Number of questions limit input - IMPLEMENTED (Feb 2026)
  - ✅ Random order toggle (shuffle question order) - IMPLEMENTED (Feb 2026)
  - ✅ Shuffle answers toggle - IMPLEMENTED (defaults to true, Feb 2026)
  - ✅ Automatic pace toggle - IMPLEMENTED (Feb 12, 2026)
  - ✅ **Automatic question time toggle** - IMPLEMENTED (Feb 20, 2026)
  - ✅ Difficulty filter (Easy/Medium/Hard checkboxes) - IMPLEMENTED (Phase 7A, Feb 11)
  - ✅ Topic filter (multi-select checkboxes) - IMPLEMENTED (Phase 7A, Feb 11)
- [x] API updates:
  - ✅ Accept config options in `POST /api/sessions` (randomOrder, shuffleAnswers, automaticPace, autoQuestionTime)
  - ✅ Store config in sessions table (database fields: random_order, shuffle_answers, automatic_pace, auto_question_time)
  - ✅ Apply config when loading questions (filtering, shuffling, and time calculation work correctly)
- [x] Automatic time calculation:
  - ✅ Heuristic function based on question/answer word count, answer count, and difficulty
  - ✅ Formula: Base 10s + word-based bonuses + difficulty multiplier (easy: 0.8x, medium: 1.0x, hard: 1.2x)
  - ✅ Capped between 10-90 seconds
  - ✅ Applied in both host and player game state endpoints
  - ✅ 7 comprehensive tests covering all aspects of heuristic
- [x] Auto-advance on completion:
  - ✅ API tracks when all players have answered current question
  - ✅ Host automatically advances to leaderboard after showing correct answers for 4s
  - ✅ No waiting for timer when everyone has answered
  - ✅ Works seamlessly with automatic pace feature
- [x] Validation:
  - ✅ Ensure at least 1 question selected (UI validation in place)
  - ✅ Sensible defaults (shuffleAnswers: true, automaticPace: false, randomOrder: false, autoQuestionTime: false)

**Pending Implementation**:
- [ ] Manual time limit per question (10-120 seconds slider/input) - TODO
- [ ] Points per question configuration (500-2000) - TODO
- [ ] Question time override:
  - Allow per-question time limits (from markdown)
  - Override with session default if not specified
  - Display custom time limit to players before question
- [ ] Score configuration:
  - Configurable base points per question
  - Option to disable time-based scoring (all or nothing)
  - Streak bonus multiplier (optional)
- [ ] Additional validation:
  - Time limit bounds checking
  - Points per question bounds checking

**Deliverable**: ✅ Hosts can create customized quizzes with question selection, ordering, pacing, and automatic time calculation. Quiz auto-advances when all players answer. ⚠️ Manual time/scoring configuration still pending.

**Recent Additions**:
- ✅ **Automatic question time** (Feb 20, 2026):
  - Smart time limits calculated from question complexity
  - "Automatic question time" checkbox in question configuration screen
  - Heuristic: Analyzes question/answer text length, number of answers, and difficulty
  - Replaces fixed time limits with adaptive timing (10-90s range)
  - Database: Added `autoQuestionTime` boolean field with migration
  - API: Time calculation integrated in session and game state endpoints
  - Tests: 7 new tests, all 114 tests passing (39 common + 75 API)
  - Use case: Perfect for varied question banks with different complexity levels

- ✅ **Auto-advance on completion** (Feb 20, 2026 — bug-fixed Mar 4, 2026):
  - Quiz progresses when all players submit their answers
  - No waiting for timer to expire when everyone is done
  - API exposes `allPlayersAnswered` flag to host
  - Host shows correct answers for 4s then navigates to leaderboard
  - Combines with automatic pace for fully hands-free quiz experience
  - Use case: Keeps quiz moving efficiently, reduces dead time
  - **Bug fixes (Mar 4, 2026 — commit `ce04b79`)**:
    - Timer restart after early stop: `stopTimer()` left `timeRemaining > 0`; next poll restarted timer (appeared accelerated). Fixed by adding `earlyStop` flag that zeroes `timeRemaining` and blocks subsequent server recalculation in `QuestionDisplayScreen`.
    - Correct answers not revealed: `isTimerActive` was still `true` at render time; zeroing `timeRemaining` first makes `isTimerActive = false` so answer cards turn green immediately.
    - No visual feedback during 4s delay: timer label now shows "✅ All players answered!" and controls area shows spinner with "Showing leaderboard in a moment…".
    - Leaderboard double-schedule / last-question skip: `wasFirstLoad` guard alone was insufficient; added `!this.autoNavigateTimeout` to `LeaderboardScreen` preventing duplicate `handleNextQuestion()` calls.
    - Verified: 60/60 unit tests; 4 API + 10 player-UI + 1 host E2E tests pass; Playwright MCP live run confirmed correct-answer reveal, spinner, and full Q1→leaderboard→Q2→Q3 chain without skips.

- ✅ **Automatic pace feature** (Feb 12, 2026):
  - Optional automatic quiz progression without host interaction
  - "Automatic pace" checkbox in question configuration screen
  - Behavior: Correct answers shown for 4s → Leaderboard shown for 4s → Next question auto-starts
  - Database: Added `automaticPace` boolean field with migration
  - API: Session endpoints updated to support automatic pace
  - Frontend: Auto-advance logic in question and leaderboard screens
  - Manual override: Host can still manually end quiz at any time
  - Use case: Perfect for self-running quizzes at events or classrooms

---

### Phase 7C: Enhanced Leaderboard & Gamification (Est. 2-3 hours)

**Objective**: More engaging score display and achievements.

- [ ] Leaderboard enhancements:
  - Position change indicators (+2, -1, →)
  - Player avatars/colors for identification
  - Top 3 podium animation
  - Highlight player's position if not in top 10
  - Smooth reordering animation
  - Score difference from leader
- [ ] Streak tracking:
  - Track consecutive correct answers per player
  - Display streak count on player screen
  - Bonus points for streaks (e.g., 3+ in a row)
  - Streak broken animation
  - Leaderboard shows current streaks
- [ ] Player statistics:
  - Accuracy percentage (correct/total)
  - Average response time
  - Best question (highest score)
  - Display on final results screen
- [ ] Achievements (optional):
  - "Perfect Score" - All correct
  - "Speed Demon" - Fastest average time
  - "Comeback Kid" - Gained most positions
  - "Consistent" - No wrong answers
  - Display badges on final screen

**Deliverable**: Rich leaderboard with position changes, streaks, and stats.

---

### Phase 7D: Player Reconnection & Persistence (Est. 2-3 hours)

**Objective**: Handle disconnections and allow players to rejoin.

- [ ] Player session tokens:
  - Generate playerToken on join (UUID)
  - Return in join response
  - Store in localStorage
  - Send in Authorization header for player requests
- [ ] Reconnection logic:
  - Check for stored playerToken + sessionId on app load
  - Validate token with `POST /api/sessions/:id/reconnect`
  - If valid: restore player state, resume game
  - If invalid: clear storage, show join screen
- [ ] API support:
  - `POST /api/sessions/:id/reconnect` with playerToken
  - Return current player score, game state
  - Prevent duplicate answers after reconnect
  - Handle reconnect during different game phases
- [ ] UI feedback:
  - "Reconnecting..." message
  - Resume from current question
  - Show missed questions in summary
  - "Connection restored" toast
- [ ] Edge cases:
  - Reconnect during question (allow submit if time remains)
  - Reconnect after question ended (show as missed)
  - Reconnect after quiz ended (show final results)
  - Multiple disconnects handling

**Deliverable**: Players can reload page or lose connection and rejoin seamlessly.

---

### Phase 7E: Game Pause & Resume (Est. 1-2 hours)

**Objective**: Allow hosts to pause mid-game.

- [ ] Pause functionality:
  - "Pause" button in host UI (during question)
  - `POST /api/sessions/:id/pause` endpoint
  - Store pausedAt timestamp
  - Freeze question timer (all clients)
  - Display "Game Paused" overlay
- [ ] Resume functionality:
  - "Resume" button in host UI
  - `POST /api/sessions/:id/resume` endpoint
  - Adjust questionStartedAt to account for pause duration
  - Resume countdown from where it paused
  - Remove overlay, continue gameplay
- [ ] Player experience:
  - Poll detects paused state
  - Show paused overlay with message
  - Disable answer submission while paused
  - Auto-resume when host resumes
- [ ] State management:
  - Add 'paused' state to session
  - Track total pause time for analytics
  - Prevent starting new question while paused
  - Handle pause between questions

**Deliverable**: Hosts can pause for interruptions (questions, breaks) and resume smoothly.

---

### Phase 7F: Question Bank Folder Navigation (Est. 3-4 hours)

**Status**: NOT STARTED

**Objective**: Organize question banks into a hierarchical folder structure so hosts can browse by category/topic before selecting a bank. The `question-banks/` directory becomes a tree instead of a flat bag of files. Soft links (symlinks) are fully supported for placing the same bank in multiple folders.

**Design Decisions**:
- **IDs**: Path-based — the bank ID is the lowercase relative path from `rootDir` to the file, without the `.md` extension, using `/` separators (e.g., `science/physics/electromagnetism`). Existing flat-root banks keep their IDs (e.g., `sample-general-knowledge`). Reserved filenames `bank.md` and `questions.md` at any depth are disallowed because those bare stems collide with the new fixed API routes.
- **API**: `GET /api/question-banks` response shape changes from `{ questionBanks: [] }` to `{ tree: {...} }`. This is a **breaking change**: `host-app/api-client.ts` `getQuestionBanks()` and the corresponding E2E tests must be updated as part of this phase.
- **Symlinks**: Resolved to canonical real path via `realpathSync`. A symlinked `.md` file's ID is the canonical path made relative to `rootDir` (without extension). If the canonical path falls **outside** `rootDir` (e.g., an absolute symlink to another filesystem location), the file is skipped with a warning. If the same canonical file is reached via two different symlinks, it appears in both folder positions in the tree but both entries carry the same `id`. Statistics are naturally shared because the `id` is identical.
- **Folder display name**: stored and returned as the raw directory basename (e.g., `"science"`); no automatic capitalization. Clients render it as-is.
- **UI**: Drill-down breadcrumb — click a folder card to enter, click breadcrumb segments to go back.

---

#### 7F-1: Loader — recursive tree scan (`@quizzquizz/question-bank`)

- [ ] Add new types (export from `index.ts`):
  ```typescript
  interface QuestionBankSummary {
    id: string;        // path-based, e.g. "science/physics/electromagnetism"
    name: string;
    description?: string;
    topics: string[];
    questionCount: number;
  }

  interface QuestionBankFolder {
    name: string;      // directory basename, "" for root
    path: string;      // relative path from root, "" for root
    folders: QuestionBankFolder[];
    banks: QuestionBankSummary[];
  }
  ```
- [ ] Add `loadQuestionBankTree(rootDir: string): QuestionBankFolder`:
  - Recursively traverse `rootDir`
  - For each entry: use `lstatSync` (not `statSync`) so symlinks are detected, then `realpathSync` to get the canonical path
  - If the canonical path is a `.md` file → compute `id` as the canonical path made relative to `rootDir`, without the `.md` extension (e.g., canonical `/…/question-banks/science/physics/electromagnetism.md` → id `science/physics/electromagnetism`). If the canonical path falls outside `rootDir`, skip the entry with a console warning.
  - If the canonical path is a directory → recurse (pass the **logical** entry path as the folder position in the tree, so the logical tree structure is preserved even for directory symlinks). Track visited **canonical** directory real paths in a `Set<string>` to abort circular symlinks before recursing.
  - Deduplication: if the same canonical `.md` real path is encountered more than once while traversing, include it in **all** logical folder positions in the tree (this is intentional — it's why you symlink). The `id` is the same for all occurrences.
  - Sort entries: folders first (alphabetical by basename), then banks (alphabetical by `name` field from metadata)
- [ ] Add `flattenBankTree(root: QuestionBankFolder): QuestionBank[]` utility — depth-first flattening for backward compat. **Must deduplicate by `id`** (use a `Set<string>` of seen IDs) so that symlinked banks appearing in multiple folder positions are included exactly once in the flattened output.
- [ ] Keep `loadQuestionBanks(rootDir: string): QuestionBank[]` as a compatibility shim calling `flattenBankTree(loadQuestionBankTree(rootDir))`
- [ ] Internal `Map<id, QuestionBank>` for O(1) lookup is unchanged; the tree is a separate data structure used only for the browse API

---

#### 7F-2: API — tree endpoint & bank-by-ID routes (`@quizzquizz/api-server`)

- [ ] Update `GET /api/question-banks` response shape:
  ```json
  {
    "tree": {
      "name": "",
      "path": "",
      "folders": [
        {
          "name": "science",
          "path": "science",
          "folders": [
            { "name": "physics", "path": "science/physics", "folders": [], "banks": [
              { "id": "science/physics/electromagnetism", "name": "Electromagnetism", "topics": ["Physics"], "questionCount": 12 }
            ]}
          ],
          "banks": []
        }
      ],
      "banks": [
        { "id": "sample-general-knowledge", "name": "General Knowledge", "topics": ["General"], "questionCount": 20 }
      ]
    }
  }
  ```
  Folder `name` is the raw directory basename with no transformation. Clients are responsible for any display formatting.
- [ ] **Breaking change migration**: update `host-app/src/api-client.ts` — replace `getQuestionBanks(): Promise<QuestionBankSummary[]>` with `getQuestionBankTree(): Promise<QuestionBankFolder>` that reads the `tree` key; update all call sites (session creation screen, saved-quiz screen) and any E2E tests that assert `{ questionBanks: [] }` in the response.
- [ ] Bank detail routes — because bank IDs contain `/`, keep existing suffixed routes (`/questions`, `/stats`) but shift to a query-param pattern for the bank ID to avoid routing collisions:
  - `GET /api/question-banks/bank?id=<bank-id>` — single bank detail (replaces `GET /api/question-banks/:id`)
  - `GET /api/question-banks/questions?bankId=<bank-id>&...` — questions with filtering (replaces `GET /api/question-banks/:id/questions`)
  - `GET /api/question-banks/stats?bankId=<bank-id>` — stats (replaces `GET /api/question-banks/:id/stats`)
  - Keep the old `/:id` slug routes as fallback aliases; they remain safe for flat/no-slash IDs. **Note**: the fixed paths `/bank`, `/questions`, `/stats`, and `/reload` become reserved — a physical file named `bank.md`, `questions.md`, `stats.md`, or `reload.md` at the root level (or reached via the legacy `/:id` route) would be shadowed. Reserved stems are documented and disallowed by the loader (log a warning and skip).
- [ ] `state.ts` — add `bankTree` state alongside the existing `questionBanks` map. Because ESM live-binding exports are read-only to importers, use a **mutable wrapper** or **exported setter** pattern:
  ```typescript
  // state.ts
  let _bankTree: QuestionBankFolder = { name: '', path: '', folders: [], banks: [] };
  export const getBankTree = (): QuestionBankFolder => _bankTree;
  export const setBankTree = (tree: QuestionBankFolder): void => { _bankTree = tree; };
  ```
  Do **not** use `export let bankTree` — importers cannot reassign it on reload.
- [ ] `index.ts` initialization — call `loadQuestionBankTree`, pass result to `setBankTree(...)`, then call `flattenBankTree` and populate `questionBanks` map
- [ ] `POST /api/question-banks/reload` — call `setBankTree(...)` to replace the tree **and** repopulate `questionBanks` map

---

#### 7F-3: Host UI — drill-down breadcrumb browser (`@quizzquizz/host-app`)

- [ ] Update `api-client.ts`:
  - `getQuestionBankTree(): Promise<QuestionBankFolder>` — fetches tree from `GET /api/question-banks`
  - `getQuestionBank(id: string): Promise<QuestionBank>` — fetches `GET /api/question-banks/bank?id=<id>`
  - `getQuestionBankQuestions(bankId: string, filters): Promise<...>` — fetches questions via new query-param route
- [ ] New `<qz-bank-browser>` web component (replaces flat grid in session creation screen):
  - Internal state: `currentPath: string[]` (path segments to current folder)
  - On mount: fetch tree, store root in component, render current level
  - Render at current level:
    - **Breadcrumb bar**: `All Banks > Science > Physics` — each segment is a clickable link
    - **Folder cards** (📁 icon): folder name, recursive bank count (e.g., "8 banks")
    - **Bank cards** (📋 icon): name, description, topics chips, question count
  - Click folder → push segment to `currentPath`, re-render
  - Click breadcrumb segment → slice `currentPath` to that depth, re-render
  - Click bank → emit `bank-selected` event with bank ID, parent `CreateSessionScreen` handles navigation to preview
  - Edge case: root with no subfolders → render flat grid (identical to previous behavior)
  - Edge case: empty folder → show "No question banks in this folder" message
- [ ] `styles.css` — add folder card styles (distinct from bank cards, folder icon, subtle background)
- [ ] Update `CreateSessionScreen` (or wherever the bank list currently lives) to use `<qz-bank-browser>` instead of the flat grid

---

#### 7F-4: Stats & database compatibility

- [ ] No schema migration needed. Bank IDs in `saved_quizzes`, `hosted_sessions`, `UserQuestionStat`, `QuestionGlobalStat` are plain strings. New banks just use path-based IDs; existing records keep their flat IDs.
- [ ] `reload-question-banks.sh` — update example output comments to show folder structure
- [x] `QUESTION-BANK-FORMAT.md` — "Directory Organization" section already added (Mar 4, 2026); covers folder IDs, naming, symlinks, and host UI navigation

---

#### 7F-5: Tests

- [ ] `@quizzquizz/question-bank` unit tests:
  - `loadQuestionBankTree` returns correct nested structure for multi-level fixture dirs
  - Symlinked `.md` in two dirs → same `id`, appears in both folder positions in tree
  - Symlink pointing outside `rootDir` → skipped with warning, rest of tree unaffected
  - Circular symlink directory → detected (canonical path already visited), gracefully skipped
  - Empty subdirectory → included as a `QuestionBankFolder` with empty `banks` and `folders`
  - `flattenBankTree` deduplicates: a bank reachable via two symlinks appears exactly once in the output array
  - `flattenBankTree` depth-first order matches expectation
- [ ] `@quizzquizz/api-server` unit tests:
  - `GET /api/question-banks` returns `{ tree: {...} }` with correct shape (not the old `{ questionBanks: [] }`)
  - `GET /api/question-banks/bank?id=<path-id>` returns correct bank
  - `GET /api/question-banks/questions?bankId=<path-id>` returns questions with filtering
  - `POST /api/question-banks/reload` rebuilds both tree (`getBankTree()` returns new structure) and map
- [ ] `@quizzquizz/host-app` unit tests:
  - `getQuestionBankTree()` parses `{ tree: {...} }` response correctly
  - `BankBrowser` renders folder cards and bank cards for a given tree level
  - Breadcrumb updates correctly on folder navigation and segment click

**Dependencies**: Phase 7A complete (question preview screen is the destination after bank selection).

**Deliverable**: `question-banks/` can be organized into nested subdirectories. Hosts see a drill-down folder browser when creating a session and can navigate through any depth of nesting. Symlinks let the same bank appear in multiple categories without duplicating the file or splitting its statistics.

---

## Phase 8: Deployment & Documentation

**Goal**: Make the project deployable and production-ready.

**Dependencies**: Phase 7 complete (feature-complete application).

### Phase 8A: Docker Configuration ✅ COMPLETE (Feb 12, 2026)

**Status**: COMPLETE (3 hours actual development time)

**Objective**: Containerize the application for easy deployment.

**Completed**:
- [x] API server Dockerfile:
  - ✅ Multi-stage build (builder + runtime)
  - ✅ Node.js 22-alpine LTS base image
  - ✅ Copy monorepo structure (workspaces)
  - ✅ Build TypeScript packages
  - ✅ Expose port 3000
  - ✅ Health check configuration (30s interval)
  - ✅ Non-root user for security (nodejs:nodejs)
  - ✅ Optimized layer caching
- [x] Frontend apps build:
  - ✅ Build host-app and player-app with Vite
  - ✅ Output to `dist/` folders
  - ✅ Optimize for production (minify, tree-shake)
  - ✅ Copy assets and static files
- [x] Serve frontends from API:
  - ✅ Static file serving from Hono with `@hono/node-server/serve-static`
  - ✅ `GET /` → serve player-app index.html
  - ✅ `GET /host` → serve host-app index.html
  - ✅ `GET /assets/*` → serve static assets
  - ✅ Conditional serving (only in production mode)
  - ✅ Proper MIME types and fallback routing
- [x] Docker Compose:
  - ✅ Multi-service deployment: API server + Caddy reverse proxy
  - ✅ Caddy: Official caddy:2-alpine image with Caddyfile
  - ✅ API Server: Custom quizzquizz:latest image
  - ✅ Named volume for SQLite database (persistence)
  - ✅ Restart policy (unless-stopped) for both services
  - ✅ Custom network (quizzquizz-network) for service communication
  - ✅ Single command deployment: `docker compose up -d`
- [x] Build scripts:
  - ✅ `package.json` scripts: `docker:build`, `docker:build:version`
  - ✅ `docker:up`, `docker:down`, `docker:logs`, `docker:restart`, `docker:clean`
  - ✅ `.dockerignore` for optimized build context

**Deliverable**: ✅ `docker compose up -d` starts entire application. Tested with fresh container.

**Implementation Notes** (Feb 12, 2026):
- Multi-stage build separates build dependencies from runtime
- Caddy reverse proxy added as separate container for clean architecture
  - Single entry point on port 3000 (host) → port 80 (Caddy container)
  - Routes `/api/*` to API server on internal network
  - Routes `/host*` to host app (served from API server)
  - Routes `/` to player app (served from API server)
  - Compression (gzip) enabled for better performance
  - Access logging to stdout for monitoring
- API server runs internally on port 3000, not exposed to host
- ESM compatibility: Fixed 10+ files to use `.js` extensions for Node.js 22 ESM modules
- Prisma setup: Migrations run automatically on application startup
- Database migrations: Runtime execution for zero-configuration setup
- Static serving: Production mode serves both frontend apps from API server
- Verified working: All endpoints tested through Caddy
- Image size: ~450MB (API server, optimized with alpine base)
- Caddy image: ~50MB (official caddy:2-alpine)
- Startup time: ~3-5 seconds (including database migrations and both containers)
- Sample question bank: Bundled in image
- Architecture: Client → Caddy (port 3000) → API Server (internal, serving API + static files)

**Files Created**:
- `Dockerfile` - Multi-stage build configuration
- `docker-compose.yml` - Multi-service orchestration
- `Caddyfile` - Reverse proxy configuration
- `.dockerignore` - Build context optimization

---

### Phase 8B: Environment Configuration (Est. 1-2 hours)

**Objective**: Flexible configuration for different environments.

- [ ] Environment variables:
  - NODE_ENV, PORT, DATABASE_URL, QUESTION_BANKS_PATH
  - SESSION_EXPIRY_HOURS, CORS_ORIGIN, LOG_LEVEL, RATE_LIMIT_MAX_REQUESTS
- [ ] .env file support:
  - Use `dotenv` package
  - Load .env on server start
  - Validate required variables
  - Provide sensible defaults
  - .env.example with documentation
- [ ] Configuration validation:
  - Zod schema for env vars
  - Fail fast on invalid config
  - Clear error messages
  - Type-safe config object
- [ ] Development vs Production:
  - Dev: CORS open, verbose logging, hot reload
  - Prod: CORS restricted, error logging only, optimized build
  - Different SQLite paths

**Deliverable**: Configurable deployment supporting different environments.

---

### Phase 8C: Build Optimization & Production Hardening (Est. 2-3 hours)

**Objective**: Optimize performance and security for production.

- [ ] Frontend optimization:
  - Code splitting (route-based lazy loading)
  - Asset compression (gzip/brotli)
  - Image optimization (if any)
  - CSS minification
  - Tree-shaking unused code
  - Bundle size analysis
- [ ] Backend optimization:
  - Database connection pooling
  - Query optimization (indexes on sessions.pin, players.sessionId)
  - Response compression middleware
  - ETag generation for state endpoint
  - Static asset caching (max-age headers)
- [ ] Security hardening:
  - Helmet.js for security headers
  - Rate limiting (per-IP)
  - Input sanitization (prevent XSS)
  - SQL injection prevention (already using ORM)
  - CORS configuration (whitelist specific origins)
  - HTTPS enforcement (redirect HTTP to HTTPS)
  - Secure session tokens (cryptographically random)
- [ ] Health & monitoring:
  - `GET /health` endpoint (returns 200 OK + version)
  - `GET /ready` endpoint (checks DB connection)
  - Basic metrics (sessions created, active players)
  - Graceful shutdown (clean up on SIGTERM)
  - Database backup script

**Deliverable**: Production-ready, secure, optimized application.

---

### Phase 8D: Documentation & Guides (Est. 2-3 hours)

**Objective**: Comprehensive documentation for users and developers.

- [ ] README.md (root):
  - Project overview with screenshot/demo GIF
  - Features list
  - Quick start (docker-compose up)
  - Development setup instructions
  - npm scripts reference
  - Tech stack overview
  - Contributing guidelines
  - License (MIT)
- [ ] Question Bank Format Guide:
  - Markdown syntax documentation
  - Example question with all features
  - Best practices
  - Validation rules
  - Topic and tag conventions
  - CLI tool usage
- [ ] API Documentation:
  - OpenAPI/Swagger spec (optional)
  - Manual markdown docs with examples
  - All endpoints with request/response
  - Authentication requirements
  - Error codes and meanings
  - Rate limiting rules
- [ ] Deployment Guide:
  - Docker deployment (recommended)
  - Manual deployment (Node.js)
  - Reverse proxy setup (nginx/caddy)
  - SSL certificate configuration
  - Environment variable reference
  - Backup and restore procedures
  - Scaling considerations
- [ ] User Guide:
  - Host instructions (create quiz, manage game)
  - Player instructions (join, play)
  - Troubleshooting common issues
  - FAQ section
  - Best practices for classroom use
- [ ] Developer Guide:
  - Monorepo structure explanation
  - Adding new endpoints
  - Creating custom question types
  - Testing strategy
  - Code style guidelines
  - TypeScript patterns used

**Deliverable**: Full documentation ready for open source release.

---

### Phase 8E: Release Preparation (Est. 1-2 hours)

**Objective**: Prepare for v1.0.0 release.

- [ ] Version management:
  - Semantic versioning (1.0.0)
  - Update all package.json versions
  - Git tag for release
  - CHANGELOG.md v1.0.0 section
- [ ] Testing checklist:
  - All unit tests passing
  - All E2E tests passing
  - Manual test on production build
  - Test on different devices/browsers
  - Load testing (30+ simultaneous players)
- [ ] Package metadata:
  - package.json descriptions
  - Keywords for discoverability
  - Repository URLs
  - Author and contributors
  - License file
- [ ] CI/CD (optional):
  - GitHub Actions for tests
  - Automated Docker builds
  - Dependabot for security updates
- [ ] Demo deployment:
  - Deploy to free tier (fly.io, Railway, Render)
  - Seed with sample question banks
  - Create demo video/screenshots
  - Share demo URL in README

**Deliverable**: QuizzQuizz v1.0.0 publicly released and deployable.
