# QuizzQuizz 🎯

A real-time competitive quiz platform inspired by Kahoot, built with simplicity and performance in mind.

## Deployment

| Guide | When to use |
|-------|-------------|
| [**Docker deployment**](docs/deployment-docker.md) | Recommended — Docker Compose runs everything in containers; includes Tailscale and EC2 proxy options |
| [**Bare-metal deployment**](docs/deployment-bare-metal.md) | Node.js + Caddy directly on the host, no Docker required |

## Architecture

QuizzQuizz uses a modern, simplified architecture:
- **Caddy**: Reverse proxy providing a single entry point
- **API Server**: Hono-based REST API with SQLite database (Prisma ORM)
- **Frontend Apps**: Vanilla TypeScript with Web Components (no React/Vue)
- **Real-time sync**: Yjs + y-websocket for live game state (no polling)

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
- ✅ **Flashcard self-study mode** - Solo learning experience at `/flashcard/` — no host or game session needed
  - Pick any question bank and study at your own pace
  - Powered by a modified Leitner spaced-repetition system (3-box algorithm)
  - Cards progress through Learning → Reviewing → Mastered based on your answers
  - Session summary shows mastery rate and first-try success rate when you finish

## Development

### Prerequisites

- Node.js 22+ LTS and npm 10+

### Setup

```bash
npm install
npm run dev   # starts all services + dev proxy on port 3000
```

See [bare-metal deployment](docs/deployment-bare-metal.md#development-mode) for port details.

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
│   ├── player-app/       # Player UI (Web Components + Vite)
│   ├── analytics/        # Analytics calculation logic
│   ├── analytics-ui/     # Analytics dashboard UI
│   └── flashcard-app/    # Flashcard self-study UI (Web Components + Vite)
├── question-banks/       # Sample .md files with quiz questions
├── docs/                 # Deployment guides
├── vibe/                 # Project documentation and plans
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Orchestration (API + Caddy)
├── docker-compose.ts.yml # Tailscale deployment variant
├── Caddyfile             # Reverse proxy configuration (Docker)
└── Caddyfile.proxy       # EC2 public proxy configuration
```

## Question Banks

Questions are stored as Markdown files in `question-banks/`. See existing samples for format, or read [`vibe/QUESTION-BANK-FORMAT.md`](vibe/QUESTION-BANK-FORMAT.md).

### Uploading Questions (Browser)

Logged-in hosts can upload quiz banks directly from the Host UI:

1. Open the host app and sign in
2. Go to **Create Quiz** (the bank browser)
3. Click **"⬆ Upload Quiz"** in the top right
4. Paste Markdown or pick a `.md` file
5. Click **Upload Quiz** — the bank appears immediately

Use the **"📋 Copy Claude Prompt"** button inside the upload modal to get a ready-made prompt that produces correctly-formatted quiz banks via Claude AI.

Uploaded banks are stored under `question-banks/user-quizzes/<userId>/` and are git-ignored.

### Reloading edited banks

```bash
./reload-question-banks.sh
# or: curl -X POST http://localhost:3000/api/question-banks/reload
```

Or click **🔄 Refresh Banks** in the Host UI.

### Question Format

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

## Flashcard Self-Study Mode

The flashcard app at `/flashcard/` lets anyone study a question bank solo — no host, no PIN, no game session required.

1. Open `http://localhost:3000/flashcard/`
2. Pick a question bank (and optionally a set)
3. Answer each card — tap **✓ Yes** if you knew it, **✗ No** if you didn't
4. Cards cycle through a 3-box Leitner algorithm until all are mastered
5. A summary screen shows your mastery rate and first-try success rate at the end

The Leitner system used:

| Box | Name | Spacing |
|-----|------|---------|
| 1 | Learning | Reappears immediately |
| 2 | Reviewing | Reappears after ~4 other cards |
| 3 | Mastered | One final confirmation, then graduated |

A "No" answer at any box returns the card to Box 1.

## License

MIT

## Contributing

See `vibe/PLAN.md` for the development roadmap and contribution guidelines.
