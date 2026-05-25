# Phase 13: User Quiz Upload — Implementation Plan

**Status**: ✅ COMPLETE (Mar 13, 2026)  
**Prerequisites**: Phase 9 (Auth) ✅, Phase 7A (Bank Browser) ✅
**Estimated effort**: 4–6 hours total (13A: 2–3 h, 13B: 2–3 h)

---

## Overview

Allow authenticated users to upload quiz banks (Markdown `.md` files) to a dedicated
per-user directory inside the existing `question-banks/` tree.  Uploaded banks are
immediately hot-loaded and visible to everyone (no per-user visibility filtering yet).

The UI lives inside the existing bank-browser so the flow is natural: browse → upload
next to where you play.

---

## Design Decisions

### Storage: inside `question-banks/user-quizzes/<userId>/`

User banks are stored under `question-banks/user-quizzes/<userId>/<folder>/<file>.md`.
Putting them inside the `question-banks/` root means:

- **Zero changes** to the loader, `state.ts`, or reload logic — everything already
  recurses the tree.
- Bank IDs are stable relative paths like
  `user-quizzes/<userId>/chemistry/acids-bases`.
- The `/api/question-banks` folder tree already exposes them automatically.
- The existing `POST /api/question-banks/reload` endpoint (and `reload-question-banks.sh`)
  picks them up without modification.

### Reload: in-process, not via HTTP

The upload handler calls the reload logic **directly** (same process), not via an HTTP
round-trip.  This closes the race window between write and read.  A simple async mutex
(single-promise chain) serialises concurrent uploads so the in-memory map is never
partially updated.

```
upload request  →  acquire mutex  →  write file  →  reload()  →  release mutex  →  respond
```

If a second upload arrives while the first reload is running it awaits the same mutex
without 503-ing the client.

### Validation: reject with structured errors

Before writing to disk, parse the content with `@quizzquizz/question-bank`'s parser.
Return HTTP 422 with a JSON array of `{ line, message }` errors if parsing fails or
if the bank has zero questions.

### Path security

- Folder name and file name are sanitised: only alphanumeric, `-`, `_`, `.` allowed;
  no path separators, no leading dots.
- After `path.join`, the resolved absolute path is checked to confirm it starts with
  the user's directory — hard guard against traversal even if sanitisation is bypassed.

### File uniqueness

If the resolved `.md` file already exists the API returns `409 Conflict`.  Overwrite,
versioning, and rename are deferred to a later phase.

### Claude prompt (clipboard)

A static prompt string is copied to the clipboard when the user clicks the button.
It instructs Claude to produce a valid QuizzQuizz Markdown bank from pasted text and
embeds the full format spec (including the EBNF grammar summary).  No user text is
sent anywhere — the user pastes the source material into Claude directly after copying.

---

## Phase 13A — Backend API (2–3 h)

### New files

| File | Purpose |
|------|---------|
| `packages/api-server/src/routes/user-banks.ts` | Upload + list routes |
| `packages/api-server/src/routes/user-banks.test.ts` | Unit + integration tests |
| `packages/api-server/src/upload-mutex.ts` | Tiny async mutex for serialised reload |

### API endpoints

#### `POST /api/user-banks/upload`

**Auth**: `requireAuth`

```jsonc
// Request body (JSON)
{
  "folder": "chemistry",          // free-form; sanitised server-side
  "filename": "acids-and-bases",  // no extension; sanitised server-side
  "content": "# Question Bank: ..."  // raw markdown string
}
```

**Steps:**
1. Validate auth → 401 if missing.
2. Sanitise `folder` and `filename` (regex `^[a-zA-Z0-9_\-. ]+$`, trimmed, max 80 chars
   each; replace spaces with `-`).
3. Construct target path:
   `<QUESTION_BANKS_PATH>/user-quizzes/<userId>/<folder>/<filename>.md`
4. Resolve absolute path; assert it starts with the user's directory → 400 if not.
5. Parse content with `parseQuestionBank(content, virtualId)` from
   `@quizzquizz/question-bank`.
6. If parse errors or `questions.length === 0` → return `422` with
   `{ errors: [{ line, message }] }`.
7. Acquire upload mutex.
8. If file already exists → `409 Conflict`.
9. `fs.mkdirSync(dir, { recursive: true })` + write file.
10. Run in-process reload (shared logic extracted from the `/reload` route handler).
11. Release mutex.
12. Return `201` with the new bank summary `{ id, name, questionCount, path }`.

**Error responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing/invalid field, path traversal attempt |
| 401 | Not authenticated |
| 409 | File already exists |
| 422 | Markdown format errors (body contains `errors` array) |
| 500 | Filesystem or reload failure |

#### `GET /api/user-banks/mine`

**Auth**: `requireAuth`

Returns the folder subtree rooted at `user-quizzes/<userId>/` from the live bank tree.
Useful for the "My Quizzes" view.

```jsonc
// Response
{
  "userId": "...",
  "folder": { /* QuestionBankFolder subtree */ }
}
```

### Reload extraction

Extract the reload body from `question-banks.ts` into a shared helper
`src/reload-banks.ts`:

```typescript
export async function reloadQuestionBanks(questionBanksPath: string): Promise<ReloadResult>
```

Both the existing `/reload` route and the new upload handler call this.  The mutex in
`upload-mutex.ts` wraps uploads only (the admin reload endpoint is a separate operation;
document this in the mutex module).

### Tests (target: 15–20 tests)

- Upload: happy path, duplicate file, bad folder name, path traversal, bad markdown,
  zero questions, not authenticated.
- List: own banks returned, other user's banks not in result, not authenticated.
- Reload integration: bank appears in in-memory map after upload.

---

## Phase 13B — Host App UI (2–3 h)

### New Web Component: `<qz-upload-quiz-modal>`

File: `packages/host-app/src/components/upload-quiz-modal.ts`

A modal dialog with:

1. **Folder name** — text input (placeholder: `e.g. chemistry`).
2. **File name** — text input (placeholder: `e.g. acids-and-bases`; no extension shown).
3. **Content area** — dual-mode:
   - Large `<textarea>` for paste.
   - `<input type="file" accept=".md,text/plain">` file picker; selecting a file reads
     it via `FileReader` and populates the textarea.
4. **"Copy Claude Prompt" button** — `navigator.clipboard.writeText(CLAUDE_PROMPT)`.
   Brief visual confirmation ("Copied!") for 2 s.
5. **Error area** — displays validation errors returned by the API (`422`).
6. **Submit button** — "Upload Quiz".  Disabled while request is in-flight.
7. **Cancel / close button**.

The component dispatches a `quiz-uploaded` custom event on success so the bank browser
can refresh.

### Claude prompt constant

```
You are a quiz content creator. Your task is to convert the text I will provide into a
QuizzQuizz Markdown quiz bank.

OUTPUT FORMAT (follow exactly):

# Question Bank: <Descriptive Title>

## Metadata
- **Topics**: <topic1>, <topic2>
- **Default Time Limit**: 20s
- **Description**: <one sentence>

---

## Questions

### Q001
**Difficulty**: medium
**Topics**: <topic>
**Tags**: <tag1>, <tag2>

<Question text ending in "?">

- [ ] Wrong answer A
- [x] Correct answer
- [ ] Wrong answer B
- [ ] Wrong answer C

---

### Q002
... (continue pattern)

RULES:
- Use [x] for correct answers, [ ] for incorrect ones
- Each question needs 3–6 answer options, exactly one or more marked [x]
- Difficulties: easy | medium | hard
- Question IDs must be unique and sequential (Q001, Q002, …)
- Aim for at least 8 questions
- Do NOT include any text outside the format above

Now convert this text:

[PASTE YOUR TEXT HERE]
```

### Changes to `bank-browser.ts`

1. Import `UploadQuizModal` and the auth state helper.
2. Add an "Upload Quiz" toolbar button rendered only when the user is logged in
   (check `authState.user !== null`).
3. On button click → open `<qz-upload-quiz-modal>`.
4. On `quiz-uploaded` event → call `clearBankTreeCache()` then `this.refresh()` to
   re-fetch the folder tree.

### Visual placement

The button sits in the bank browser's top toolbar, right-aligned, alongside any
existing toolbar controls.  It is hidden (CSS `display:none`) when `authState.user`
is null so anonymous hosts see no change.

---

## Security checklist

- [x] All upload endpoints behind `requireAuth`
- [x] Path sanitisation + absolute-path assertion (traversal guard)
- [x] Content parsed/validated before any disk write
- [x] No shell execution — pure `fs` Node APIs only
- [x] File size limit: reject content > 500 KB (configurable via `MAX_UPLOAD_KB` env)
- [x] MIME/extension enforcement: only `.md` written regardless of uploaded file type
- [x] Folder depth: max 2 levels deep (`folder/filename`) — no nested subdirs in this phase

---

## File size limit

Reject uploads where `content.length > (MAX_UPLOAD_KB ?? 500) * 1024` bytes before
parsing or touching the filesystem.  Return `413 Payload Too Large`.

---

## Out of scope (future phases)

- Overwriting / updating existing banks
- Deleting / renaming banks
- Per-user visibility (private banks)
- Versioning / history
- In-app editing of uploaded banks
- Import from URL

---

## Acceptance criteria

### 13A
- [ ] `POST /api/user-banks/upload` writes file and reloads banks atomically
- [ ] Invalid markdown returns 422 with per-error messages
- [ ] Duplicate file returns 409
- [ ] Path traversal attempts return 400 and write nothing
- [ ] `GET /api/user-banks/mine` returns correct subtree
- [ ] 15+ tests, all passing

### 13B
- [ ] "Upload Quiz" button visible only when logged in
- [ ] Textarea paste + file-picker both populate content field
- [ ] "Copy Claude Prompt" copies prompt and shows confirmation
- [ ] Validation errors from API displayed inline
- [ ] Successful upload triggers bank browser refresh
- [ ] Uploaded bank immediately selectable for a new session
