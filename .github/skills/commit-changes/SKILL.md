---
name: commit-changes
description: "Workflow for committing staged or unstaged changes in the quizzquizz monorepo. Groups files by logical concern, runs relevant tests per group, updates CHANGELOG.md, optionally bumps all package.json versions (patch or minor), and produces Conventional Commit messages. Use whenever the user asks to commit, ship, or release work."
argument-hint: "Optional: 'patch' or 'minor' to bump versions before committing. Leave blank to auto-decide based on change type."
---

# Commit Changes Workflow

## When to Use

Load this skill when:
- The user asks to commit, push, or release current changes.
- The user mentions a patch or minor bump alongside committing.
- Multiple unrelated changes are staged and need to be split into focused commits.

---

## Procedure

### 0. Collect the argument

The optional argument is the version bump type: `patch`, `minor`, or absent (auto-decide).

```
bump = argument   # "patch" | "minor" | "" (auto)
```

If `bump` is absent but the user has asked for a version bump (e.g. "bump and commit", "release", "ship"), **auto-decide** the bump type by inspecting the changes:

- Use **`minor`** when any change introduces a new user-visible feature: new screen, new workflow, new API endpoint, new option, or any `feat` commit type.
- Use **`patch`** when all changes are bug fixes, styling tweaks, copy edits, refactors, test additions, or dependency updates — i.e. all `fix`, `chore`, `refactor`, `test`, `docs` commit types.
- Use **no bump** only when the user has not asked for one at all.

State the chosen bump type and the rationale (one sentence) before proceeding.

---

### 1. Inspect What Has Changed

```bash
git status --short
git diff --stat HEAD
```

List every modified or new file. Group them by the logical concern they belong to:

| Group label | Files that belong here |
|---|---|
| `common` | `packages/common/**` |
| `question-bank` | `packages/question-bank/**` |
| `api-server` | `packages/api-server/**` |
| `host-app` | `packages/host-app/**` |
| `player-app` | `packages/player-app/**` |
| `analytics` | `packages/analytics/**`, `packages/analytics-ui/**` |
| `question-bank-builder` | `packages/question-bank-builder/**` |
| `e2e` | `e2e/**` |
| `infra` | `Dockerfile`, `docker-compose*.yml`, `Caddyfile*`, `*.sh` |
| `config` | `.github/**`, `*.json` at root, `tsconfig*.json`, `.eslintrc*`, `.prettierrc*`, `AGENTS.md` |
| `docs` | `vibe/**`, `docs/**`, `*.md` at root (except `CHANGELOG.md`) |
| `changelog` | `CHANGELOG.md` |

A single file may belong to more than one group only if it is a shared contract file (`packages/common/**`). In that case, commit it with the group that drove the change.

---

### 2. Version Bump (if requested)

If `bump` is `patch` or `minor`, update **all** `package.json` files before doing anything else:

**Files to update:**
- `package.json` (root)
- `packages/common/package.json`
- `packages/question-bank/package.json`
- `packages/question-bank-builder/package.json`
- `packages/api-server/package.json`
- `packages/host-app/package.json`
- `packages/player-app/package.json`
- `packages/analytics/package.json`
- `packages/analytics-ui/package.json`

Use `npm version` per package **or** edit them manually. The new version must be identical across all packages (monorepo-wide bump).

```bash
# Derive current version from root
CURRENT=$(node -p "require('./package.json').version")

# Compute next version with semver
NEXT=$(node -e "
  const [maj, min, pat] = '$CURRENT'.split('.').map(Number);
  const bump = '$bump';
  if (bump === 'minor') console.log(maj + '.' + (min+1) + '.0');
  else console.log(maj + '.' + min + '.' + (pat+1));
")

echo "Bumping $CURRENT → $NEXT"

# Apply to every package.json
for pkg in package.json packages/*/package.json; do
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
    p.version = '$NEXT';
    fs.writeFileSync('$pkg', JSON.stringify(p, null, 2) + '\n');
  "
done
```

After bumping, add all modified `package.json` files to the version-bump commit group (see step 4).

---

### 3. Update CHANGELOG.md

Before committing any code, insert a new entry (or append to `## [Unreleased]`) in `CHANGELOG.md`:

- If a version bump was requested, promote `## [Unreleased]` to `## [<NEXT>] — <today's date>` and insert a fresh empty `## [Unreleased]` above it.
- If no bump, add bullet points under `## [Unreleased]`.

Entry format (mirror the existing style):
```markdown
- **[<group>]** <present-tense description of what changed and why>
```

Write one bullet per logical change, not one per file. Use `Added`, `Changed`, `Fixed`, or `Removed` sub-headings as appropriate.

---

### 4. Run Tests Per Group

For each group that contains non-documentation, non-config changes, run its tests before staging that group. **Do not commit a group whose tests fail.**

| Group | Test command |
|---|---|
| `common` | `npm test -- --run -w @quizzquizz/common` |
| `question-bank` | `npm test -- --run -w @quizzquizz/question-bank` |
| `api-server` | `npm test -- --run -w @quizzquizz/api-server` |
| `host-app` | `npm test -- --run -w @quizzquizz/host-app` |
| `player-app` | `npm test -- --run -w @quizzquizz/player-app` |
| `analytics` | `npm test -- --run -w @quizzquizz/analytics` |
| `e2e` | `npm run test:e2e` (only if the dev server is running) |
| `infra`, `config`, `docs`, `changelog` | No tests required. |

If `common` changes alongside another package, run `common` tests first (it is a dependency).

If tests fail:
1. Report which test(s) failed and in which file.
2. Ask the user whether to fix them, skip that group, or abort.
3. Do not proceed to commit until resolved or explicitly skipped.

---

### 5. Commit Each Group

Commit groups in dependency order:

1. `common`
2. `question-bank`
3. `api-server`
4. `host-app`, `player-app`, `analytics` (order among these doesn't matter)
5. `question-bank-builder`
6. `e2e`
7. `infra`, `config`, `docs`
8. `changelog` (always last, or merged into the final code commit if only one group)
9. `version-bump` (if a bump was performed — commit all `package.json` files together, separate from code changes, **before** the code commits; or as the very first commit)

> **Version bump commit always comes first** if requested, so the code commits sit on top of the bumped version.

For each group:

```bash
git add <files in this group>
git commit -m "<type>(<scope>): <subject>

<optional body>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

**Conventional Commit types:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change that is neither fix nor feature
- `test` — adding or updating tests
- `docs` — documentation only
- `chore` — build, config, tooling, deps
- `ci` — CI/CD changes

**Scope** = the group label (e.g., `player-app`, `api-server`, `common`).

**Subject** = imperative, ≤72 chars, no trailing period.

Example commits:
```
chore(config): add commit-changes skill to .github/skills

feat(player-app): show remaining answers count in submit button

fix(api-server): validate question IDs before scoring

chore(release): bump version 0.7.0 → 0.8.0
```

### 6. Tag the Release (if a version bump was performed)

After the version-bump commit, create an annotated git tag and push it:

```bash
git tag v<NEXT> <bump-commit-sha>
git push --tags
```

Use the exact version from the bump (e.g. `v0.12.1`). Always tag the **bump commit itself**, not any subsequent commit.

---

### 7. Final Check

After all commits:

```bash
git log --oneline -10
```

Confirm each commit message is clean and scoped. Report a summary of what was committed, which tests passed, and the new version (if bumped).

If the user wants to push:

```bash
git push
```

Do not push without being asked.
