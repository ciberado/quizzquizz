# Test Failures Log

All previously tracked failures have been resolved. This file is kept as an archive.

## ✅ Resolved: Phase 4D E2E failures (Feb 9, 2026)

**Root cause**: Playwright browser contexts defaulted to `navigator.onLine = false`, causing lobby polling to fail before navigation could trigger.

**Fixes applied**:
- Reordered lobby polling logic: check `gameState.status === 'playing'` before any secondary API calls.
- Added `context.setOffline(false)` to all E2E tests that make network API calls.
- Fixed unsafe property access (`leaderboard.entries.length` → optional chaining).
- Updated stale text selectors to match actual component content.

All 10 player UI E2E tests now pass. See git history for details.

## ⚠️ Known: `auth/middleware.test.ts` — timing issue (May 2026)

**File**: `packages/api-server/src/auth/middleware.test.ts`  
**Test**: "should inject user context for authenticated requests"  
**Symptom**: `expect(data.authenticated).toBe(true)` fails — sign-up succeeds (HTTP 200) but the session cookie is not yet readable by the next request in the same test.  
**Root cause**: Better Auth session cookie propagation latency in the in-memory test environment. The sign-up and cookie-check happen too fast for the session to be committed.  
**Workaround**: None yet. The auth flow works correctly in integration and E2E tests; this is isolated to the unit test harness.
