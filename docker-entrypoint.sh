#!/bin/sh
# Docker entrypoint script for QuizzQuizz
# Copies fresh build artifacts to the shared volume before starting the server

set -e

echo "🔄 Syncing frontend build artifacts to shared volume..."

# Create target directories if they don't exist
mkdir -p /app/packages/host-app/dist
mkdir -p /app/packages/player-app/dist

# Copy fresh dist files from build location to shared volume
# Using cp -r with explicit overwrite to ensure fresh files replace old ones
cp -rf /app/dist-build/host-app/dist/* /app/packages/host-app/dist/
cp -rf /app/dist-build/player-app/dist/* /app/packages/player-app/dist/

echo "✅ Frontend build artifacts synced successfully"

# Execute the main command
exec "$@"
