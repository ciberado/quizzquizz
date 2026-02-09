# Changelog

All notable changes to this project will be documented in this file, organized by date.

## 2026-02-09

### Added (Phase 4B - Join & Lobby Screens)
- Join screen Web Component with PIN input validation
- Nickname screen Web Component with API integration
- Lobby screen Web Component with real-time polling
- Complete join flow: PIN → Nickname → Lobby → Game
- Input validation (numeric PIN, nickname length limits)
- Error handling for all API scenarios (404, 409, 403)
- Network error detection and user-friendly messages
- Automatic game start detection in lobby (polling every 2s)
- Player count display in lobby
- Leave quiz functionality with state cleanup
- Vitest test suite with 8 unit tests (all passing)
- Manual test script with comprehensive test scenarios
- CSS animations for lobby status indicator

### Technical (Phase 4B)
- Web Components: `JoinScreen`, `NicknameScreen`, `LobbyScreen`
- API integration using typed client from Phase 4A
- State management with localStorage persistence
- Polling mechanism with interval cleanup on unmount
- Query parameters for PIN passing between screens
- Component lifecycle hooks (onMount, onUnmount)
- Happy-DOM test environment for component testing
- Test coverage: Join screen validation, state management, router navigation

### Fixed
- **Node.js v24 LTS compatibility**: Upgraded better-sqlite3 from v9.6.0 to v12.6.2
  - Resolved MODULE_VERSION mismatch (compiled for Node v22, now compatible with v24)
  - API server now starts successfully with Node v24.13.0
  - All backend tests passing (46/47)

### Added (Phase 4A - Player App Foundation)
- Base Web Component class (`BaseComponent`) with lifecycle hooks and helper methods
- Hash-based router for SPA navigation with parameter support
- State management system with localStorage persistence for player reconnection
- Typed API client with error handling for all player endpoints
- Mobile-first CSS styling with touch-friendly design
- Player app shell with placeholder screens for all routes
- Test script for Phase 4A automated verification

### Technical (Phase 4A)
- Web Components architecture without frameworks (vanilla TypeScript)
- Router supports parameterized routes (e.g., `/lobby/:sessionId`)
- State management uses pub/sub pattern for reactivity
- API client uses typed imports from `@quizzquizz/common`
- CSS variables for theming, dark mode support
- Vite dev server running on port 3002
- All routes defined: `/join`, `/nickname`, `/lobby/:id`, `/play/:id`, `/results/:id`

### Added (Phase 3)
- Game routes module (`src/routes/game.ts`) for handling player polling and answer submission
- `GET /api/sessions/:id/state` endpoint - Retrieve current game state, active question, and player score
- `POST /api/sessions/:id/answer` endpoint - Players submit answers with time-based scoring
- `POST /api/sessions/:id/start` endpoint - Host starts quiz, transitions from lobby to playing
- `POST /api/sessions/:id/next` endpoint - Host advances to next question or ends quiz
- `POST /api/sessions/:id/end` endpoint - Host ends quiz prematurely
- `GET /api/sessions/:id/leaderboard` endpoint - Get ranked players by score
- 47 comprehensive unit tests for game flow (10 game routes + 37 session/player enhancements)
- 2 comprehensive E2E tests for complete game flow (lobby → playing → finished)
- Answer validation preventing duplicate submissions for same question
- Time-based score calculation using Kahoot-style formula
- Server-side question timing with `questionStartedAt` tracking
- Game flow state machine: lobby → playing → finished

### Changed
- Updated `src/index.ts` to register game routes
- Extended sessions routes with game control endpoints
- Updated test setup in game.test.ts and players.test.ts with question bank fixtures

### Documentation
- **MAJOR UPDATE**: Expanded `vibe/PLAN.md` with comprehensive implementation details:
  - Phase 4 (Player App) broken into 4 sub-phases (4A-4D) with ~8-11 hour estimate
  - Phase 5 (Host App) broken into 4 sub-phases (5A-5D) with ~6-9 hour estimate
  - Phase 6 (Polish) broken into 5 sub-phases (6A-6E) with ~6-8 hour estimate
  - Phase 7 (Enhanced Features) broken into 5 sub-phases (7A-7E) with detailed task lists
  - Phase 8 (Deployment) broken into 5 sub-phases (8A-8E) covering Docker, docs, optimization
  - Added detailed future phases (9-15): User accounts, question types, teams, analytics, marketplace, mobile apps, enterprise
  - Added "How to Use This Plan" section with vibecoding guidelines
  - Added testing checklist, code review checklist, progress tracking guide
  - Added Quick Reference section with commands, ports, and file structure
  - Progress Summary now shows MVP completion target (~50-60 hours total)
  - Clearer distinction between completed, ready, in-progress, and future phases

### Technical
- Used Hono for routing with Zod validation
- Drizzle ORM for database queries across all endpoints
- Proper error handling with meaningful HTTP status codes (400, 401, 403, 404)
- All answers stored in `player_answers` table with score calculation
- Comprehensive E2E testing: complete game simulation with 2 players, scoring verification, edge case validation

## 2026-02-06

### Added
- Initial project setup for QuizzQuizz
- Project documentation (PROJECT.md and PLAN.md)
- Git repository initialization with conventional commits
- Basic .gitignore for Node.js/TypeScript projects
- AI agent instructions (.github/copilot-instructions.md) with TypeScript conventions and testing requirements
- Sample question bank (question-banks/sample-general-knowledge.md) with 10 diverse questions
- Monorepo structure with npm workspaces
- TypeScript configuration with strict mode and project references
- Five packages: common, question-bank, api-server, host-app, player-app
- ESLint and Prettier configuration
- Development scripts for building, testing, and linting
- Vite configuration for host-app (port 3001) and player-app (port 3002)

### Changed
- Updated testing instructions to use `--run` flag to avoid interactive watch mode

### Added (Phase 1)
- Question bank markdown parser with full parsing logic for questions, answers, metadata
- Question filtering by difficulty, topics, tags, and limit
- Random question selection utility
- 16 comprehensive unit tests for question-bank package
- CLI demo tool to load and display question banks
- TypeScript strict mode compliance with proper null checks

### Added (Phase 2)
- Hono REST API server with CORS and logging middleware
- SQLite database with Drizzle ORM (schema: sessions, players, player_answers)
- Session management endpoints (POST /api/sessions, GET /api/sessions/:id, DELETE /api/sessions/:id)
- Player management endpoints (POST /api/sessions/join, GET /api/sessions/:id/players)
- Question bank endpoints (GET /api/question-banks, GET /api/question-banks/:id)
- Automatic question bank loading on server startup
- Host token authentication for session operations
- PIN-based session joining with duplicate nickname prevention
- REST client test file (test.http) for manual API testing
- 26 comprehensive unit tests for api-server routes (all passing)

### Changed
- Updated package manager from pnpm to npm workspaces
- Updated all workspace dependency references to npm format

### Fixed
- Removed accidentally committed .pnpm-store directory (~19k cache files) from git tracking
- Added .pnpm-store/ to .gitignore to prevent future commits
- Purged .pnpm-store/ from entire git history using git filter-branch to reclaim disk space

## 2026-02-09

### Fixed
- Installed full Python 3 standard library (python3 and python3-dev packages)
- Switched from Node.js v24.13.0 to v22.22.0 LTS for better-sqlite3 compatibility
- Successfully built better-sqlite3 native module

### Added
- 26 unit tests for api-server routes (sessions, players, question-banks)
- Vitest configuration for api-server package
- Playwright E2E testing framework with automatic server management
- 2 comprehensive E2E test suites (15 test scenarios total)
  - Complete quiz session flow (PIN join, players, auth, cleanup)
  - Multiple concurrent sessions with player isolation
- @hono/node-server adapter to properly serve HTTP requests
- test:e2e script for running E2E tests
