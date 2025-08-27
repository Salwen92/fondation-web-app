# Production Dockerfile for Fondation Worker
# Multi-stage build for minimal final image

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copy workspace files
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/ packages/
COPY apps/worker/ apps/worker/
COPY apps/web/convex/_generated/ apps/web/convex/_generated/

# Install dependencies
RUN npm install -g bun && \
    bun install

# Build the worker
WORKDIR /build/apps/worker
RUN npx tsc

# Runtime stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    tini \
    curl \
    bash \
    ca-certificates

# Install Claude Code CLI (official Anthropic installation)
RUN curl -fsSL https://claude.ai/install.sh | bash && \
    cp ~/.local/bin/claude /usr/local/bin/claude && \
    chmod +x /usr/local/bin/claude

# Create non-root user
RUN addgroup -g 1001 -S worker && \
    adduser -u 1001 -S worker -G worker

# Create necessary directories
RUN mkdir -p /home/worker/.claude /tmp/fondation && \
    chown -R worker:worker /home/worker /tmp/fondation

WORKDIR /app

# Copy built application maintaining monorepo structure
COPY --from=builder --chown=worker:worker /build/apps/worker/dist ./apps/worker/dist/
COPY --from=builder --chown=worker:worker /build/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=worker:worker /build/node_modules ./node_modules/
COPY --from=builder --chown=worker:worker /build/apps/web/convex/_generated ./apps/web/convex/_generated/

# Switch to non-root user
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Environment variables to disable auto-update
ENV CLAUDE_DISABLE_UPDATE=1 \
    CLAUDE_CODE_DISABLE_AUTO_UPDATE=1 \
    NO_UPDATE_NOTIFIER=1

# Default command
CMD ["node", "apps/worker/dist/index.js"]

# Environment variables (documented for reference)
# CONVEX_URL - Required: Convex deployment URL
# WORKER_ID - Optional: Unique worker identifier
# POLL_INTERVAL - Optional: Job polling interval in ms (default: 5000)
# LEASE_TIME - Optional: Job lease duration in ms (default: 300000)
# HEARTBEAT_INTERVAL - Optional: Lease heartbeat interval in ms (default: 60000)
# MAX_CONCURRENT_JOBS - Optional: Maximum concurrent jobs (default: 1)
# TEMP_DIR - Optional: Temporary directory for cloned repos (default: /tmp/fondation)

# Volumes
# /home/worker/.claude - Claude CLI credentials (mount for persistence)
# /tmp/fondation - Temporary directory for cloned repositories

# Ports
EXPOSE 8080