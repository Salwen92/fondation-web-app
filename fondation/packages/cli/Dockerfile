# Fondation Analyze Docker Image
# Multi-stage build for optimized size and security

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src
COPY prompts ./prompts
COPY scripts ./scripts

# Build the project
RUN npm run build && npm run build:cli

# Stage 2: Runtime
FROM node:20-alpine

# Install required system packages (minimal set)
RUN apk add --no-cache \
    git \
    bash \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 fondation && \
    adduser -u 1000 -G fondation -D -s /bin/bash fondation

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder --chown=fondation:fondation /build/dist/cli.bundled.cjs ./
COPY --from=builder --chown=fondation:fondation /build/prompts ./prompts
COPY --from=builder --chown=fondation:fondation /build/package.json ./

# Initialize package.json and install only the Claude SDK with specific version
# This adds only 75MB with zero additional dependencies
RUN npm init -y --quiet && \
    npm install --no-save @anthropic-ai/claude-code@1.0.96 && \
    rm -f package-lock.json && \
    chown -R fondation:fondation /app

# Create workspace and output directories
RUN mkdir -p /workspace /output && \
    chown -R fondation:fondation /workspace /output

# Switch to non-root user for security
USER fondation

# Set environment variables
ENV NODE_ENV=production \
    CLAUDE_OUTPUT_DIR=/output \
    CLAUDE_MODEL=claude-sonnet-4-20250514

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node cli.bundled.cjs --version || exit 1

# Default entrypoint
ENTRYPOINT ["node", "cli.bundled.cjs"]

# Default command shows help
CMD ["--help"]