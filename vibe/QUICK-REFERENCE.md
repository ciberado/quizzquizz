# Quick Reference Guide

## Key Commands

### Development

```bash
# Start API server (port 3000)
npm run dev --workspace=@quizzquizz/api-server

# Start player UI (port 3002)
npm run dev --workspace=@quizzquizz/player-app

# Start host UI (port 3001)
npm run dev --workspace=@quizzquizz/host-app

# Start all in development mode
npm run dev --workspaces
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

| Service         | Port | URL                          | Purpose                      |
|-----------------|------|------------------------------|------------------------------|
| API Server      | 3000 | http://localhost:3000        | REST API endpoints           |
| Host App        | 3001 | http://localhost:3001        | Host/presenter UI            |
| Player App      | 3002 | http://localhost:3002        | Player participation UI      |
| Docker (Caddy)  | 3000 | http://localhost:3000        | Production reverse proxy     |

---

## API Base URLs

### Development

- API: `http://localhost:3000`
- Player App: `http://localhost:3002`
- Host App: `http://localhost:3001`

### Production (Docker)

- All services: `http://localhost:3000`
  - `/` → Player app
  - `/host` → Host app
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
├── api-server/
│   ├── src/
│   │   ├── index.ts          # Hono server setup
│   │   ├── db/index.ts       # Database schema and queries
│   │   ├── routes/
│   │   │   ├── sessions.ts   # Session endpoints
│   │   │   ├── players.ts    # Player endpoints
│   │   │   ├── game.ts       # Game state/answer endpoints
│   │   │   └── question-banks.ts  # Question bank endpoints
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
│   │   │   ├── create-session-screen.ts
│   │   │   ├── lobby-screen.ts
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
question-banks/
├── sample-general-knowledge.md
└── [other .md question banks]

vibe/
├── PROJECT.md                # Architecture & design decisions
├── PLAN.md                   # Implementation plan (this file)
├── FAILS.md                  # Known issues and failures
└── phases/                   # Individual phase documentation
    ├── PHASE-0-3-foundations.md
    ├── PHASE-4-player-app.md
    ├── PHASE-5-host-app.md
    ├── PHASE-6-polish.md
    ├── PHASE-7-8-features-deployment.md
    ├── PHASE-9-15-future.md
    └── QUICK-REFERENCE.md   # This file

e2e/
├── api.spec.ts              # API tests
├── player-ui.spec.ts        # Player UI tests
├── host-analytics.spec.ts   # Host analytics tests
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
# Terminal 1: API Server
npm run dev --workspace=@quizzquizz/api-server

# Terminal 2: Host App
npm run dev --workspace=@quizzquizz/host-app

# Terminal 3: Player App
npm run dev --workspace=@quizzquizz/player-app

# Terminal 4: Tests (watch mode)
npm test
```

### Testing a Complete Flow

1. Host app: http://localhost:3001 → Create session
2. Player app: http://localhost:3002 → Enter PIN and join
3. Host app: Start quiz and advance through questions
4. Player app: Answer questions and see results

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
**Solution**: Kill the process on that port or use different port via NODE_ENV and PORT env vars

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
6. **HTTPS**: Use reverse proxy (Caddy, nginx) with SSL certificates

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
