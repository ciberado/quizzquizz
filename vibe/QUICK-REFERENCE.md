# Quick Reference Guide

## Key Commands

### Development

```bash
# Start everything behind a single port (recommended)
npm start          # all services + proxy on :3000, blocks with logs
npm stop           # stop from any other terminal (reads .dev.pid)

# Or run individual services (fine-grained, separate terminals)
npm run dev -w @quizzquizz/api-server     # API server  (port 3010)
npm run dev -w @quizzquizz/host-app       # Host UI     (port 3001)
npm run dev -w @quizzquizz/player-app     # Player UI   (port 3002)
npm run dev -w @quizzquizz/analytics-ui   # Analytics   (port 3003)
npm run dev -w @quizzquizz/flashcard-app  # Flashcard   (port 3004)
node scripts/dev-proxy.mjs               # Proxy       (port 3000)

# Start all services + proxy in one terminal (foreground concurrently)
npm run dev
```

### Testing

```bash
# Run all tests once
npm test -- --run

# Run tests for specific package
npm test -- --run --workspace=@quizzquizz/api-server

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests with debug output
npm run test:e2e:debug

# Watch mode for development
npm test
```

### Building

```bash
# Build all packages
npm run build --workspaces

# Build specific package
npm run build --workspace=@quizzquizz/api-server

# Build for production
npm run build:prod --workspaces
```

### Question Bank Builder (offline CLI)

```bash
# Build the builder
npm run build -w @quizzquizz/question-bank-builder

# Classify JSONL → per-category Markdown (requires AWS credentials)
npx question-bank-builder classify \
  -i source.jsonl -t topics.json -o question-banks/ -p my-quiz \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 --aws-region us-east-1

# Transform + enrich + split by topic
npx question-bank-builder \
  -i input.json -o question-banks/ -p prefix --enrich \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 --aws-region us-east-1

# Test with limited questions
npx question-bank-builder -i input.json -o output/ -p test --enrich --limit 5 \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 --aws-region us-east-1
```

### Quality & Linting

```bash
# Check all packages
npm run lint

# Format with Prettier
npm run format

# TypeScript compilation check
npm run typecheck
```

### Docker

```bash
# Build Docker image
npm run docker:build

# Build with version tag
npm run docker:build:version

# Start with Docker Compose
npm run docker:up

# Stop Docker services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Clean up everything
npm run docker:clean
```

---

## Service Ports

| Service              | Port | URL (via proxy)               | Purpose                       |
|----------------------|------|-------------------------------|-------------------------------|
| **Dev Proxy** 🔀     | **3000** | http://localhost:3000      | Single entry point (dev)      |
| API Server           | 3010 | :3000/api/*                   | REST API endpoints            |
| Host App             | 3001 | :3000/host/                   | Host/presenter UI             |
| Player App           | 3002 | :3000/                        | Player participation UI       |
| Analytics UI         | 3003 | :3000/analytics/              | Analytics dashboard           |
| Flashcard App        | 3004 | :3000/flashcard/              | Flashcard study sessions      |
| Docker/Caddy (prod)  | 3000 | http://localhost:3000         | Production reverse proxy      |

> In development, access **everything through port 3000** — the proxy routes to the right service.

---

## API Base URLs

### Development

- Proxy (single-port): `http://localhost:3000`
- API direct: `http://localhost:3010`
- Player App: `http://localhost:3002`
- Host App: `http://localhost:3001`
- Flashcard App: `http://localhost:3004`

### Production (Docker)

- All services: `http://localhost:3000`
  - `/` → Player app
  - `/host` → Host app
  - `/flashcard` → Flashcard app
  - `/analytics` → Analytics UI
  - `/api/*` → API endpoints

---

## File Structure Quick Find

```
packages/
├── common/
│   ├── types.ts              # Core types, Zod schemas
│   ├── utils.ts              # Utilities (PIN, scoring, validation)
│   └── utils.test.ts         # Tests for utilities
│
├── question-bank/
│   ├── index.ts              # Markdown parser, question loader
│   └── index.test.ts         # Parser tests
│
├── question-bank-builder/    # Standalone CLI (not part of dev server)
│   ├── src/
│   │   ├── cli.ts            # yargs CLI (classify / default command)
│   │   ├── classify.ts       # JSONL → AI classify → per-category output
│   │   ├── generate_quizzes.ts # Classified JSONL → Markdown quiz files
│   │   ├── enrich.ts         # LangGraph + Bedrock enrichment
│   │   ├── transform.ts      # Load / save / split-by-topic
│   │   ├── markdown.ts       # Markdown parser & serializer
│   │   ├── ai_samples.ts     # JSON/JSONL input loader
│   │   ├── types.ts          # RawQuestion, QuestionBank, etc.
│   │   └── prompts/          # Prompt templates for AI
│   ├── samples/              # Example inputs and topic taxonomy
│   └── README.md             # Full CLI reference
│
├── api-server/
│   ├── src/
│   │   ├── index.ts          # Hono server setup
│   │   ├── db/index.ts       # Database schema and queries
│   │   ├── reload-banks.ts   # Shared reload helper
│   │   ├── upload-mutex.ts   # Async mutex for upload serialization
│   │   ├── routes/
│   │   │   ├── sessions.ts   # Session endpoints (quiz + flashcard)
│   │   │   ├── players.ts    # Player endpoints
│   │   │   ├── game.ts       # Game state/answer endpoints
│   │   │   ├── question-banks.ts  # Question bank endpoints
│   │   │   └── user-banks.ts # User quiz upload endpoints
│   │   └── session-cleanup.ts  # Background cleanup job
│   └── test.http             # REST client test file
│
├── host-app/
│   ├── src/
│   │   ├── main.ts           # App entry point
│   │   ├── router.ts         # Hash-based routing
│   │   ├── state.ts          # State management
│   │   ├── api-client.ts     # API client with host endpoints
│   │   ├── components/
│   │   │   ├── base-component.ts
│   │   │   ├── bank-browser.ts       # Bank browser + upload button
│   │   │   ├── upload-quiz-modal.ts  # Quiz upload modal (paste/file/Claude)
│   │   │   ├── create-session-screen.ts
│   │   │   ├── lobby-screen.ts
│   │   │   ├── flashcard-lobby-screen.ts  # Flashcard lobby with PIN + Play Now
│   │   │   ├── question-display-screen.ts
│   │   │   ├── leaderboard-screen.ts
│   │   │   ├── final-results-screen.ts
│   │   │   ├── question-stats-table.ts
│   │   │   └── [other components]
│   │   └── styles.css        # Projector-optimized styling
│   └── index.html
│
├── player-app/
│   ├── src/
│   │   ├── main.ts           # App entry point
│   │   ├── router.ts         # Hash-based routing
│   │   ├── state.ts          # State management
│   │   ├── api-client.ts     # API client with player endpoints
│   │   ├── components/
│   │   │   ├── base-component.ts
│   │   │   ├── join-screen.ts
│   │   │   ├── nickname-screen.ts
│   │   │   ├── lobby-screen.ts
│   │   │   ├── question-screen.ts
│   │   │   ├── waiting-screen.ts
│   │   │   ├── results-screen.ts
│   │   │   ├── final-results-screen.ts
│   │   │   └── [other components]
│   │   └── styles.css        # Mobile-first styling
│   └── index.html
│
├── flashcard-app/            # Standalone Vite SPA at /flashcard/
│   ├── src/
│   │   ├── main.ts           # App entry point
│   │   ├── router.ts         # Hash-based routing (#/play/:id, #/summary)
│   │   ├── state.ts          # Session state
│   │   ├── api-client.ts     # Flashcard API calls
│   │   ├── leitner.ts        # Leitner 3-box spaced repetition engine
│   │   ├── leitner.test.ts   # Leitner unit tests
│   │   ├── components.test.ts# Component logic tests
│   │   └── components/
│   │       ├── base-component.ts
│   │       ├── join-screen.ts        # PIN + nickname entry
│   │       ├── play-screen.ts        # Card display + Yes/No
│   │       └── summary-screen.ts     # Session summary + download
│   └── index.html
│
├── analytics/
└── analytics-ui/

scripts/
├── dev-proxy.mjs             # HTTP reverse proxy on :3000 (mirrors Caddyfile)
├── proxy-router.mjs          # Exported routing logic (testable)
├── proxy-router.test.mjs     # Unit tests for proxy routing (node --test)
├── start-dev.mjs             # npm start: spawn all services + write .dev.pid
└── stop-dev.mjs              # npm stop: read .dev.pid and SIGTERM

question-banks/
├── sample-general-knowledge.md
├── [other .md question banks]
└── user-quizzes/            # User-uploaded banks (git-ignored, runtime data)
    └── <userId>/
        └── <folder>/<file>.md

vibe/
├── PROJECT.md                # Architecture & design decisions
├── PLAN.md                   # Implementation plan
├── FAILS.md                  # Known issues and failures
└── phases/                   # Individual phase documentation

e2e/
├── api.spec.ts              # API tests
├── proxy.spec.ts            # Single-port proxy routing tests
├── flashcard.spec.ts        # Flashcard session flow tests
├── player-ui.spec.ts        # Player UI tests
├── host-analytics.spec.ts   # Host analytics tests
├── quiz-upload.spec.ts      # Quiz upload tests
└── [other E2E tests]
```

---

## TypeScript Configuration

### Monorepo Setup
- **Base config**: `tsconfig.base.json`
- **Project references**: Enabled in each `tsconfig.json`
- **Strict mode**: Enabled globally (`strict: true`)

### Per-Package
- API Server: `packages/api-server/tsconfig.json`
- Common: `packages/common/tsconfig.json`
- Question Bank: `packages/question-bank/tsconfig.json`
- Question Bank Builder: `packages/question-bank-builder/tsconfig.json` (extends base; `commonjs` module for Node CLI)
- Host App: `packages/host-app/tsconfig.json`
- Player App: `packages/player-app/tsconfig.json`

---

## Testing Resources

### Test Files
- Common utilities: `packages/common/src/utils.test.ts`
- Question bank parser: `packages/question-bank/src/index.test.ts`
- API server: `packages/api-server/src/routes/*.test.ts`
- Player app: `packages/player-app/src/**/*.test.ts`
- Host app: `packages/host-app/src/**/*.test.ts`
- E2E: `e2e/*.spec.ts`

### Test Commands
- **Run all**: `npm test -- --run`
- **Watch mode**: `npm test`
- **Specific package**: `npm test -- --run --workspace=@quizzquizz/api-server`
- **E2E only**: `npm run test:e2e`
- **Coverage**: `npm test -- --coverage` (in specific packages)

### REST Client Testing
- File: `packages/api-server/test.http`
- Use: VS Code REST Client extension or Postman
- Quick test without running full app

---

## Database

### Schema
- **Provider**: Prisma v6 with SQLite
- **Migrations**: `packages/api-server/prisma/migrations/`
- **Schema**: `packages/api-server/prisma/schema.prisma`

### Connection
- **Development**: File-based SQLite (`.data/quiz.db`)
- **Testing**: In-memory SQLite (`:memory:`)
- **Production**: Docker volume (`quiz-data:/data`)

### Running Migrations
```bash
# Automatic on app startup
npm run dev --workspace=@quizzquizz/api-server

# Manual migration (in api-server)
npm run prisma:migrate
npm run prisma:studio  # Interactive UI
```

---

## Key Integration Points

### API ↔ Question Bank
- API loads question banks on startup from `question-banks/`
- `@quizzquizz/question-bank` package exports parser functions
- Server validates questions before exposing them

### Frontend ↔ API
- No shared code between frontend packages
- Both consume API contract from `@quizzquizz/common` types
- Polling-based (no WebSockets) - ETags for optimization

### Type Safety
- Zod schemas in `@quizzquizz/common` for runtime validation
- TypeScript interfaces for compile-time safety
- API request/response types match between client and server

---

## Important Files & Locations

### Configuration
- Node settings: `package.json`
- TypeScript base: `tsconfig.base.json`
- Linting: `.eslintrc.json`
- Formatting: `.prettierrc`
- Environment: `.env.example`

### Build Output
- API Server: `packages/api-server/dist/`
- Host App: `packages/host-app/dist/`
- Player App: `packages/player-app/dist/`

### Docker
- Dockerfile: `Dockerfile`
- Docker Compose: `docker-compose.yml`
- Caddy config: `Caddyfile`
- Context filter: `.dockerignore`

### Documentation
- Project architecture: `vibe/PROJECT.md`
- Implementation plan: `vibe/PLAN.md`
- Phase details: `vibe/phases/*.md`
- Known issues: `vibe/FAILS.md`

---

## Development Workflow

### Starting Development

```bash
# Recommended: single command, everything on port 3000
npm start

# Or manual multi-terminal setup:
# Terminal 1: npm run dev -w @quizzquizz/api-server     (port 3010)
# Terminal 2: npm run dev -w @quizzquizz/host-app       (port 3001)
# Terminal 3: npm run dev -w @quizzquizz/player-app     (port 3002)
# Terminal 4: node scripts/dev-proxy.mjs               (port 3000)
# Terminal 5: npm test
```

### Testing a Complete Flow

1. Start all services: `npm start`
2. Host app: http://localhost:3000/host/ → Create session
3. Player app: http://localhost:3000 → Enter PIN and join
4. Host app: Start quiz and advance through questions
5. Player app: Answer questions and see results

### Flashcard Mode

1. Host app: http://localhost:3000/host/ → pick a bank → **🃏 Launch Flashcards**
2. Share PIN or click **▶ Play Now** to open the flashcard app
3. Flashcard app: http://localhost:3000/flashcard/ → study with Leitner spaced repetition

### Making Changes

1. **Types**: Update `packages/common/src/types.ts` (Zod schema first)
2. **API**: Add endpoint in `packages/api-server/src/routes/*.ts`
3. **Player UI**: Add component in `packages/player-app/src/components/`
4. **Host UI**: Add component in `packages/host-app/src/components/`
5. **Tests**: Add `.test.ts` files alongside source
6. **Commit**: Use conventional commits, update `CHANGELOG.md`

### Building for Production

```bash
# Build locally
npm run build --workspaces

# Build and run in Docker
npm run docker:build
npm run docker:up

# Push to registry (after adding credentials)
docker tag quizzquizz:latest your-registry/quizzquizz:latest
docker push your-registry/quizzquizz:latest
```

---

## Useful Resources

### Documentation
- **Project Architecture**: See `vibe/PROJECT.md`
- **Implementation Plan**: See `vibe/PLAN.md`
- **Phase Details**: See `vibe/phases/` directory
- **Known Failures**: See `vibe/FAILS.md`
- **This File**: Quick reference and commands

### Sample Data
- **Questions**: `question-banks/sample-general-knowledge.md`
- **API Tests**: `packages/api-server/test.http`

### External Resources
- [Hono Framework](https://hono.dev/)
- [Prisma ORM](https://www.prisma.io/)
- [Zod Validation](https://zod.dev/)
- [Vitest Testing](https://vitest.dev/)
- [Playwright E2E](https://playwright.dev/)
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)

---

## Common Issues & Solutions

### Issue: "Port already in use"
**Solution**: `npm stop` to kill the dev stack (if started with `npm start`). Otherwise kill the specific port: `lsof -ti:3000 | xargs kill`

### Issue: "Database locked"
**Solution**: SQLite concurrent access - restart API server and ensure only one instance running

### Issue: Tests failing with "Connection refused"
**Solution**: API server not running - start it in another terminal for E2E tests

### Issue: "CORS error" in frontend
**Solution**: Check API_URL env var and ensure Caddy is configured correctly in production

### Issue: Docker build fails
**Solution**: Check `docker system prune` to clean old images, ensure Docker daemon is running

---

## Performance Tips

1. **Polling Optimization**: Use ETags to reduce data transfer
2. **Component Rendering**: Only update DOM on actual state changes
3. **Event Cleanup**: Ensure all event listeners and intervals are cleaned up on unmount
4. **Request Deduplication**: Cancel pending requests before making new ones
5. **Database Indexes**: Consider adding indexes on frequently queried columns (sessionId, pin)
6. **Static Serving**: Compress static assets and use appropriate cache headers

---

## Security Considerations

1. **Host Token**: Secret token stored in localStorage - treat as sensitive
2. **PIN**: Public but time-limited, regenerated for each session
3. **Player ID**: Can be extracted from state, not a security measure
4. **CORS**: Restrict to known origins in production
5. **Database**: SQLite appropriate for single-instance, consider PostgreSQL for scaling
6. **HTTPS**: Use reverse proxy (Caddy, nginx) with SSL certificates7. **Upload security**: Folder/filename inputs are sanitized (alphanumeric, `-`, `_`, `.`, space only); path traversal is blocked via `path.resolve` prefix check; files are limited to `MAX_UPLOAD_KB`
---

## Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] SSL/HTTPS configured
- [ ] CORS origins whitelisted
- [ ] Rate limiting enabled
- [ ] Monitoring/logging set up
- [ ] Health check endpoint verified
- [ ] Question banks loaded correctly
- [ ] Tested with expected player count
- [ ] Graceful shutdown tested
- [ ] Rollback procedure documented
