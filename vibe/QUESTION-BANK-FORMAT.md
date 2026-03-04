# Question Bank File Format

Question banks are plain Markdown files stored in the `question-banks/` directory.  
The file name (without `.md`) becomes the bank's `id` (e.g. `sample-general-knowledge.md` → id `sample-general-knowledge`).

---

## Grammar (EBNF)

```ebnf
(* ─── Top-level structure ─────────────────────────────────────────── *)

bank             = title NL+ metadata_section NL* HR NL* questions_section ;

title            = "# Question Bank: " bank_name NL ;
bank_name        = TEXT ;                     (* free text, becomes metadata.name *)

(* ─── Metadata section ─────────────────────────────────────────────── *)

metadata_section = "## Metadata" NL metadata_line+ ;

metadata_line    = "- **Topics**: "       topic_list NL
                 | "- **Default Time Limit**: " time_value NL
                 | "- **Description**: "  TEXT NL
                 ;

topic_list       = WORD { ", " WORD } ;   (* comma-separated; populates metadata.topics *)
time_value       = DIGITS "s" | DIGITS ;  (* seconds; default 20 if omitted *)

(* ─── Questions section ─────────────────────────────────────────────── *)

questions_section = "## Questions" NL+ question+ ;

question         = question_header NL+
                   question_attrs
                   question_text NL+
                   answer_list NL*
                   HR? NL*
                 ;

question_header  = "### " question_id ;
question_id      = WORD ;   (* free token – used as Question.id, e.g. "Q001" *)

(* ─── Per-question attributes (all optional except Difficulty) ──────── *)

question_attrs   = attr_difficulty
                   attr_topics?
                   attr_tags?
                   attr_time_limit?
                 ;

attr_difficulty  = "**Difficulty**: " difficulty NL ;
difficulty       = "easy" | "medium" | "hard" ;   (* default: "medium" if omitted *)

attr_topics      = "**Topics**: "     topic_list NL ;
attr_tags        = "**Tags**: "       tag_list   NL ;
attr_time_limit  = "**Time Limit**: " time_value NL ;  (* overrides bank default *)

tag_list         = WORD { ", " WORD } ;

(* ─── Question body ─────────────────────────────────────────────────── *)

question_text    = TEXT_LINE+ ;   (* one or more plain-text lines; joined with a space *)

answer_list      = answer+ ;
answer           = answer_correct | answer_wrong ;

answer_correct   = "- [x] " answer_text NL ;  (* "x" = correct; case-insensitive *)
answer_wrong     = "- [ ] " answer_text NL ;

answer_text      = TEXT ;   (* answer id is auto-generated: "<question_id>_A<n>" *)

(* ─── Terminals ─────────────────────────────────────────────────────── *)

HR               = "---" NL ;
NL               = "\n" ;
WORD             = [^\s,]+ ;
DIGITS           = [0-9]+ ;
TEXT_LINE        = [^\n]+ NL ;
TEXT             = [^\n]+ ;
```

---

## Annotated Example

```markdown
# Question Bank: General Knowledge          ← bank name

## Metadata
- **Topics**: geography, science, history   ← topics list (comma-separated)
- **Default Time Limit**: 20s               ← seconds; applies to every question
- **Description**: Mixed trivia questions   ← optional free text

---

## Questions

### Q001                             ← question id (used as Question.id)
**Difficulty**: easy                 ← easy | medium | hard
**Topics**: geography                ← narrows down topic for this question
**Tags**: capitals, europe           ← arbitrary labels for filtering

What is the capital of France?       ← question text (one or more lines)

- [x] Paris                          ← correct answer  (id: Q001_A1)
- [ ] London                         ← wrong answer    (id: Q001_A2)
- [ ] Berlin                         ←                 (id: Q001_A3)
- [ ] Madrid                         ←                 (id: Q001_A4)

---

### Q002
**Difficulty**: medium
**Topics**: science
**Tags**: biology, multiple-correct
**Time Limit**: 30s                  ← per-question override of bank default

Which of the following are parts of a cell? (Select all that apply)

- [x] Nucleus
- [x] Mitochondria
- [ ] Transistor
- [x] Cell membrane
- [ ] Capacitor

---
```

---

## Rules & Constraints

### Bank level

| Field | Required | Default | Notes |
|---|---|---|---|
| `# Question Bank: <name>` | **yes** | — | First H1 in the file |
| `## Metadata` section | **yes** | — | Must appear before `## Questions` |
| `## Questions` section | **yes** | — | Must contain at least one question |
| **Topics** | no | `[]` | Comma-separated list |
| **Default Time Limit** | no | `20` | Seconds; numeric value only |
| **Description** | no | — | Single line |

### Question level

| Field | Required | Default | Constraints |
|---|---|---|---|
| `### <id>` header | **yes** | — | Any non-whitespace token; must be unique within the file |
| **Difficulty** | no | `medium` | One of `easy`, `medium`, `hard` |
| **Topics** | no | `[]` | Comma-separated |
| **Tags** | no | `[]` | Comma-separated |
| **Time Limit** | no | bank default | Per-question override in seconds |
| Question text | **yes** | — | One or more plain-text lines between attrs and answers |
| Answers | **yes** | — | At least one answer total |
| Correct answers (`[x]`) | **yes** | — | At least one answer marked `[x]` |

### Answer IDs

Answer ids are generated automatically by the parser:

```
<question_id>_A<n>    where n = 1-based index of the answer in declaration order
```

Example: the third answer under `Q007` gets id `Q007_A3`.

### Single-correct vs. multi-correct

The format makes no syntactic distinction — the number of `[x]` answers determines behaviour:

- **Exactly one** `[x]` → single-correct question (radio)  
- **Two or more** `[x]` → multi-select question (checkbox); full points only if the player selects *all* correct answers and *no* wrong ones

Hint text like `"(Select all that apply)"` is purely cosmetic and has no effect on parsing.

---

## Parser behaviour

The parser (`@quizzquizz/question-bank`) follows these rules:

1. Splits the file on `^### ` to extract individual question sections.
2. Reads `**Key**: value` attribute lines at the top of each section.
3. Everything between the last attribute line and the first `- [` line is the question text (multiple lines are joined with a space).
4. Validates the resulting objects against the `QuestionSchema` Zod schema; malformed questions are **skipped with a warning** (the rest of the bank still loads).
5. The entire bank is then validated against `QuestionBankSchema`; failure throws.

---

## File naming

```
question-banks/
  <bank-id>.md
```

- Lowercase, hyphen-separated names recommended (`my-movie-trivia.md`).
- The filename stem becomes the bank's `id` as-is (for flat layouts with no subdirectories).
- All `.md` files under `question-banks/` (at any depth) are loaded automatically on server start.

---

## Directory organization (Phase 7F)

Question banks can be organized into **nested subdirectories**. The loader traverses the `question-banks/` tree recursively and builds a folder hierarchy that the host UI can browse.

### Bank ID with directories

The bank ID becomes the **relative path from the root**, using `/` as the separator, without the `.md` extension:

```
question-banks/
  sample-general-knowledge.md          →  id: "sample-general-knowledge"
  science/
    physics/
      electromagnetism.md              →  id: "science/physics/electromagnetism"
      mechanics.md                     →  id: "science/physics/mechanics"
    chemistry/
      organic-chemistry.md             →  id: "science/chemistry/organic-chemistry"
  history/
    world-war-ii.md                    →  id: "history/world-war-ii"
```

### Naming conventions for directories

- Lowercase, hyphen-separated directory names recommended.
- Directory basenames are used **as-is** as the folder label shown to the host — no automatic capitalization or transformation is applied. Name directories accordingly (e.g., prefer `science` or `general-knowledge` over `SCIENCE`).
- Nest as deeply as needed; there is no hard limit.
- The bare stems `bank`, `questions`, `stats`, and `reload` are **reserved** at any depth because they collide with fixed API route paths. Files named `bank.md`, `questions.md`, `stats.md`, or `reload.md` will be skipped by the loader with a warning.

### Symlinks

Soft links are fully supported. A symlink can point to either a `.md` file or a subdirectory:

```bash
# Add the same bank to a curated "Best Of" folder without duplicating the file
mkdir -p question-banks/best-of
ln -s ../science/physics/electromagnetism.md question-banks/best-of/electromagnetism.md
```

**ID resolution**: the bank's ID is derived from the **canonical real path** (resolved with `realpathSync`), made relative to the `question-banks/` root and stripped of the `.md` extension. The same physical file always gets the same ID regardless of which symlink reached it. Statistics (correct/incorrect counts, empirical difficulty) are therefore shared across all appearances of the bank in the tree.

**Out-of-root symlinks**: if a symlink's canonical path falls outside the `question-banks/` directory (e.g., an absolute symlink to an entirely different location on disk), that entry is **skipped** with a console warning and the rest of the tree loads normally.

**Circular symlink protection**: the loader tracks visited canonical directory real paths; a cycle is detected and that branch is silently skipped.

### Host UI navigation (Phase 7F)

The host app displays a **drill-down breadcrumb browser** on the session creation screen:

- The root level shows top-level folders (📁) and any banks living at the root (📋).
- Clicking a folder descends into it; the breadcrumb updates (`All Banks > Science > Physics`).
- Clicking a breadcrumb segment navigates back up to that level.
- Clicking a bank card opens the existing question preview screen.
- Folders display the total number of banks they contain recursively (e.g., "5 banks").

If the `question-banks/` directory has no subdirectories (flat layout), the browser skips the folder-navigation UI and shows a simple grid, identical to the pre-7F behaviour.
