# QuizzQuizz - Implementation Plan

## Overview

This plan outlines a phased approach to building QuizzQuizz using vibecoding methodology. Each phase delivers a working increment that can be tested and demonstrated. Phases are designed to be completable in focused coding sessions.

## Progress Summary

**Current Status**: Phase 3 In Progress (Feb 9, 2026)

- ✅ **Phase 0**: Project Foundation - Monorepo setup with npm workspaces
- ✅ **Phase 1**: Common Package & Question Bank Parser - 41 tests passing
- ✅ **Phase 2**: API Server Core - 41 tests passing (26 unit + 15 E2E)
- 🔄 **Phase 3**: API Server Game Flow - 47 unit tests passing (in progress)
- ⏳ **Phase 4**: Player App - Pending
- ⏳ **Phase 5**: Host App - Pending
- ⏳ **Phase 6+**: Polish, Enhanced Features, Deployment

**Test Coverage**: 109+ tests total
- Unit: 98 tests (common: 25, question-bank: 16, api-server: 47 + 10 new game tests)
- E2E: 15 scenarios (Playwright with auto server management)

---

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
- GET /api/sessions/:id/state (5 tests)
- POST /api/sessions/:id/answer (5 tests)
- POST /api/sessions/:id/start (2 tests)
- POST /api/sessions/:id/next (2 tests)
- POST /api/sessions/:id/end (2 tests)
- GET /api/sessions/:id/leaderboard (3 tests)
- Player route enhancements (10 tests)

**Key Implementation Details**:
- Game routes created in `src/routes/game.ts` handling player polling and answer submission
- Session routes extended with game control endpoints (start, next, end)
- Leaderboard endpoint for fetching ranked players
- Scoring implemented with time-based multiplier (Kahoot-style formula)
- Answer validation checks for correctness and prevents duplicate submissions
- Question timing tracked from server-side `questionStartedAt` timestamp
- All routes tested with 47 comprehensive unit tests

---

## Phase 4: Player App - Basic UI

**Goal**: Web interface for players to join and play.

### Tasks
- [ ] Set up Vite project in `@quizzquizz/player-app`
- [ ] Create Web Components architecture:
  - Base component class with common utilities
  - Simple router (hash-based)
  - State management (pub/sub or signals)
- [ ] Implement screens:
  - Join screen (PIN entry)
  - Nickname screen
  - Lobby/waiting screen
  - Question screen (with countdown timer)
  - Answer submitted/waiting screen
  - Results screen (personal score + ranking)
  - Final results screen
- [ ] Implement API client with polling
- [ ] Basic styling (mobile-first, large touch targets)

### Deliverable
Players can join a quiz on their phones and play through a full game.

---

## Phase 5: Host App - Basic UI

**Goal**: Web interface for hosts to control quizzes.

### Tasks
- [ ] Set up Vite project in `@quizzquizz/host-app`
- [ ] Reuse Web Components architecture from player-app
- [ ] Implement screens:
  - Create session screen (select question bank)
  - Lobby screen (show PIN, list joined players)
  - Question display screen (projector view)
  - Answer reveal screen (show correct answer, stats)
  - Leaderboard screen (between questions)
  - Final results screen
- [ ] Implement host controls:
  - Start quiz button
  - Next question button
  - End quiz button
- [ ] Large, projector-friendly typography and layout

### Deliverable
Host can create a session, display it on a projector, and control the game flow.

---

## Phase 6: Polish & Integration

**Goal**: Smooth out the experience and handle edge cases.

### Tasks
- [ ] Error handling:
  - Network errors with retry
  - Session not found
  - Game already started
  - Duplicate nicknames
- [ ] Loading states and transitions
- [ ] Improve polling efficiency:
  - ETag/version-based caching
  - Adaptive polling intervals
- [ ] Visual feedback:
  - Answer selection confirmation
  - Countdown urgency (color changes)
  - Score animations
- [ ] Sound effects (optional, toggleable)
- [ ] Session cleanup (expire old sessions)
- [ ] Rate limiting on API

### Deliverable
Production-quality UX with proper error handling and smooth gameplay.

---

## Phase 7: Enhanced Features

**Goal**: Add features that improve usability.

### Tasks
- [ ] Question bank management:
  - `GET /api/question-banks/:id/questions` - Preview questions
  - Filter questions when creating session
  - Random vs sequential question order
- [ ] Game configuration options:
  - Custom time limits
  - Number of questions
  - Difficulty filter
  - Topic filter
- [ ] Improved leaderboard:
  - Position changes (+2, -1)
  - Streak bonuses
  - Podium animation for top 3
- [ ] Player reconnection (rejoin with same nickname)
- [ ] Pause/resume game

### Deliverable
Feature-complete quiz platform ready for real use.

---

## Phase 8: Deployment & Documentation

**Goal**: Make the project deployable and documented.

### Tasks
- [ ] Docker configuration:
  - Dockerfile for API server
  - Docker Compose for full stack
- [ ] Environment configuration:
  - `.env` support
  - Production vs development modes
- [ ] Build optimization:
  - Frontend bundling and minification
  - Static file serving from API server
- [ ] Documentation:
  - README with setup instructions
  - Question bank format guide
  - API documentation
  - Deployment guide
- [ ] Health check endpoint
- [ ] Logging configuration

### Deliverable
One-command deployment with comprehensive documentation.

---

## Future Phases (Post-MVP)

### Phase 9: User Accounts
- Authentication system
- Saved quizzes and history
- Statistics dashboard

### Phase 10: Additional Question Types
- True/false questions
- Open-ended questions
- Ordering questions
- Image-based questions

### Phase 11: Advanced Features
- Team mode
- Tournament brackets
- Custom themes
- Public question bank sharing

---

## Vibecoding Guidelines

### Session Structure
1. **Start**: Review where you left off, pick a specific task
2. **Focus**: Complete one task fully before moving to the next
3. **Test**: Verify each piece works before proceeding
4. **Commit**: Small, focused commits after each working increment

### Testing Strategy
- Manual testing with multiple browser windows (host + players)
- Console logging for debugging
- REST client (Postman, Insomnia, or VS Code extension) for API testing
- Unit tests for critical logic (scoring, parsing) - optional but helpful

### When Stuck
- Simplify: Can you make a simpler version work first?
- Isolate: Test the problematic piece in isolation
- Log: Add console.log to trace execution
- Reference: Check the PROJECT.md for intended design

### Code Quality Balance
- Prioritize working code over perfect code
- Refactor when patterns emerge, not preemptively
- Comments for "why", code should explain "what"
- Keep components small and focused
