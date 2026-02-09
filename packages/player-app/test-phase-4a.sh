#!/bin/bash
# Manual test script for Phase 4A
# Test the player app routing foundation

echo "=== Phase 4A Testing ==="
echo ""

echo "1. Testing dev server response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Server responds with HTTP 200"
else
  echo "   ✗ Server returned HTTP $HTTP_CODE"
  exit 1
fi

echo ""
echo "2. Testing TypeScript compilation..."
if npm run typecheck --workspace=@quizzquizz/player-app --silent 2>&1 | grep -q "error"; then
  echo "   ✗ TypeScript errors found"
  npm run typecheck --workspace=@quizzquizz/player-app
  exit 1
else
  echo "   ✓ TypeScript compiles without errors"
fi

echo ""
echo "3. Testing page structure..."
PAGE_CONTENT=$(curl -s http://localhost:3002)
if echo "$PAGE_CONTENT" | grep -q '<div id="app"></div>'; then
  echo "   ✓ App mount point exists"
else
  echo "   ✗ App mount point missing"
  exit 1
fi

if echo "$PAGE_CONTENT" | grep -q '/src/main.ts'; then
  echo "   ✓ Main script included"
else
  echo "   ✗ Main script missing"
  exit 1
fi

echo ""
echo "4. Testing module loading..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/src/main.ts | grep -q "200"; then
  echo "   ✓ Main module loads"
else
  echo "   ✗ Main module failed to load"
  exit 1
fi

echo ""
echo "=== Phase 4A Foundation Tests: PASSED ==="
echo ""
echo "Manual testing required:"
echo "  1. Open http://localhost:3002 in a browser"
echo "  2. Verify 'Join Quiz' screen appears"
echo "  3. Click 'Test: Go to Nickname' button"
echo "  4. Verify URL changes to #/nickname"
echo "  5. Test other navigation buttons"
echo ""
echo "Expected routes:"
echo "  /         → Join screen"
echo "  /join     → Join screen"
echo "  /nickname → Nickname screen"
echo "  /lobby/:  → Lobby screen"
echo "  /play/:id  → Play screen"
echo "  /results/:id → Results screen"
