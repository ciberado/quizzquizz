# Phases 9-15: Future Vision (Post-MVP)

These phases represent the long-term direction of QuizzQuizz beyond the v1.0.0 MVP release.

---

## Phase 9: User Accounts & Persistence ✅ COMPLETE (Feb 21-22, 2026)

**Goal**: Allow users to create accounts and save quiz history.

**Implemented (Phases 9A–9E)**:
- [x] Authentication system (Better Auth library):
  - Email/password registration and login
  - Server-side session cookies (no JWT)
  - CSRF protection and rate limiting built-in
- [x] Roles: host and player; anonymous play still the default
- [x] User profile endpoint (`GET /api/users/me`)
- [x] Saved quizzes CRUD (`saved_quizzes` table)
- [x] Quiz history endpoints (`GET /api/users/me/history`, `GET /api/users/me/stats`)
- [x] `hosted_sessions` table: records each time the user hosted a session (recorded at session end)
- [x] `player_stats` table: records final score, rank, total correct/total questions per session played
- [x] Auth UI in host-app and player-app (sign-in / sign-up / profile flows)
- [x] Host-app: saved quiz management, history page
- [x] Player-app: optional sign-in before joining; stats recorded for authenticated players

**Known gap**: ~~`hosted_sessions` and `player_stats` records are **never actually written** from real game flow (only from test fixtures). Session finish logic (`POST /:id/next` last question, `POST /:id/end`) does not call any stat-recording code yet.~~ **Resolved in Phase 9F** — `recordSessionStats()` is now called at both trigger points.

**Deliverable**: Users can register, save custom quizzes, and view their history.

---

## Phase 9F: Granular Question Statistics & Post-Game Stat Recording ✅ COMPLETE (Mar 1, 2026)

**Goal**: Actually persist stats when games end, and track performance at the individual-question level so users know which questions they repeatedly struggle with and question authors can see real-world difficulty data.

**Implemented**:
- [x] `recordSessionStats(sessionId)` helper — idempotent, called at both session-end trigger points
- [x] `HostedSession` + `PlayerStat` written from real game flow (closed the known gap from 9E)
- [x] `responseTimeMs` column on `player_answers` — calculated server-side from `questionStartedAt`
- [x] `UserQuestionStat` model — per-user × per-question counters, rolling avg response time, `practiceWeight` (spaced-repetition weight, clamped 0.1–5.0)
- [x] `QuestionGlobalStat` model — `timesAppeared`, `timesAnswered`, `timesCorrect`, `answerSelections` JSON, `empiricalDifficulty` (computed once ≥10 answers)
- [x] `GET /api/users/me/question-stats?bankId=&limit=&offset=` — sorted weakest-first
- [x] `GET /api/users/me/weak-topics` — accuracy by topic across all answered questions
- [x] `GET /api/question-banks/:id/stats` — per-question stats with dominant distractor detection and `flagDifficultyMismatch` (empirical vs declared diverges > 0.3)
- [x] **Bug fix**: cross-bank question ID collision — unique constraints widened to `(questionBankId, questionId)` via migration `20260301180000_fix_question_stat_cross_bank_scoping`
- [x] **Infrastructure fix**: Prisma TS type resolution under `moduleResolution: bundler` — generator `output = "../src/generated/prisma"` bypasses broken `.prisma/client` package.json exports map
- [x] 33 tests in `session-stats.test.ts` including cross-bank collision prevention suite; full api-server suite 193/195

**Deliverable**: Every game completion writes complete stats. Users see which questions they struggle with; question bank authors see real-world difficulty and distractor effectiveness.

---

### Original design (for reference)

### Why question-level granularity matters

The existing `player_stats` table saves aggregate totals per session (e.g. "8/10 correct"). That is useful for leaderboard history but loses signal: if a user has played the same question bank five times, there is no way to know *which* questions they keep getting wrong. Similarly, a question declared "easy" may have a real-world accuracy of 30 % across hundreds of players — the declared difficulty is unreliable.

Tracking at question level unlocks:
- **Weak-area detection** – "You got History questions right only 40 % of the time"
- **Smart practice mode** – reweight questions the user repeatedly misses
- **Difficulty calibration** – flag questions whose empirical accuracy diverges from their declared difficulty
- **Question bank quality signals** – identify ambiguous or misleading questions

---

### 9F-1: Write stats when a session finishes

**Trigger points** (both must record stats):
- `POST /api/sessions/:id/next` when `nextIndex >= questions.length` (natural end)
- `POST /api/sessions/:id/end` (host force-ends)

**Logic** (runs inside `recordSessionStats(sessionId)`):

```typescript
// For hosted sessions (if session.userId is set)
await prisma.hostedSession.create({
  data: {
    userId: session.userId,
    sessionId: session.id,
    questionBankId: session.questionBankId,
    questionBankName: <loaded from question bank>,
    totalPlayers: players.length,
    totalQuestions: questions.length,
    completedAt: new Date(),
  },
});

// For each player who was authenticated
for (const player of players) {
  if (!player.userId) continue;           // skip anonymous players
  const answers = await prisma.playerAnswer.findMany({ where: { playerId: player.id } });
  const rank = sortedPlayers.findIndex(p => p.id === player.id) + 1;
  const correct = answers.filter(a => a.isCorrect).length;
  const avgTimeMs = answers.reduce((s, a) => s + a.responseTimeMs, 0) / (answers.length || 1);

  await prisma.playerStat.create({
    data: {
      userId: player.userId,
      sessionId: session.id,
      nickname: player.nickname,
      finalScore: player.score,
      finalRank: rank,
      correctAnswers: correct,
      totalQuestions: questions.length,
      averageTime: avgTimeMs,
      playedAt: new Date(),
    },
  });
}
```

---

### 9F-2: New table – `UserQuestionStat`

Tracks how a specific **authenticated user** performed on a specific **question** across all sessions.

```prisma
model UserQuestionStat {
  id                String    @id
  userId            String    @map("user_id")
  questionId        String    @map("question_id")       // stable question ID from question bank
  questionBankId    String    @map("question_bank_id")  // which bank the question belongs to
  timesAnswered     Int       @default(0) @map("times_answered")
  timesCorrect      Int       @default(0) @map("times_correct")
  averageResponseMs Int       @default(0) @map("average_response_ms")
  lastAnsweredAt    DateTime? @map("last_answered_at")
  lastWasCorrect    Boolean   @default(false) @map("last_was_correct")
  // Spaced-repetition weight: multiplied by 1.5 on wrong, by 0.8 on correct.
  // Minimum 0.1, maximum 5.0. Used by a future "practice mode" to surface
  // questions the user consistently struggles with.
  practiceWeight    Float     @default(1.0) @map("practice_weight")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId])
  @@index([userId, questionBankId])
  @@index([userId, lastAnsweredAt])
  @@map("user_question_stats")
}
```

**Populated at session end**: for every `playerAnswer` where `player.userId` is set, upsert the corresponding row (increment counters, update rolling average, recalculate `practiceWeight`).

---

### 9F-3: New table – `QuestionGlobalStat`

Tracks aggregate performance across **all players** for a given question, regardless of who played.

```prisma
model QuestionGlobalStat {
  id                  String   @id
  questionId          String   @unique @map("question_id")
  questionBankId      String   @map("question_bank_id")
  timesAppeared       Int      @default(0) @map("times_appeared")  // sessions that included this Q
  timesAnswered       Int      @default(0) @map("times_answered")  // actual answers submitted
  timesCorrect        Int      @default(0) @map("times_correct")
  averageResponseMs   Int      @default(0) @map("average_response_ms")
  averageScore        Int      @default(0) @map("average_score")
  // JSON map { answerId → selectionCount } – incremented per submission.
  // Reveals which distractors mislead players most.
  answerSelections    String   @default("{}") @map("answer_selections")
  // Derived from timesCorrect / timesAnswered; null until ≥10 answers.
  // Values: 0.0 (never correct) – 1.0 (always correct).
  // Low value = harder in practice than declared; high value = easier.
  empiricalDifficulty Float?   @map("empirical_difficulty")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([questionBankId])
  @@map("question_global_stats")
}
```

**Populated at session end**: for every question that *appeared* in the session, increment `timesAppeared`. For every `playerAnswer` submitted, increment `timesAnswered`, `timesCorrect` (if correct), roll the `averageResponseMs`, update `answerSelections` JSON, and recompute `empiricalDifficulty` (once ≥ 10 answers).

---

### 9F-4: New API endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/users/me/question-stats?bankId=&limit=&offset=` | Required | Authenticated user's per-question breakdown (sorted by accuracy ASC = weakest first) |
| `GET /api/users/me/weak-topics` | Required | Aggregated accuracy by topic/tag across all questions the user has answered |
| `GET /api/question-banks/:id/stats` | Optional (host-only for detailed view) | Global stat per question: times appeared, accuracy, `answerSelections`, empirical difficulty |

**`GET /api/users/me/weak-topics` response example**:
```json
{
  "topics": [
    { "topic": "History", "timesAnswered": 40, "timesCorrect": 16, "accuracy": 0.40 },
    { "topic": "Science", "timesAnswered": 25, "timesCorrect": 21, "accuracy": 0.84 }
  ]
}
```

---

### 9F-5: Additional useful dimensions to capture

These come "for free" once the infrastructure is in place:

- **Historical accuracy trend** (`GET /api/users/me/history` already returns per-session stats)  
  Plot `correctAnswers / totalQuestions` over time → is the user improving?

- **`responseTimeMs` per `PlayerAnswer`**  
  Currently `player_answers` does not store the response time explicitly (only `submittedAt`). Add a `responseTimeMs INT` column populated from `(submittedAt - session.questionStartedAt)` at submission time. This makes per-question speed analysis cheap without recalculation.

- **Empirical difficulty divergence alert**  
  When `empiricalDifficulty` diverges from declared difficulty by > 0.3 (e.g., declared `easy` but empirical 0.25), surface this in the host's question-bank stats view so bank authors can recalibrate.

- **"Deceiving distractor" detection**  
  A wrong answer that is selected more often than the correct answer is a "dominant distractor". Flag it in `QuestionGlobalStat` queries — useful for question quality review.

- **Answer-time histogram bucket** (optional, no extra storage)  
  `responseTimeMs` quartiles (p25/p50/p75) per question — reveals whether a question is "fast and risky" (split-second guesses) vs "slow and deliberate".

---

### 9F-6: Schema migration & backfill

1. Create Prisma migration for `UserQuestionStat` and `QuestionGlobalStat`
2. Add `responseTimeMs` column to `player_answers`
3. **No backfill possible** for historical sessions (anonymous play lacks `userId`); `QuestionGlobalStat` starts counting from first session after migration
4. Update `POST /:id/next` and `POST /:id/end` to call `recordSessionStats()` helper

**Deliverable**: ~~Every game completion writes complete stats.~~ ✅ Done — see implementation summary above.

---

## Phase 10: Additional Question Types (Est. 4-6 hours)

**Goal**: Support more question formats beyond multiple choice.

**Scope**:
- [ ] True/False questions:
  - New question type flag in markdown
  - 2-option UI variant
  - Simpler answer submission
- [ ] Text input questions:
  - Short answer questions (exact match or regex)
  - Case-insensitive matching option
  - Multiple acceptable answers support
  - Text input UI component
- [ ] Ordering questions:
  - "Put these in order" question type
  - Drag-and-drop interface
  - Scoring: partial credit for partial correctness
  - Answer validation (sequence matching)
- [ ] Image-based questions:
  - Embed images in questions (markdown: `![alt](url)`)
  - Image answers (click hotspots)
  - Gallery view for multiple images
  - Asset hosting (local or CDN)
- [ ] Markdown extensions:
  - New syntax for each question type
  - Backward compatibility
  - Parser updates
  - Validation for new formats
- [ ] UI updates:
  - Dynamic question renderer based on type
  - Type-specific answer components
  - Consistent styling across types

**Deliverable**: Diverse question types make quizzes more engaging and versatile.

---

## Phase 11: Team Mode & Collaboration (Est. 4-5 hours)

**Goal**: Enable team-based competition.

**Scope**:
- [ ] Team creation:
  - Teams configured by host before start
  - Auto-assign or manual team selection
  - Team names and colors
  - 2-8 teams, 1-10 players per team
- [ ] Team gameplay:
  - Team members see each other's status
  - Team score = sum or average of member scores
  - Team leaderboard view
  - Collaborative answer (vote/consensus)
- [ ] UI changes:
  - Team badges/colors in lobby
  - Team leaderboard view
  - Player list grouped by team
  - Team-specific results screen
- [ ] Database updates:
  - teams table
  - team_members join table
  - Team score calculation
  - Team-based leaderboard queries
- [ ] Co-host feature:
  - Multiple hosts for same session
  - Role-based permissions (advance questions, manage players)
  - Host chat for coordination

**Deliverable**: Classes can compete in teams, fostering collaboration.

---

## Phase 12: Advanced Analytics & Insights (Est. 3-4 hours)

**Goal**: Provide detailed analytics for hosts and players.

**Scope**:
- [x] **Host question analytics** (COMPLETE - Feb 11, 2026):
  - [x] Question accuracy analysis (% correct/incorrect per question)
  - [x] Total responses per question
  - [x] Sortable by question order or accuracy
  - [x] Expandable details with full question text
  - [x] Difficulty badge and topic tags display
  - [x] Answer option breakdown (selection count & percentage per option)
  - [x] Color-coded accuracy visualization (bars + percentages)
  - [x] Compact horizontal layout (stats left, badges right)
  - [x] API: `GET /api/sessions/:id/question-stats` with host token auth
  - [x] Component: `question-stats-table` custom element
  - [x] E2E test: 27 steps validating all functionality
- [ ] Remaining host analytics:
  - Time taken per question (avg, min, max) — requires `responseTimeMs` column added in Phase 9F
  - Player performance distribution
  - Export results to CSV/JSON
  - Empirical difficulty divergence alerts (declared vs actual) — powered by `QuestionGlobalStat` from Phase 9F
  - Dominant distractor detection — wrong answer selected more than the correct answer
- [ ] Player insights (requires Phase 9F data):
  - Personal performance over time (accuracy trend across sessions)
  - Strengths and weaknesses by topic — `GET /api/users/me/weak-topics`
  - Comparison to global averages via `QuestionGlobalStat`
  - Improvement tracking (rolling 5-session average)
  - Practice mode — surface high-`practiceWeight` questions the user keeps missing
- [ ] Real-time stats:
  - Live dashboard during game
  - Answer distribution graphs
  - Response time histograms
  - Engagement metrics (% answered)
- [ ] Question bank statistics:
  - Most used questions
  - Highest/lowest success rates
  - Recommend difficulty adjustments
  - Tag effectiveness analysis
- [ ] Reporting:
  - Printable PDF reports
  - Email summaries post-quiz
  - Share results link
  - LMS integration (export to Moodle, Canvas)

**Deliverable**: Data-driven insights to improve teaching and learning.

---

## Phase 13: Public Question Bank Marketplace (Est. 6-8 hours)

**Goal**: Community-driven question sharing.

**Scope**:
- [ ] Question bank repository:
  - Upload custom question banks
  - Public vs private banks
  - Search by topic, difficulty, language
  - Rating and reviews system
  - Download/import banks
- [ ] Curation and moderation:
  - Report inappropriate content
  - Featured question banks
  - Quality badges (verified, popular)
  - Content guidelines enforcement
- [ ] Creator tools:
  - Web-based question bank editor
  - Markdown preview
  - Validation before upload
  - Version control for banks
  - Usage statistics for creators
- [ ] Discovery:
  - Browse by category
  - Trending banks
  - Recommendations based on history
  - Tags and filtering
- [ ] Integration:
  - Import from marketplace in host UI
  - One-click add to library
  - Auto-updates for subscribed banks

**Deliverable**: Community ecosystem with thousands of ready-to-use question banks.

---

## Phase 14: Mobile Apps (Native) (Est. 20+ hours)

**Goal**: Native mobile apps for better performance and features.

**Scope**:
- [ ] React Native or Flutter app:
  - iOS and Android support
  - Reuse API client logic
  - Native UI components
  - Push notifications (game starting)
  - Offline mode (view past results)
- [ ] Mobile-specific features:
  - Haptic feedback on actions
  - Camera integration (photo questions)
  - QR code scanner (join by scanning)
  - App shortcuts (rejoin last quiz)
- [ ] App store submission:
  - App store listings
  - Screenshots and descriptions
  - Privacy policy
  - Terms of service
  - Beta testing (TestFlight, Play Beta)

**Deliverable**: Native apps provide premium experience on mobile devices.

---

## Phase 15: Advanced Hosting Features (Est. 4-5 hours)

**Goal**: Professional features for educators and event organizers.

**Scope**:
- [ ] Scheduled quizzes:
  - Create quiz with start time
  - Email invitations with join link
  - Countdown to start in lobby
  - Auto-start at scheduled time
- [ ] Breakout sessions:
  - Split players into parallel quiz sessions
  - Different questions for each group
  - Merge results at the end
- [ ] Proctoring features:
  - Lock mode (prevent tab switching)
  - Webcam monitoring (optional)
  - Screen recording
  - Suspicious activity alerts
- [ ] White-label branding:
  - Custom logos and colors
  - Custom domain support
  - Remove "Powered by QuizzQuizz"
  - Organization branding
- [ ] Integration APIs:
  - Webhooks for events (quiz created, completed)
  - REST API for external tools
  - SSO integration (SAML, OAuth)
  - LMS plugins (Moodle, Canvas, Blackboard)

**Deliverable**: Enterprise-ready platform for schools and organizations.
