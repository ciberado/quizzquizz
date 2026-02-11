# QuizzQuizz - Project Overview

## Vision

QuizzQuizz is a real-time, competitive quiz platform inspired by Kahoot. A host creates quiz sessions from markdown-based question banks, players join via PIN codes, and compete for the highest score on a live leaderboard. The system prioritizes simplicity over complexity—using REST APIs with polling instead of WebSockets, vanilla TypeScript with Web Components instead of heavy frameworks, and SQLite for persistence.

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

#### `@quizzquizz/api-server`
- REST API endpoints
- SQLite database with Prisma ORM (type-safe, developer-friendly)
- Session management (create, join, state transitions)
- Game state management
- Polling endpoints for real-time updates

#### `@quizzquizz/host-app`
- Web Components-based SPA
- Session creation and configuration
- Question bank browser
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

---

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (lightweight, fast)
- **Database**: SQLite with Prisma v6 ORM (type-safe, auto-generated client)
- **Validation**: Zod

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

### Polling Strategy
- Players poll `/api/sessions/:id/state` every 1-2 seconds
- Response includes: session status, current question (if playing), time remaining
- ETag or version number to minimize data transfer when no changes

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

## Future Enhancements (Out of Initial Scope)

- User accounts and authentication
- Persistent quiz history and statistics
- Additional question types (true/false, open-ended, ordering)
- Team mode
- Custom themes and branding
- Question bank editor UI
- Import from other formats (CSV, JSON)
- WebSocket option for lower latency
- Mobile app versions
