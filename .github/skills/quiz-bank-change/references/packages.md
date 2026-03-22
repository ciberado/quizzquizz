# Package Map — Question-Bank Pipeline

```
question-banks/*.md          ← fixture / sample files (source of truth for humans)
        │
        ▼
packages/question-bank/      ← parser: reads .md → structured Question[]
  src/parser.ts              ← tokenises headings, list items, metadata lines
  src/loader.ts              ← loads files from disk, calls parser
  src/index.ts               ← public API exported to consumers
        │
        ▼
packages/common/             ← Zod schemas and TypeScript types
  src/types.ts               ← Question, QuestionBank, Answer schemas
  src/utils.ts               ← scoring formula, PIN generation (unrelated to format)
        │
        ▼
packages/api-server/         ← consumes parsed questions; validates on upload
  src/index.ts               ← bank reload endpoint, upload endpoint
  src/question-bank-loader.ts (or equivalent) ← integrates @quizzquizz/question-bank
        │
        ▼
packages/host-app /          ← renders questions (reads via API, does not parse directly)
packages/player-app
```

## Ownership Rules

| Concern | Owner |
|---------|-------|
| Markdown syntax rules | `vibe/QUESTION-BANK-FORMAT.md` |
| Parsing implementation | `packages/question-bank` |
| Shared type contracts | `packages/common` |
| Runtime validation / upload guard | `packages/api-server` |
| Sample/fixture data | `question-banks/` (not `user-quizzes/`) |
| User-uploaded data | `question-banks/user-quizzes/` — treat as user data, never edit |
