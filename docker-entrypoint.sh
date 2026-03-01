#!/bin/sh
# Docker entrypoint script for QuizzQuizz
# Copies fresh build artifacts to the shared volume before starting the server

set -e

echo "🔄 Syncing build artifacts to shared volume..."

# Sync all packages from the safe dist-build location to the volume-mounted packages dir.
# This runs on every startup so upgrades always reflect the current image,
# even when the named volume already contains an older build.
for pkg in common question-bank api-server host-app player-app; do
  src="/app/dist-build/${pkg}/dist"
  dst="/app/packages/${pkg}/dist"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    cp -rf "${src}/"* "$dst/"
    echo "  ✓ ${pkg}/dist"
  fi
done

# Sync Prisma schema and migrations (needed for runtime migrations)
if [ -d /app/dist-build/api-server/prisma ]; then
  mkdir -p /app/packages/api-server/prisma
  cp -rf /app/dist-build/api-server/prisma/. /app/packages/api-server/prisma/
  echo "  ✓ api-server/prisma"
fi

echo "✅ All build artifacts synced successfully"

# Execute the main command
exec "$@"
