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
COPY packages/host-app/package*.json ./packages/host-app/
COPY packages/player-app/package*.json ./packages/player-app/

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy TypeScript config and source code
COPY tsconfig.base.json ./
COPY packages/common/ ./packages/common/
COPY packages/question-bank/ ./packages/question-bank/
COPY packages/api-server/ ./packages/api-server/
COPY packages/host-app/ ./packages/host-app/
COPY packages/player-app/ ./packages/player-app/

# Generate Prisma client
RUN cd packages/api-server && npx prisma generate

# Build all packages
RUN npm run build --workspaces

# Stage 2: Production runtime
FROM node:22-alpine AS runtime

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/common/package*.json ./packages/common/
COPY packages/question-bank/package*.json ./packages/question-bank/
COPY packages/api-server/package*.json ./packages/api-server/

# Install production dependencies only
RUN npm ci --omit=dev --workspaces

# Copy built artifacts from builder
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/common/package.json ./packages/common/
COPY --from=builder /app/packages/question-bank/dist ./packages/question-bank/dist
COPY --from=builder /app/packages/question-bank/package.json ./packages/question-bank/
COPY --from=builder /app/packages/api-server/dist ./packages/api-server/dist
COPY --from=builder /app/packages/api-server/prisma ./packages/api-server/prisma
COPY --from=builder /app/packages/host-app/dist ./packages/host-app/dist
COPY --from=builder /app/packages/player-app/dist ./packages/player-app/dist

# Generate Prisma client in production environment
# Migrations will be run automatically on startup by the application
RUN cd packages/api-server && npx prisma generate

# Create directories for runtime data
RUN mkdir -p /data /app/question-banks && \
    chown -R nodejs:nodejs /data /app

# Copy default question banks (can be overridden with volume mount)
COPY question-banks/ ./question-banks/

# Switch to non-root user
USER nodejs

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

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the API server (which will serve frontend apps as static files)
CMD ["node", "packages/api-server/dist/index.js"]
