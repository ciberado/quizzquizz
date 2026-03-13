#!/bin/sh
# Docker entrypoint script for QuizzQuizz
# Copies fresh build artifacts to the shared volume before starting the server

set -e

echo "🔄 Syncing build artifacts to shared volume..."

# Sync all packages from the safe dist-build location to the volume-mounted packages dir.
# This runs on every startup so upgrades always reflect the current image,
# even when the named volume already contains an older build.
for pkg in common question-bank api-server analytics host-app player-app analytics-ui; do
  # Refresh package.json so Node.js module resolution always uses current main/exports fields.
  # This is critical when the named volume was created by an older image that lacked a package
  # or had a different package.json (e.g. missing the analytics package in pre-0.4 volumes).
  src_pkg="/app/dist-build/${pkg}/package.json"
  dst_pkg="/app/packages/${pkg}/package.json"
  if [ -f "$src_pkg" ]; then
    mkdir -p "/app/packages/${pkg}"
    cp -f "$src_pkg" "$dst_pkg"
  fi

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

# Ensure the data directory exists and is writable by the nodejs user.
# This handles pre-existing named volumes that may have been created with root ownership.
mkdir -p /data
chown nodejs:nodejs /data
echo "📁 Data directory ready: /data"

# Drop from root to nodejs for the actual server process
exec su-exec nodejs:nodejs "$@"
