#!/bin/sh
# Docker entrypoint script for QuizzQuizz
# Copies fresh build artifacts to the right locations before starting the server.
#
# Layout:
#   /app/packages/          — backend packages + node_modules (image-only, NOT volume-mounted)
#   /app/static/<pkg>/      — frontend static files (on the app-static named volume, shared with Caddy)

set -e

echo "🔄 Syncing build artifacts..."

# ── Backend packages (common, question-bank, api-server, analytics) ────────────
# Sync dist/ into /app/packages/<pkg>/dist — this stays in the container's own
# filesystem so node_modules alongside it are never disturbed by a volume mount.
for pkg in common question-bank api-server analytics; do
  src="/app/dist-build/${pkg}/dist"
  dst="/app/packages/${pkg}/dist"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    cp -rf "${src}/"* "$dst/"
    echo "  ✓ ${pkg}/dist (backend)"
  fi
done

# Sync Prisma schema and migrations (needed for runtime migrations)
if [ -d /app/dist-build/api-server/prisma ]; then
  mkdir -p /app/packages/api-server/prisma
  cp -rf /app/dist-build/api-server/prisma/. /app/packages/api-server/prisma/
  echo "  ✓ api-server/prisma"
fi

# ── Frontend packages (host-app, player-app, analytics-ui) ─────────────────────
# Sync dist/ into /app/static/<pkg>/ — this directory IS volume-mounted and shared
# with the Caddy container for static file serving. Keeping it separate from
# /app/packages means node_modules under /app/packages are never clobbered.
for pkg in host-app player-app analytics-ui; do
  src="/app/dist-build/${pkg}/dist"
  dst="/app/static/${pkg}"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    cp -rf "${src}/"* "$dst/"
    echo "  ✓ ${pkg} (frontend → /app/static/${pkg})"
  fi
done

echo "✅ All build artifacts synced successfully"

# Ensure the data directory exists and is writable by the nodejs user.
# This handles pre-existing named volumes that may have been created with root ownership.
mkdir -p /data
chown nodejs:nodejs /data
echo "📁 Data directory ready: /data"

# Drop from root to nodejs for the actual server process
exec su-exec nodejs:nodejs "$@"
