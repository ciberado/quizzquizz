---
name: quiz-bank-change
description: "Workflow for changing the Markdown question-bank format, parser, or validation logic in quizzquizz. Use when adding new question types, new frontmatter fields, updated parsing rules, or format validation changes that span packages/question-bank, packages/common, packages/api-server, and the question-banks/ fixture files. Covers parser change, contract update, fixture update, and test coverage."
argument-hint: "Describe the question-bank change, e.g. 'add a hint field' or 'support multi-image questions'"
---

# Quiz Bank Change Workflow

## When to Use

Load this skill when:
- Adding a new question type or optional field to the Markdown format.
- Changing how the parser tokenises or validates a question bank file.
- Updating the Zod schema for a `Question` or `QuestionBank` type.
- The change touches `packages/question-bank`, `packages/common`, or the API's bank-loading logic.

## Resources

- [Format reference](./references/format.md) — canonical Markdown question-bank format
- [Package map](./references/packages.md) — which files own which piece of the pipeline

---

## Procedure

### 1. Read the Format Spec

Read [`vibe/QUESTION-BANK-FORMAT.md`](../../vibe/QUESTION-BANK-FORMAT.md) in full before touching any code.
Confirm the change extends the format without breaking existing syntax.

### 2. Update the Zod Schema (`packages/common`)

- Locate the `Question` or related schema in `packages/common/src/types.ts`.
- Add new optional or required Zod fields.
- Keep backward compatibility: prefer `z.optional()` for additive changes.
- Infer the TypeScript type from the updated schema — do not duplicate it.
- Build: `npm run build -w @quizzquizz/common`.

### 3. Update the Parser (`packages/question-bank`)

- Locate the parsing logic (frontmatter extraction, checkbox detection, field mapping).
- Add parsing for the new field, producing the value expected by the updated schema.
- Return `undefined` / omit the field when it is absent, so existing banks still parse cleanly.
- Build: `npm run build -w @quizzquizz/question-bank`.

### 4. Update API Bank Loading (`packages/api-server`)

- If the API passes parsed questions through a response schema, update it to include the new field.
- If the API validates banks on upload (`POST /api/user-banks/upload`), ensure the validation accepts the new field.
- Build: `npm run build -w @quizzquizz/api-server`.

### 5. Update Fixture Files

- Add the new field to at least one existing fixture question bank under `question-banks/`.
- Do **not** modify files under `question-banks/user-quizzes/` — that is user data.
- Prefer editing a sample bank (`sample-general-knowledge.md` or a `science/` or `history/` bank).

### 6. Tests

1. **Unit tests** in `packages/question-bank/src/*.test.ts`:
   - Add a case asserting the new field is parsed correctly when present.
   - Add a case asserting the parser does not break when the field is absent.
2. **Common schema tests** in `packages/common/src/*.test.ts` if new validation logic was added.
3. **API integration** (optional): if the field is exposed via the API, add an E2E check in `e2e/bank-browser.spec.ts` or `e2e/question-preview.spec.ts`.
4. Run: `npm test -- --run`.

### 7. Update Documentation

- Update [`vibe/QUESTION-BANK-FORMAT.md`](../../vibe/QUESTION-BANK-FORMAT.md) with the new field syntax and an example.
- Add a `CHANGELOG.md` entry under `## [Unreleased]` using Conventional Commits style.

### 8. Final Build Check

```bash
npm run build
npm test -- --run
```

Both must pass before the change is considered complete.
