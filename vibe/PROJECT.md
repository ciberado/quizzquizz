# QuizzQuizz - Project Overview

## Vision

QuizzQuizz is a real-time, competitive quiz platform inspired by Kahoot. A host creates quiz sessions from markdown-based question banks, players join via PIN codes, and compete for the highest score on a live leaderboard. The system prioritizes simplicity over complexity—using a **server-authoritative Yjs + WebSocket hybrid** for real-time push synchronization (with REST for all mutations), vanilla TypeScript with Web Components instead of heavy frameworks, and SQLite for persistence.

---

## Core Concepts

### Question Bank
- **Format**: Markdown files stored in a directory
- **Content**: Questions with ID, text, correct answer(s), distractors, difficulty, topics, and tags
- **Multiple correct answers**: Supported
- **Question types**: Multiple choice (expandable later)

### Quiz Session
- **Host-controlled**: A host creates a session, selects questions, and controls the pace
- **PIN-based access**: Players join with a short numeric PIN (e.g., 6 digits)
- **Anonymous players**: Nicknames only, no accounts required (accounts planned for later)

### Gameplay Flow
1. Host creates a session and selects a question bank/quiz configuration
2. Players join the session lobby using the PIN
3. Host starts the quiz
4. For each question:
   - Host advances to the next question
   - All players see the question simultaneously
   - Players submit answers within a time limit
   - Scores are calculated (faster correct answers = more points)
   - Leaderboard updates and displays
5. Quiz ends, final leaderboard shown

### Scoring (Kahoot-style)
- Base points for correct answers (e.g., 1000 points)
- Time bonus: Points decrease as time passes
- Formula example: `score = basePoints * (1 - (timeTaken / timeLimit) * 0.5)`
- Multiple correct answers: Full points if all correct answers selected, partial credit optional

---

## Architecture

### Monorepo Structure

```
quizzquizz/
├── packages/
│   ├── common/              # Shared types, utilities, validation
│   ├── question-bank/       # Markdown parsing, question bank management
│   ├── question-bank-builder/ # CLI tool: JSONL → AI enrichment → Markdown banks
│   ├── api-server/          # REST API backend
│   ├── host-app/            # Host/presenter web application
│   └── player-app/          # Player web application
├── question-banks/          # Sample question bank markdown files
├── vibe/                    # Project documentation
├── package.json             # Workspace root
└── tsconfig.base.json       # Shared TypeScript config
```

### Package Responsibilities

#### `@quizzquizz/common`
- Shared TypeScript types and interfaces
- Validation schemas (e.g., Zod)
- Utility functions (scoring calculations, PIN generation)
- Constants and configuration types

#### `@quizzquizz/question-bank`
- Markdown parser for question files
- Question bank loader and validator
- Question selection/filtering by difficulty, topics, tags
- Random question sampling

#### `@quizzquizz/question-bank-builder`
- Standalone CLI tool (not a runtime dependency)
- Reads JSONL question banks from external sources
- AI enrichment via Amazon Bedrock / LangGraph (topic extraction, difficulty tagging, quality scoring)
- Classification with a topic taxonomy
- Generates Markdown files compatible with the `@quizzquizz/question-bank` parser
- Splits large banks by topic into multiple files
- See [`packages/question-bank-builder/README.md`](../packages/question-bank-builder/README.md) for full CLI reference

#### `@quizzquizz/api-server`
- REST API endpoints (all mutations: join, answer, start, next, end, adjust-timer)
- SQLite database with Prisma ORM (type-safe, developer-friendly)
- Session management (create, join, state transitions)
- Game state management
- **Yjs WebSocket server**: one shared `Y.Doc` per session (ephemeral, in-memory); after every DB write the doc is updated and all connected clients receive a push update automatically
- `session-doc-manager.ts` — in-memory doc registry (`getOrCreateSession`, `updateDoc`, `destroySession`)
- `ws-handler.ts` — WebSocket upgrade handler implementing the y-websocket sync protocol; auth via `?playerId=` or `?hostToken=` query params

#### `@quizzquizz/host-app`
- Web Components-based SPA
- Session creation and configuration
- Question bank browser
- **Quiz bank upload**: logged-in hosts can upload Markdown banks via paste or file picker; validated before saving, immediate availability
- Live game control (next question, show results)
- Leaderboard display
- Post-game question analytics (accuracy, answer breakdown, sorting)
- Projector-friendly display mode

#### `@quizzquizz/player-app`
- Web Components-based SPA
- PIN entry and nickname selection
- Question display and answer submission
- Personal score and ranking display
- Waiting/lobby screens

#### `@quizzquizz/admin-app`
- Standalone Vite + TypeScript + Web Components SPA served at `/admin/`
- Screens: sign-in, forced password-change, and full user-management table
- Per-row actions: toggle admin, delete (with confirmation), reset password (displays temp password)
- Auth guard: unauthenticated → /login; mustChangePassword → /change-password; non-admin → Access Denied

---

## Authentication & Authorization

### Overview
Authentication is **opt-in** for regular users but **required** for hosts using the bank editor.
The system supports two sign-in methods:

| Method | When to use |
|---|---|
| Email/password | Default; credentials stored with Better Auth (bcrypt-hashed) |
| IMAP | When `IMAP_HOST` env var is set; server validates against your IMAP server; no password stored locally |

### User Roles

| Flag | Description |
|---|---|
| (none) | Regular user — can play and host quizzes |
| `isAdmin` | Can access `/admin/` and manage all users |
| `mustChangePassword` | Must change password before any non-auth endpoint is usable (HTTP 403 PASSWORD_RESET_REQUIRED) |

### Global Admin Bootstrap
If `ADMIN_EMAIL` is set at startup and no admin user exists, the server creates one automatically:
- Uses `ADMIN_PASSWORD` if set; otherwise auto-generates a random password and logs it to stdout
- Sets `mustChangePassword=true` on creation; first sign-in forces a password change
- Env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`

### IMAP Configuration
Set these env vars to enable the IMAP login toggle on all sign-in screens:
- `IMAP_HOST` — IMAP server hostname (e.g. `mail.example.com`)
- `IMAP_PORT` — port (default `993`)
- `IMAP_TLS` — `true`/`false` (default `true`)

### Auth Endpoints (custom, in addition to Better Auth defaults)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/capabilities` | Returns `{ imapEnabled: boolean }` |
| GET | `/api/auth/get-session` | Augmented session endpoint — wraps Better Auth's session with `isAdmin` and `mustChangePassword` from Prisma; returns `{ session, user }` (or `{ session: null, user: null }` when unauthenticated) |
| POST | `/api/auth/imap-sign-in` | IMAP credential validation + session creation |
| POST | `/api/auth/change-password` | Change password + clear mustChangePassword |

### Admin REST API (all require `isAdmin=true`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List users; supports `?page`, `?limit`, `?search` |
| PATCH | `/api/admin/users/:id` | Update name, email, username, isAdmin |
| DELETE | `/api/admin/users/:id` | Delete user (self-delete and last-admin guarded) |
| POST | `/api/admin/users/:id/reset-password` | Generate temp password; set mustChangePassword |

---

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (lightweight, fast)
- **Database**: SQLite with Prisma v6 ORM (type-safe, auto-generated client)
- **Validation**: Zod
- **Real-time sync**: Yjs (`yjs` + `y-websocket` + `ws`) — server-authoritative shared doc per session

### Frontend
- **Language**: TypeScript
- **UI**: Vanilla Web Components (no framework)
- **Styling**: CSS (possibly with CSS modules or simple scoped styles)
- **Build**: Vite
- **State**: Simple pub/sub or signals pattern

### Monorepo
- **Package manager**: npm with workspaces
- **Build**: TypeScript project references
- **Shared configs**: ESLint, Prettier, TypeScript

---

## Data Models

### Question (from Markdown)
```
- id: string (unique identifier)
- text: string (the question)
- answers: Answer[] (all possible answers)
- correctAnswerIds: string[] (which answers are correct)
- difficulty: 'easy' | 'medium' | 'hard'
- topics: string[]
- tags: string[]
- timeLimit?: number (optional override)
```

### Session
```
- id: string (UUID)
- pin: string (6-digit code)
- hostToken: string (secret for host operations)
- status: 'lobby' | 'playing' | 'finished'
- currentQuestionIndex: number
- questionStartedAt: timestamp
- createdAt: timestamp
```

### Player
```
- id: string (UUID)
- sessionId: string
- nickname: string
- score: number
- joinedAt: timestamp
```

### PlayerAnswer
```
- id: string
- playerId: string
- questionId: string
- selectedAnswerIds: string[]
- submittedAt: timestamp
- score: number
```

---

## Question Bank Markdown Format

```markdown
# Question Bank: [Bank Name]

## Metadata
- **Topics**: topic1, topic2
- **Default Time Limit**: 20s

---

## Questions

### Q001
**Difficulty**: easy
**Topics**: geography
**Tags**: capitals, europe

What is the capital of France?

- [x] Paris
- [ ] London
- [ ] Berlin
- [ ] Madrid

---

### Q002
**Difficulty**: medium
**Topics**: science
**Tags**: biology, cells

Which of the following are parts of a cell? (Select all that apply)

- [x] Nucleus
- [x] Mitochondria
- [ ] Transistor
- [x] Cell membrane
- [ ] Capacitor

---
```

---

## API Design (REST + Polling)

### Host Endpoints
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session state (with host token)
- `POST /api/sessions/:id/start` - Start the quiz
- `POST /api/sessions/:id/next` - Advance to next question
- `POST /api/sessions/:id/end` - End the quiz
- `GET /api/sessions/:id/leaderboard` - Get current leaderboard
- `GET /api/sessions/:id/question-stats` - Get question performance analytics (post-game)

### Player Endpoints
- `POST /api/sessions/join` - Join session with PIN
- `GET /api/sessions/:id/state` - Poll for current game state
- `POST /api/sessions/:id/answer` - Submit answer
- `GET /api/sessions/:id/results` - Get personal results

### Question Bank Endpoints
- `GET /api/question-banks` - List available question banks
- `GET /api/question-banks/:id` - Get question bank details

### Push Strategy (Yjs WebSocket)

- After every REST mutation, the server calls `updateDoc(sessionId, patch)` which fires a Yjs transaction.
- All connected WebSocket clients receive the binary delta immediately — no client polling required.
- A 5-second server heartbeat updates `serverTime` in every active session doc, keeping timers accurate.
- Clients connect to `ws://host/ws/sessions/:id?playerId=…` (players) or `?hostToken=…` (hosts).
- The Yjs doc is **ephemeral** — rebuilt from DB if the server restarts and a client reconnects.
- `correctAnswerIds` are **never** placed in the Yjs doc (security boundary — host fetches them via REST).

---

## Security Considerations

- **Host token**: Secret token required for host operations (not the PIN)
- **Rate limiting**: Prevent polling abuse
- **Input validation**: Strict validation on all inputs
- **PIN collision**: Ensure unique PINs for active sessions
- **Answer timing**: Server-side timestamp validation

---

## Technical Decisions & History

### Database ORM Migration (Feb 10, 2026)

**Migrated from**: Drizzle ORM v0.29 + better-sqlite3  
**Migrated to**: Prisma ORM v6.19 + @prisma/client

**Rationale**:
- Eliminated native module rebuild issues with better-sqlite3 in dev containers
- Improved developer experience with Prisma's declarative schema language
- Better TypeScript integration with auto-generated Prisma Client
- Simplified database operations with intuitive API

**Implementation Details**:
- Schema defined in `prisma/schema.prisma` using Prisma Schema Language
- BigInt types for timestamps (JavaScript milliseconds)
- Cascading deletes for player/session relationships
- Lazy Prisma Client initialization for test environment compatibility
- In-memory SQLite databases for unit tests with manual table creation
- 96% test pass rate achieved (45/47 tests passing)

**Migration Challenges Solved**:
- BIGINT column types required for JavaScript timestamp values
- Added missing `isCorrect` field to PlayerAnswer model
- Implemented `resetPrismaInstance()` for test isolation
- Fixed table recreation in shared cache mode (DROP before CREATE)
- BigInt → Number conversion for JSON API responses

---

## Future Enhancements

- Additional question types (true/false, open-ended, ordering)
- Team mode
- Custom themes and branding
- Import from other formats (CSV, JSON)
- Mobile app versions

## Implemented Features (formerly out of scope)

- ✅ User accounts and authentication (Better Auth, email/password + IMAP)
- ✅ Persistent quiz history and statistics (per-user analytics)
- ✅ Question bank editor UI (in-place editing in host-app)
- ✅ Admin user management (admin-app at /admin/)
