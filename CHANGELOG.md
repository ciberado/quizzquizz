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

### Changed
- Updated package manager from pnpm to npm workspaces
- Updated all workspace dependency references to npm format

### Fixed
- Removed accidentally committed .pnpm-store directory (~19k cache files) from git tracking
- Added .pnpm-store/ to .gitignore to prevent future commits
- Purged .pnpm-store/ from entire git history using git filter-branch to reclaim disk space
