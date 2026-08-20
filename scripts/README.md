# scripts/

Standalone developer utilities for the QuizzQuizz monorepo.

## json-to-markdown.html

A zero-dependency browser tool that converts a JSON array of questions into a
question-bank Markdown file compatible with the
[`@quizzquizz/question-bank`](../packages/question-bank/) parser.

### Usage

1. Open `json-to-markdown.html` in a browser (double-click, or `file://`).
2. Paste a JSON array of question objects into the input box.
3. Set the bank name and default time limit.
4. Click **Generate Markdown**, then **Download .md**.

### Input shape

Each array element uses the question-bank-builder source schema:

```json
[
  {
    "code": "Q1",
    "question": "Question text…",
    "correct": ["The correct answer"],
    "incorrect": ["Wrong A", "Wrong B", "Wrong C"],
    "topics": [],
    "tags": [],
    "difficulty": null,
    "quality": null
  }
]
```

Field mapping:

- `code` → question id (`### Q1`). Whitespace becomes `-`; auto-assigned
  `Q1`, `Q2`, … when missing.
- `question` → question body.
- `correct` / `incorrect` → `- [x]` / `- [ ]` answer lines. Multiple correct
  answers are supported.
- `topics` / `tags` → per-question `**Topics**:` / `**Tags**:` lines; the
  bank-level `**Topics**:` is the deduplicated union.
- `difficulty` → only `easy` / `medium` / `hard` are valid; `normal`, `null`,
  or anything else becomes `medium`.
- `quality` → ignored (the runtime parser does not read it).

### Output

The generated Markdown follows the format documented in
[`vibe/QUESTION-BANK-FORMAT.md`](../vibe/QUESTION-BANK-FORMAT.md):

```markdown
# Question Bank: <name>

## Metadata
- **Topics**: …
- **Default Time Limit**: 30s

---

## Questions

### Q1
**Difficulty**: medium
**Topics**: …
**Tags**: …

Question text…

- [x] Correct answer
- [ ] Wrong answer

---
```
