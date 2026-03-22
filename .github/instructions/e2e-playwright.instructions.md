---
description: "Use when writing, fixing, or debugging Playwright E2E tests in the e2e/ folder. Covers selector stability, offline-mode gotchas, known failure patterns, and playwright config conventions for quizzquizz."
applyTo: "e2e/**"
---
# Playwright E2E Guidelines

## Running Tests

```bash
# Full E2E suite (sources Node 22 via nvm)
npm run test:e2e

# Single spec file
npx playwright test e2e/full-workflow.spec.ts

# Headed mode for debugging
npx playwright test --headed e2e/api.spec.ts
```

Config files: `playwright.config.ts` (default), `playwright.docker.config.ts` (Docker).

## Selector Stability

- **Always verify** the actual rendered text or element roles in the UI before writing a selector.
- Prefer `page.getByRole(...)` and `page.getByTestId(...)` over CSS selectors and exact text matches.
- When you must use text, read the component source to confirm the exact string — do not guess from old docs.
- Common past failure: test expected "Enter Your Nickname" but component said "Choose Your Name" → selector timeout.

## Offline-Mode Gotcha

Browser contexts in the E2E environment may start with `navigator.onLine === false`. Guards to apply:
- Wrap polling loops with existence checks before reading response properties.
- Do not crash on undefined API responses in lobby/polling components; log and retry.

## Writing New Scenarios

- Match the existing async/await and `test.describe` patterns in adjacent spec files.
- Use a fresh session (new PIN) for each test to avoid state coupling.
- Prefer isolating host actions and player actions in separate `Page` objects or `browserContext.newPage()`.
- Add a `test.afterEach` that cleans up sessions when the API supports it.

## Debugging Failures

1. Check `test-results/` for screenshots and traces.
2. Inspect `vibe/FAILS.md` for known flaky patterns before spending time fixing them.
3. Run the spec headed (`--headed`) and slow it down with `--slowMo 200` to watch the failure.
4. Verify the dev server is running before the test file that depends on it.

## Test File Map

| File | Coverage area |
|------|--------------|
| `api.spec.ts` | Full session lifecycle via REST |
| `auth.spec.ts` | Sign-up, login, host-token flow |
| `bank-browser.spec.ts` | Question-bank browsing, filtering |
| `full-workflow.spec.ts` | Host creates quiz, players join and answer |
| `host-analytics.spec.ts` | Post-game analytics page |
| `player-ui.spec.ts` | Player join, answer, leaderboard |
| `question-preview.spec.ts` | Host preview of questions |
| `quiz-upload.spec.ts` | Logged-in host uploads a Markdown bank |
| `docker-routing.spec.ts` | Caddy reverse-proxy routing |
