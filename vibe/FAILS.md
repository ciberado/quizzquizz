# Test Failures Analysis - Phase 4D

**Date**: February 9, 2026  
**Status**: 7/10 Playwright E2E tests failing

## Overview

Phase 4D E2E tests (player UI flow) are experiencing systematic failures preventing the player journey from progressing beyond the lobby screen to the question screen.

## Primary Issue: Lobby → Question Screen Navigation Failure

### Symptoms
- Players successfully join quiz and reach lobby
- After host starts quiz via API, lobby screen remains stuck
- Navigation to question screen never occurs (timeout after 15 seconds)
- Error message: `TimeoutError: page.waitForSelector: Timeout 15000ms exceeded` when waiting for `question-screen` element

### Root Cause

**Browser Context Offline Mode**: Playwright browser contexts default to `navigator.onLine = false` in test environment, causing cascading failures:

1. **Offline Indicator Triggers**
   - `OfflineIndicator` component detects `!navigator.onLine` on initialization
   - Yellow "⚠️ No internet connection" banner appears
   - While this is correct behavior for the component, it indicates the browser environment issue

2. **Lobby Polling Breaks**
   - Lobby screen polls every 2 seconds via `pollGameState()`
   - Polling makes two API calls: `getGameState()` then `getLeaderboard()`
   - With offline mode, network errors occur sporadically
   - **Critical Bug**: When `getLeaderboard()` fails, the code attempted to access `leaderboard.entries.length` on undefined
   - This threw: `TypeError: Cannot read properties of undefined (reading 'length')`
   - The try-catch caught this as a network error and **continued polling** rather than navigating

3. **Navigation Never Triggered**
   - Even though `getGameState()` returns `status: 'playing'`, the code flow was:
     1. Fetch game state (success, returns playing)
     2. Fetch leaderboard (fails due to network/offline issues)
     3. Try to access `leaderboard.entries.length` (throws error)
     4. Catch error, log "Network error", continue polling
   - The check `if (gameState.status === 'playing')` came **after** the leaderboard fetch, so navigation never happened

### Evidence

Console error captured during test:
```
[error] Network error: TypeError: Cannot read properties of undefined (reading 'length')
    at LobbyScreen.pollGameState (http://localhost:3002/src/components/lobby-screen.ts:76:74)
```

API responses show quiz is actually running:
```json
{
  "status": "playing",
  "currentQuestion": {
    "id": "Q001",
    "text": "What is the capital of France?",
    "answers": [...],
    "difficulty": "easy",
    "timeLimit": 20
  },
  "currentQuestionIndex": 0,
  "totalQuestions": 10,
  "timeRemaining": 18.166,
  "playerScore": 0
}
```

But browser remains at: `http://localhost:3002/#/lobby/{sessionId}`

## Secondary Issues

### 1. Test Selector Mismatches

**Issue**: Tests checked for text that didn't exist in components
- Test expected: `"Enter Your Nickname"`
- Actual component text: `"Choose Your Name"`

**Fix Applied**: Updated test selectors to match actual component content

### 2. State Persistence Investigation

Initially suspected localStorage state wasn't saving, but investigation showed:
- `localStorage.getItem('quizzquizz_player_state')` was null during debugging
- However, this was due to the key mismatch: code uses `'quizzquizz_player_state'` but state.ts saves to `'quizzquizz_player_state'` ✓ (correct)
- State persistence is actually working; the offline/polling issue was blocking further testing

### 3. Timing Issues with Web Components

**Issue**: Originally tried implementing `data-ready="true"` attribute on Web Components to signal when fully mounted
- Added to `BaseComponent.connectedCallback()`
- Updated helper: `waitForComponentReady(page, 'component-tag')`

**Problem**: This approach was over-engineered for the actual issue
- Components were rendering fine
- The real issue was navigation never being triggered due to polling bug
- Simplified back to basic element attachment check

## Fixes Applied

### 1. Lobby Polling Logic (CRITICAL FIX)

**File**: `packages/player-app/src/components/lobby-screen.ts`

**Change**: Reorder polling logic to check game state **before** fetching leaderboard

```typescript
private async pollGameState(): Promise<void> {
  try {
    const gameState = await api.getGameState(this.sessionId, this.playerId);

    // Check if game has started FIRST (before fetching leaderboard)
    if (gameState.status === 'playing') {
      this.stopPolling();
      router.navigate(`/question/${this.sessionId}`);
      return; // Early return
    }

    // Only fetch leaderboard if still in lobby
    try {
      const leaderboard = await api.getLeaderboard(this.sessionId);
      if (this.playerCountElement && leaderboard.entries) {
        this.playerCountElement.textContent = String(leaderboard.entries.length);
      }
    } catch (leaderboardError) {
      console.debug('Could not fetch leaderboard:', leaderboardError);
      // Don't fail the whole poll
    }
  } catch (error) {
    // ... error handling
  }
}
```

**Rationale**:
- Navigation decision should depend only on `gameState.status`
- Leaderboard is UI enhancement (player count), not critical for navigation
- Separating concerns prevents leaderboard failures from blocking navigation

### 2. Browser Context Online Mode

**File**: `e2e/player-ui.spec.ts`

**Change**: Force browser contexts to start online

```typescript
test('complete player flow', async ({ page, request, context }) => {
  await context.setOffline(false); // Ensure online
  // ... rest of test
});
```

**Applied to**: 7 out of 10 tests (all tests requiring network API calls)

### 3. Test Selector Updates

Updated all text-based assertions to match actual component content:
- `"Enter Your Nickname"` → `"Choose Your Name"`
- `"Waiting for host"` → Check actual lobby text

### 4. BaseComponent Ready State (Implemented but May Not Be Needed)

Added explicit ready state tracking to `BaseComponent`:
```typescript
connectedCallback(): void {
  this.render();
  this.markAsReady(); // Sets data-ready="true"
  const mountResult = this.onMount();
  // Handle async mounting
}
```

**Note**: This may be over-engineered given the real issue was polling logic. Consider simplifying if tests pass without it.

## Tests Affected

### Failing (7/10)
1. ❌ Complete player flow: join → lobby → question → waiting → results
2. ❌ Results screen displays correct leaderboard data
3. ❌ Results screen shows medal icons for top 3
4. ❌ Play again button clears state and returns to join screen
5. ❌ Loading state shows spinner while fetching leaderboard
6. ❌ Countdown timer shows warning when less than 5 seconds
7. ❌ HTML escaping prevents XSS in nickname display

All fail at the **same point**: Waiting for `question-screen` element after quiz starts

### Passing (3/10)
1. ✅ Smooth transitions between screens (doesn't start quiz)
2. ✅ Offline indicator appears when network is offline (intentional test)
3. ✅ Error handling shows retry button on leaderboard fetch failure (no-op test)

## Next Steps

1. **Verify Lobby Fix**: Re-run tests to confirm navigation now works
2. **Simplify Ready State**: If tests pass, remove `data-ready` infrastructure (not needed)
3. **Remove Debug Code**: Clean up console.log statements added for debugging
4. **Monitor Offline Indicator**: Consider disabling in test environment or setting `navigator.onLine = true` globally

## Lessons Learned

### Debugging Process
1. ✅ Added comprehensive logging (network requests, responses, console errors)
2. ✅ Used Playwright screenshots and error context snapshots
3. ✅ Traced execution flow through browser console
4. ✅ Identified mismatched expectations (test vs reality)

### Root Cause Analysis
- Don't assume UI issues are always UI bugs
- Network/environment issues can manifest as navigation failures
- Check browser developer tools state (online/offline) in test environments
- Order of operations matters: prioritize critical paths (navigation) over enhancements (UI updates)

### Test Design
- Playwright contexts don't inherit browser online state by default
- Explicit environment setup prevents flaky tests
- Content-based selectors more reliable than component tag checks for hydrated components

## Code Quality Issues Found

1. **Unsafe property access**: `leaderboard.entries.length` without null check
2. **Order of operations**: Optional operations blocking critical paths
3. **Error handling**: Network errors preventing valid state transitions

## Recommendations

1. **Add null safety**: Use optional chaining: `leaderboard?.entries?.length ?? 0`
2. **Prioritize navigation**: Check game state changes before secondary API calls
3. **Fail gracefully**: UI enhancements shouldn't block core functionality
4. **Test environment consistency**: Always set `context.setOffline(false)` in E2E setup hooks
