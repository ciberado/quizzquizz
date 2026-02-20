# Phases 0-3: Foundation & Core API

## Phase 0: Project Foundation ✅

**Status**: COMPLETE (Feb 6, 2026)

**Goal**: Set up the monorepo structure and development environment.

### Tasks
- [x] Initialize npm workspace (changed from pnpm)
- [x] Create base `package.json` with workspace configuration
- [x] Set up `tsconfig.base.json` with shared TypeScript settings
- [x] Create package directories with initial `package.json` files:
  - `packages/common`
  - `packages/question-bank`
  - `packages/api-server`
  - `packages/host-app`
  - `packages/player-app`
- [x] Configure ESLint and Prettier
- [x] Add basic scripts for building and running
- [x] Create `.gitignore`

### Deliverable
Empty but properly configured monorepo where packages can import from each other.

**Notes**: Used npm workspaces instead of pnpm. Added Vite configuration for frontend apps (ports 3001, 3002).

---

## Phase 1: Common Package & Question Bank Parser ✅

**Status**: COMPLETE (Feb 6, 2026)

**Goal**: Define shared types and parse markdown question banks.

### Tasks
- [x] Define core types in `@quizzquizz/common`:
  - Question, Answer, QuestionBank
  - Session, Player, PlayerAnswer
  - API request/response types
  - Game state types
- [x] Add Zod schemas for validation
- [x] Implement utility functions:
  - PIN generation (6 digits, no ambiguous characters)
  - Score calculation (Kahoot-style)
  - ID generation
- [x] Create `@quizzquizz/question-bank`:
  - Markdown parser for question format
  - Question bank loader (read directory of .md files)
  - Validation of parsed questions
  - Question filtering by difficulty/topics/tags
- [x] Create sample question banks in `question-banks/` directory

### Deliverable
CLI command or test that parses a markdown file and outputs structured questions.

**Test Coverage**: 
- 25 unit tests for common utilities (PIN generation, scoring, validation)
- 16 unit tests for question bank parser
- CLI demo tool included

**Notes**: Parser handles multiple correct answers, optional time limits per question, and strict TypeScript compliance.

---

## Phase 2: API Server - Core Session Management ✅

**Status**: COMPLETE (Feb 9, 2026)

**Goal**: Basic REST API for creating and managing quiz sessions.

### Tasks
- [x] Set up Hono server in `@quizzquizz/api-server`
- [x] Configure SQLite with Drizzle ORM
- [x] Create database schema:
  - sessions table
  - players table
  - player_answers table
- [x] Implement session endpoints:
  - `POST /api/sessions` - Create session
  - `GET /api/sessions/:id` - Get session (host view)
  - `DELETE /api/sessions/:id` - Delete session
- [x] Implement player endpoints:
  - `POST /api/sessions/join` - Join with PIN
  - `GET /api/sessions/:id/players` - List players in session
- [x] Add question bank loading on server start
- [x] Implement `GET /api/question-banks` - List available banks

### Deliverable
API server that can create sessions, have players join via PIN, and list question banks. Testable with curl or REST client.

**Test Coverage**:
- 26 unit tests for API routes (sessions, players, question banks)
- 15 E2E tests with Playwright (full session flow, multi-session isolation)
- REST client test file (test.http) for manual testing

**Infrastructure**:
- better-sqlite3 successfully built with Node.js v22.22.0 LTS
- @hono/node-server adapter for HTTP serving
- In-memory SQLite for tests, file-based for production
- Host token authentication, PIN-based player joining
- Cascade deletion of players when session deleted

**Notes**: Required Python 3 dev tools for native module compilation. Playwright automatically manages server lifecycle for E2E tests.

---

## Phase 3: API Server - Game Flow ✅

**Status**: COMPLETE (Feb 9, 2026)

**Goal**: Complete game loop with questions, answers, and scoring.

### Tasks
- [x] Add game state management:
  - Session states: lobby → playing → finished
  - Current question tracking
  - Question timing
- [x] Implement game control endpoints:
  - `POST /api/sessions/:id/start` - Start quiz
  - `POST /api/sessions/:id/next` - Next question
  - `POST /api/sessions/:id/end` - End quiz
- [x] Implement player game endpoints:
  - `GET /api/sessions/:id/state` - Poll current state
  - `POST /api/sessions/:id/answer` - Submit answer
- [x] Implement scoring:
  - Time-based score calculation
  - Multiple correct answer handling
  - Store scores in database
- [x] Implement leaderboard:
  - `GET /api/sessions/:id/leaderboard` - Ranked players

### Deliverable
Full game loop playable via API calls. Can simulate a complete quiz with curl/REST client.

**Test Coverage**: 47 unit tests (10 game routes + 21 session control + 10 player routes + 6 question bank)
+ 2 comprehensive E2E scenarios:

**Unit Tests** (10 game routes):
- GET /api/sessions/:id/state (5 tests)
- POST /api/sessions/:id/answer (5 tests)

**Unit Tests** (Session control - 8 new tests):
- POST /api/sessions/:id/start (2 tests)
- POST /api/sessions/:id/next (2 tests)  
- POST /api/sessions/:id/end (2 tests)
- GET /api/sessions/:id/leaderboard (3 tests)
- Player route enhancements (10 tests)

**E2E Tests** (2 comprehensive scenarios):
- **Complete game flow** (lobby → playing → finished): Full quiz simulation with 2 players, answer submission, scoring, leaderboard updates, question progression
- **Game flow edge cases and validation**: Tests unauthorized access, duplicate operations, premature actions

**Key Implementation Details**:
- Game routes created in `src/routes/game.ts` handling player polling and answer submission
- Session routes extended with game control endpoints (start, next, end)
- Leaderboard endpoint for fetching ranked players
- Scoring implemented with time-based multiplier (Kahoot-style formula)
- Answer validation checks for correctness and prevents duplicate submissions
- Question timing tracked from server-side `questionStartedAt` timestamp
- All routes tested with 47 comprehensive unit tests
