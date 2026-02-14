#!/usr/bin/env bash
#
# Reload Question Banks
# Triggers the API server to reload question banks from disk without restarting
#

set -e

API_URL="${API_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

echo "🔄 Reloading question banks from disk..."
echo "   API: $API_URL"

if [ -n "$ADMIN_TOKEN" ]; then
  echo "   Using admin token (production mode)"
  RESPONSE=$(curl -s -X POST "$API_URL/api/question-banks/reload" \
    -H "X-Admin-Token: $ADMIN_TOKEN" \
    -H "Content-Type: application/json")
else
  echo "   No admin token (development mode)"
  RESPONSE=$(curl -s -X POST "$API_URL/api/question-banks/reload" \
    -H "Content-Type: application/json")
fi

# Pretty print the response
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Done! Question banks have been reloaded."
echo "   Edit question-banks/*.md files and run this script to reload changes."
