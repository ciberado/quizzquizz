# QuizzQuizz Dockerfile - Multi-stage build for production deployment
# Stage 1: Build dependencies and compile TypeScript
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/question-bank/package*.json ./packages/question-bank/
COPY packages/api-server/package*.json ./packages/api-server/
COPY packages/analytics/package*.json ./packages/analytics/
COPY packages/analytics-ui/package*.json ./packages/analytics-ui/
COPY packages/host-app/package*.json ./packages/host-app/
COPY packages/player-app/package*.json ./packages/player-app/

# Install all dependencies (including devDependencies for build)
# Use --ignore-scripts: prisma schema isn't copied yet; explicit "prisma generate" runs later
RUN npm ci --include=dev --ignore-scripts

# Copy TypeScript config and source code
COPY tsconfig.base.json ./
COPY packages/common/ ./packages/common/
COPY packages/question-bank/ ./packages/question-bank/
COPY packages/api-server/ ./packages/api-server/
COPY packages/analytics/ ./packages/analytics/
COPY packages/analytics-ui/ ./packages/analytics-ui/
COPY packages/host-app/ ./packages/host-app/
COPY packages/player-app/ ./packages/player-app/

# Generate Prisma client
RUN cd packages/api-server && npx prisma generate

# Build all packages
RUN npm run build --workspaces

# Copy Prisma generated client into dist (excluded from tsc to avoid TS9006/TS4094 errors,
# but the compiled db/index.js imports it at runtime as ../generated/prisma/index.js)
RUN cp -r packages/api-server/src/generated packages/api-server/dist/

# Stage 2: Production runtime
FROM node:22-alpine AS runtime

# Install runtime dependencies only
RUN apk add --no-cache dumb-init su-exec

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs packages/common/package*.json ./packages/common/
COPY --chown=nodejs:nodejs packages/question-bank/package*.json ./packages/question-bank/
COPY --chown=nodejs:nodejs packages/api-server/package*.json ./packages/api-server/
COPY --chown=nodejs:nodejs packages/analytics/package*.json ./packages/analytics/

# Install production dependencies only
# Use --ignore-scripts to skip "prisma generate" postinstall (schema not copied yet).
# The explicit "prisma generate" below runs after the schema is copied from builder.
RUN npm ci --omit=dev --ignore-scripts --workspaces

# Copy built artifacts from builder
# Copy backend built artifacts (these don't need sharing)
COPY --chown=nodejs:nodejs --from=builder /app/packages/common/package.json ./packages/common/
COPY --chown=nodejs:nodejs --from=builder /app/packages/question-bank/package.json ./packages/question-bank/
COPY --chown=nodejs:nodejs --from=builder /app/packages/api-server/prisma ./packages/api-server/prisma

# Copy ALL dist artifacts to a safe BUILD location (NOT /app/packages which is volume-mounted).
# The entrypoint script syncs everything from here to the shared volume on every startup,
# ensuring upgrades always reflect the current image even when the volume already has old content.
COPY --chown=nodejs:nodejs --from=builder /app/packages/host-app/dist ./dist-build/host-app/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/player-app/dist ./dist-build/player-app/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/analytics-ui/dist ./dist-build/analytics-ui/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/analytics/dist ./dist-build/analytics/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/common/dist ./dist-build/common/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/question-bank/dist ./dist-build/question-bank/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/api-server/dist ./dist-build/api-server/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/api-server/prisma ./dist-build/api-server/prisma

# Also store each package's package.json in dist-build so the entrypoint can refresh it
# on the volume-mounted /app/packages even when upgrading from an old named volume.
COPY --chown=nodejs:nodejs --from=builder /app/packages/common/package.json ./dist-build/common/
COPY --chown=nodejs:nodejs --from=builder /app/packages/question-bank/package.json ./dist-build/question-bank/
COPY --chown=nodejs:nodejs --from=builder /app/packages/api-server/package.json ./dist-build/api-server/
COPY --chown=nodejs:nodejs --from=builder /app/packages/analytics/package.json ./dist-build/analytics/
COPY --chown=nodejs:nodejs --from=builder /app/packages/analytics-ui/package.json ./dist-build/analytics-ui/
COPY --chown=nodejs:nodejs --from=builder /app/packages/host-app/package.json ./dist-build/host-app/
COPY --chown=nodejs:nodejs --from=builder /app/packages/player-app/package.json ./dist-build/player-app/

# Generate Prisma client in production environment
# Migrations will be run automatically on startup by the application
RUN cd packages/api-server && npx prisma generate

# Create directory for runtime data and set ownership
RUN mkdir -p /data && chown nodejs:nodejs /data

# Create directory for shared volume mount point (all packages that will be synced on startup)
RUN mkdir -p \
      /app/packages/api-server/dist \
      /app/packages/api-server/prisma \
      /app/packages/common/dist \
      /app/packages/question-bank/dist \
      /app/packages/analytics/dist \
      /app/packages/host-app/dist \
      /app/packages/player-app/dist \
      /app/packages/analytics-ui/dist && \
    chown -R nodejs:nodejs /app/packages

# Copy default question banks (can be overridden with volume mount)
COPY --chown=nodejs:nodejs question-banks/ ./question-banks/

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as root so the entrypoint can fix volume ownership, then drops to nodejs via su-exec

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/quiz.db \
    QUESTION_BANKS_PATH=/app/question-banks

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly, with our entrypoint script
# The entrypoint script syncs fresh frontend builds to the shared volume
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start the API server (which will serve frontend apps as static files)
CMD ["node", "packages/api-server/dist/index.js"]
