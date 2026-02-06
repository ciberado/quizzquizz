# QuizzQuizz - AI Agent Instructions

## Project Overview

QuizzQuizz is a **Kahoot-inspired real-time quiz platform** using a **simplicity-first** approach: REST APIs with polling (no WebSockets), vanilla TypeScript with Web Components (no React/Vue), and SQLite for persistence.

**Read the vibe docs first**: [`vibe/PROJECT.md`](../vibe/PROJECT.md) for architecture, [`vibe/PLAN.md`](../vibe/PLAN.md) for implementation phases.

## Architecture: Monorepo Structure

```
quizzquizz/
├── packages/
│   ├── common/           # Shared types, Zod schemas, utilities (scoring, PIN generation)
│   ├── question-bank/    # Markdown parser for question files
│   ├── api-server/       # REST API (Hono/Express + SQLite + Drizzle ORM)
│   ├── host-app/         # Host UI (Web Components + Vite)
│   └── player-app/       # Player UI (Web Components + Vite)
├── question-banks/       # Sample .md files with quiz questions
└── vibe/                 # Project documentation
```

**Package manager**: npm with workspaces  
**TypeScript**: Project references enabled (build dependencies matter!)

## TypeScript Conventions

- **Strict mode**: Always enabled (`strict: true` in tsconfig)
- **No implicit any**: Explicit typing required
- **Prefer interfaces** for public API contracts, types for internal structures
- **Named exports**: No default exports (easier refactoring)
- **Async/await**: Use over raw promises
- **Zod-first validation**: Define Zod schema, infer TypeScript type from it
  ```typescript
  // Good: Single source of truth
  const SessionSchema = z.object({ id: z.string().uuid(), pin: z.string() });
  type Session = z.infer<typeof SessionSchema>;
  ```

## Git & Commit Conventions

**MANDATORY**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**REQUIRED**: Update `CHANGELOG.md` with **every commit**:
- Add entry under `## [Unreleased]` section
- Use appropriate subsection: `### Added`, `### Changed`, `### Fixed`, `### Removed`
- Include brief description matching commit message

Example workflow:
```bash
# Make changes
# Update CHANGELOG.md
git add .
git commit -m "feat(common): add PIN generation utility"
```

## Critical Design Decisions

### 1. Polling Over WebSockets
- Players poll `GET /api/sessions/:id/state` every 1-2s for game state
- Use ETags or version numbers to minimize data transfer
- **Why**: Simpler deployment, no connection management, easier debugging

### 2. Web Components Without Frameworks
- Use vanilla TypeScript with custom elements (`class extends HTMLElement`)
- Simple pub/sub or signals for state management
- Hash-based routing
- **Why**: No build complexity, no framework lock-in, educational value

### 3. Question Banks in Markdown
- Questions stored as `.md` files in `question-banks/`
- Format: Question ID, text, answers (checkbox `[x]` = correct), difficulty, topics, tags
- **Example**: See `vibe/PROJECT.md` "Question Bank Markdown Format" section
- Parsed by `@quizzquizz/question-bank` package

## Development Workflows

### Initial Setup (Phase 0)
```bash
# Initialize npm workspace
npm init
# Create packages with TypeScript + references
# Configure shared tsconfig.base.json, ESLint, Prettier
```

### Working with Monorepo
```bash
# Install dependencies for all packages
npm install

# Run from workspace root
npm run dev --workspace=@quizzquizz/api-server
npm run dev --workspace=@quizzquizz/player-app

# Build with TypeScript project references
npm run build --workspaces
```

### Testing Strategy (Required)

**Unit Tests**: Required for all utility functions and business logic
- **Framework**: Vitest (fast, TypeScript-native)
- **Coverage**: Aim for 80%+ on utils, parsers, scoring
- **Location**: `*.test.ts` files alongside source
- **Run**: `npm test -- --run` in each package (use `--run` flag to avoid interactive watch mode)

**Critical test areas**:
- `@quizzquizz/common`: Scoring calculations, PIN generation, validation
- `@quizzquizz/question-bank`: Markdown parsing, question validation
- `@quizzquizz/api-server`: Session management, game state transitions

**Integration Testing**:
- **API**: Use REST client (curl, Postman, VS Code REST Client extension)
- **Frontend**: Multiple browser windows simulating host + players
- **Manual testing**: Open host UI + 2-3 player UIs in different tabs/windows

**Test-Driven Development**: Write tests before implementation for complex logic

## Code Conventions

### Scoring Formula (Kahoot-style)
```typescript
// Located in @quizzquizz/common/utils
score = basePoints * (1 - (timeTaken / timeLimit) * 0.5)
// Faster answers = more points
// Multiple correct answers: full points only if all selected correctly
```

### PIN Generation
- 6 digits, no ambiguous characters (avoid 0/O, 1/I)
- Must be unique for active sessions
- Function in `@quizzquizz/common/utils`

### Security Pattern
- **Host token**: Secret token (UUID) for host operations - separate from PIN
- **PIN**: Only for players to join - public
- All host endpoints require host token validation

### Game State Machine
```
Session states: 'lobby' → 'playing' → 'finished'
- lobby: Players joining, host hasn't started
- playing: Quiz in progress, questions advancing
- finished: Quiz complete, final leaderboard shown
```

## Key Integration Points

### API ↔ Question Bank
- API server loads question banks on startup from `question-banks/`
- `@quizzquizz/question-bank` package exports parser functions
- Server validates loaded questions before making them available

### Frontend ↔ API
- **No shared code** between frontend packages (host-app, player-app)
- Both consume same API contract from `@quizzquizz/common` types
- Polling implemented in each app independently

### Type Safety
- Zod schemas in `@quizzquizz/common` for runtime validation
- TypeScript interfaces for compile-time safety
- API request/response types must match between client and server

## Common Pitfalls

1. **Don't use WebSockets** - This is intentional. Use polling with ETags.
2. **Don't add a framework** - Web Components are part of the design philosophy.
3. **TypeScript project references** - Build order matters in monorepo. Run `npm run build --workspaces` from root.
4. **Session cleanup** - Expire old sessions (Phase 6 task). Database will grow otherwise.
5. **Server-side timing** - Use server timestamps for answer validation, not client time.

## Phase-Based Development

Follow `vibe/PLAN.md` phases sequentially. Each phase is designed to be completable in one focused session with a working deliverable.

**Current status**: Repository initialized (Phase 0 in progress)

When implementing:
- Complete one phase fully before moving to next
- Test each deliverable before proceeding
- Make small, focused commits per task
- Reference `vibe/PROJECT.md` for design decisions

## Questions & Ambiguity

If something is unclear:
1. Check `vibe/PROJECT.md` (architecture/design) or `vibe/PLAN.md` (implementation steps)
2. Follow the **simplicity principle** - choose simpler over clever
3. Prefer working code over perfect code (refactor when patterns emerge)
4. For missing details: make reasonable assumptions aligned with "Kahoot-like experience"
