# Production Dockerfile for Fondation Worker
# Multi-stage build for minimal final image

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies (including bash for bun install)
RUN apk add --no-cache python3 make g++ curl bash

# Install bun globally
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    chmod -R 755 /opt/bun
ENV PATH="/opt/bun/bin:$PATH"

WORKDIR /build

# Copy workspace files (updated for packages structure)
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/ packages/

# Install dependencies for all packages
RUN bun install

# Build the CLI first (skip build for now, just install deps)
WORKDIR /build/packages/cli
RUN bun install --no-save || true

# Build the worker
WORKDIR /build/packages/worker
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

# Install bun in runtime (needed for CLI execution)
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    chmod -R 755 /opt/bun
ENV PATH="/opt/bun/bin:$PATH"

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN addgroup -g 1001 -S worker && \
    adduser -u 1001 -S worker -G worker

# Create necessary directories
RUN mkdir -p /home/worker/.claude /tmp/fondation && \
    chown -R worker:worker /home/worker /tmp/fondation

WORKDIR /app

# Copy built applications maintaining packages structure
COPY --from=builder --chown=worker:worker /build/packages/worker/dist ./packages/worker/dist/
COPY --from=builder --chown=worker:worker /build/packages/worker/package.json ./packages/worker/
COPY --from=builder --chown=worker:worker /build/packages/shared ./packages/shared/

# Copy built CLI with all its dependencies
COPY --from=builder --chown=worker:worker /build/packages/cli ./packages/cli/

# Copy workspace package.json and node_modules
COPY --from=builder --chown=worker:worker /build/node_modules ./node_modules/
COPY --from=builder --chown=worker:worker /build/package.json ./

# Switch to non-root user
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Environment variables
ENV NODE_ENV=production \
    NO_UPDATE_NOTIFIER=1

# Default command (updated for packages structure)
CMD ["node", "packages/worker/dist/index.js"]

# Environment variables (documented for reference)
# CONVEX_URL - Required: Convex deployment URL
# WORKER_ID - Optional: Unique worker identifier
# POLL_INTERVAL - Optional: Job polling interval in ms (default: 5000)
# LEASE_TIME - Optional: Job lease duration in ms (default: 300000)
# HEARTBEAT_INTERVAL - Optional: Lease heartbeat interval in ms (default: 60000)
# MAX_CONCURRENT_JOBS - Optional: Maximum concurrent jobs (default: 1)
# TEMP_DIR - Optional: Temporary directory for cloned repos (default: /tmp/fondation)

# Volumes
# /tmp/fondation - Temporary directory for cloned repositories

# Ports
EXPOSE 8080