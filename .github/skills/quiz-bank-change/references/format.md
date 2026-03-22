# Question-Bank Markdown Format Reference

For the authoritative specification see [`vibe/QUESTION-BANK-FORMAT.md`](../../../vibe/QUESTION-BANK-FORMAT.md).

Key rules to remember when changing the parser:

- Each question block begins with `# Question <n>` (heading level 1).
- The question text is an h2: `## <text>`.
- Answer choices are list items. Correct answers use `- [x]`; wrong answers use `- [ ]`.
- Optional metadata lines follow the answers:
  - `**Difficulty**: easy | medium | hard`
  - `**Topics**: <comma-separated>`
  - `**Tags**: <comma-separated>`
  - `**Time Limit**: <seconds>`
- Fields are optional and positional — the parser must not require their presence.
- New fields should follow the same `**FieldName**: value` pattern and be added after existing metadata.

## Example

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
