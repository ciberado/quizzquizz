# Changelog

All notable changes to this project will be documented in this file, organized by date.

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
