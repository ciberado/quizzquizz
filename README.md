# QuizzQuizz 🎯

A real-time competitive quiz platform inspired by Kahoot, built with simplicity and performance in mind.

## Quick Start with Docker

The easiest way to run QuizzQuizz is using Docker Compose:

```bash
# Start the application
docker compose up -d

# View logs
docker compose logs -f

# Stop the application
docker compose down
```

The application will be available at:
- **Player app**: http://localhost:3000/
- **Host app**: http://localhost:3000/host
- **API**: http://localhost:3000/api/

## Architecture

QuizzQuizz uses a modern, simplified architecture:
- **Caddy**: Reverse proxy providing a single entry point
- **API Server**: Hono-based REST API with SQLite database (Prisma ORM)
- **Frontend Apps**: Vanilla TypeScript with Web Components (no React/Vue)
- **Polling over WebSockets**: Simpler deployment and debugging

## Features

- ✅ Real-time quiz games with PIN-based joining
- ✅ Multiple-choice questions with time-based scoring
- ✅ Live leaderboards and player rankings
- ✅ Question bank management with filtering (difficulty, topics, tags)
- ✅ Post-game analytics and review
- ✅ Automatic quiz pacing option
- ✅ Mobile-responsive player and host interfaces
- ✅ Session management with automatic cleanup
- ✅ **User authentication** - Optional sign up/login for both hosts and players
  - Save quiz history and performance stats
  - Track your progress over time
  - Anonymous play still fully supported
- ✅ **Quiz bank upload** - Logged-in hosts can upload their own Markdown quiz banks directly from the browser
  - Paste Markdown or pick a `.md` file
  - One-click Claude AI prompt to help generate correctly-formatted banks
  - Validated on upload — bad format is rejected with clear error messages
  - Uploaded banks appear immediately in the bank browser under your personal folder

## Development

### Prerequisites

- Node.js 22+ LTS
- npm 10+
- Docker (for containerized deployment)

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run API server
npm run dev --workspace=@quizzquizz/api-server

# Run host app (separate terminal)
npm run dev --workspace=@quizzquizz/host-app

# Run player app (separate terminal)
npm run dev --workspace=@quizzquizz/player-app
```

Development servers:
- API: http://localhost:3000
- Host app: http://localhost:3001
- Player app: http://localhost:3002

### Testing

```bash
# Run all unit tests
npm test

# Run E2E tests with Playwright
npm run test:e2e
```

## Project Structure

```
quizzquizz/
├── packages/
│   ├── common/           # Shared types, Zod schemas, utilities
│   ├── question-bank/    # Markdown parser for question files
│   ├── api-server/       # REST API (Hono + SQLite + Prisma)
│   ├── host-app/         # Host UI (Web Components + Vite)
│   └── player-app/       # Player UI (Web Components + Vite)
├── question-banks/       # Sample .md files with quiz questions
├── vibe/                 # Project documentation and plans
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Orchestration (API + Caddy)
└── Caddyfile             # Reverse proxy configuration
```

## Docker Scripts

```bash
# Build Docker image
npm run docker:build

# Start containers
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Restart containers
npm run docker:restart

# Clean up everything (containers, volumes, images)
npm run docker:clean
```

## Configuration

Environment variables (in `docker-compose.yml`):

- `NODE_ENV`: `production` or `development`
- `PORT`: API server port (default: 3000)
- `DATABASE_URL`: SQLite database path
- `QUESTION_BANKS_PATH`: Path to question bank files
- `SESSION_EXPIRY_HOURS`: Session expiration time (default: 24)
- `LOG_LEVEL`: Logging level (`error`, `warn`, `info`, `debug`)
- `MAX_UPLOAD_KB`: Maximum quiz bank upload size in KB (default: 500)

## Question Banks

Questions are stored as Markdown files in `question-banks/`. See existing samples for format.

### Uploading Questions (Browser)

Logged-in hosts can upload quiz banks directly from the Host UI:

1. Open the host app and sign in
2. Go to **Create Quiz** (the bank browser)
3. Click **"⬆ Upload Quiz"** in the top right
4. Paste Markdown or pick a `.md` file
5. Click **Upload Quiz** — the bank appears immediately

Use the **"📋 Copy Claude Prompt"** button inside the upload modal to get a ready-made prompt that produces correctly-formatted quiz banks via Claude AI.

Uploaded banks are stored under `question-banks/user-quizzes/<userId>/` and are git-ignored.

### Editing Questions (Filesystem)

When running with Docker Compose, question bank files are mounted as a volume:

1. **Edit** question bank files in `question-banks/` directory
2. **Reload** in the Host UI:
   - Open the host app at `http://localhost:3000`
   - Click the **"🔄 Refresh Banks"** button (top-right corner)
   - Your changes will appear immediately

Alternatively, reload via command line:
```bash
./reload-question-banks.sh
# Or manually:
curl -X POST http://localhost:3000/api/question-banks/reload
```

### Question Format

Example:
```markdown
# Question 1
## What is the capital of France?
- [x] Paris
- [ ] London
- [ ] Berlin
- [ ] Madrid

**Difficulty**: easy
**Topics**: geography, capitals
**Time Limit**: 20
```

## License

MIT

## Contributing

See `vibe/PLAN.md` for the development roadmap and contribution guidelines.
