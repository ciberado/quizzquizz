#!/usr/bin/env bash

# Phase 4C Integration Test Script
# Tests question display, timer, answer selection, and waiting screens

echo "==================================="
echo "Phase 4C: Question & Answer Screens"
echo "Integration Test Script"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Prerequisites:${NC}"
echo "1. API server running on http://localhost:3000"
echo "2. Player app running on http://localhost:3002"
echo ""
echo -e "${YELLOW}Press Enter to start testing...${NC}"
read

echo -e "${GREEN}Test 1: Create a session for testing${NC}"
echo "Creating session with sample question bank..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"questionBankId": "sample-general", "questionCount": 3, "timeLimit": 15}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
PIN=$(echo $SESSION_RESPONSE | grep -o '"pin":"[^"]*' | cut -d'"' -f4)
HOST_TOKEN=$(echo $SESSION_RESPONSE | grep -o '"hostToken":"[^"]*' | cut -d'"' -f4)

echo "Session created!"
echo "  Session ID: $SESSION_ID"
echo "  PIN: $PIN"
echo "  Host Token: $HOST_TOKEN"
echo ""

echo -e "${GREEN}Test 2: Join as a player${NC}"
echo "Open http://localhost:3002 in your browser"
echo "  1. Enter PIN: $PIN"
echo "  2. Enter a nickname (e.g., 'TestPlayer')"
echo "  3. You should see the lobby screen"
echo ""
echo -e "${YELLOW}Press Enter when you're in the lobby...${NC}"
read

echo -e "${GREEN}Test 3: Start the game${NC}"
echo "Starting game..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/start" \
  -H "Host-Token: $HOST_TOKEN" | jq '.'
echo ""
echo "Check your browser:"
echo "  ✓ Should automatically navigate from lobby to question screen"
echo "  ✓ Should display the first question"
echo "  ✓ Should show a countdown timer (15 seconds)"
echo "  ✓ Should show 4 answer buttons"
echo "  ✓ Submit button should be disabled initially"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo -e "${GREEN}Test 4: Answer selection${NC}"
echo "In your browser:"
echo "  1. Click on one or more answer buttons"
echo "  2. Selected answers should highlight (blue background)"
echo "  3. Submit button should become enabled when answers are selected"
echo "  4. Click an answer again to deselect it"
echo "  5. Timer should count down (changes to red when < 5 seconds)"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo -e "${GREEN}Test 5: Submit answer${NC}"
echo "In your browser:"
echo "  1. Select an answer"
echo "  2. Click 'Submit Answer' button"
echo "  3. Should navigate to waiting screen"
echo "  4. Should show feedback:"
echo "     - Green checkmark + points if correct"
echo "     - Red X + 0 points if incorrect"
echo "  5. Should show 'Waiting for other players...' message"
echo "  6. Should display a loading spinner"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo -e "${GREEN}Test 6: Auto-submit on timeout${NC}"
echo "Advancing to next question..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/next" \
  -H "Host-Token: $HOST_TOKEN" | jq '.'
echo ""
echo "In your browser:"
echo "  1. Should automatically navigate to new question"
echo "  2. Wait for timer to reach 0 WITHOUT selecting an answer"
echo "  3. Should auto-submit and navigate to waiting screen"
echo "  4. Should show 0 points (no answer selected)"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo -e "${GREEN}Test 7: Multiple correct answers${NC}"
echo "Advancing to next question..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/next" \
  -H "Host-Token: $HOST_TOKEN" | jq '.'
echo ""
echo "In your browser:"
echo "  1. Check if hint says 'Select all correct answers' or 'Select one answer'"
echo "  2. If multiple answers: try selecting just one, then submit"
echo "  3. Should show incorrect feedback if you missed correct answers"
echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

echo -e "${GREEN}Test 8: End quiz${NC}"
echo "Ending quiz..."
curl -s -X POST "http://localhost:3000/api/sessions/$SESSION_ID/end" \
  -H "Host-Token: $HOST_TOKEN" | jq '.'
echo ""
echo "In your browser:"
echo "  ✓ Should navigate from waiting screen to results screen (placeholder)"
echo ""

echo -e "${GREEN}Test 9: Error handling${NC}"
echo "Testing network error handling..."
echo "1. Kill the API server (Ctrl+C in the server terminal)"
echo "2. Refresh the player app page"
echo "3. Try to perform any action"
echo "4. Should show appropriate error messages"
echo "5. Restart the API server when done"
echo ""
echo -e "${YELLOW}Press Enter when done testing errors...${NC}"
read

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Phase 4C Integration Tests Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Key Features Tested:"
echo "  ✓ Question display with formatted text"
echo "  ✓ Countdown timer with visual warning"
echo "  ✓ Answer selection (single and multiple)"
echo "  ✓ Submit button state management"
echo "  ✓ Answer submission with scoring"
echo "  ✓ Auto-submit on timeout"
echo "  ✓ Waiting screen with feedback"
echo "  ✓ Automatic navigation between screens"
echo "  ✓ Polling for game state changes"
echo ""
echo "Next Steps:"
echo "  - Phase 4D: Results & Leaderboard Screen"
echo "  - Test with multiple players simultaneously"
echo "  - Test edge cases (slow network, rapid clicks, etc.)"
