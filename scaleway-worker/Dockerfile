# Scaleway Worker Dockerfile
# This container runs as a Scaleway Serverless Job for long-running Fondation CLI analyze tasks

# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install git, bash, curl, and build tools
RUN apk add --no-cache git bash curl python3 make g++

# Install bun globally
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    chmod -R 755 /opt/bun
ENV PATH="/opt/bun/bin:$PATH"

# Copy Fondation source code (will be provided during build)
WORKDIR /fondation
# Note: During build, use --build-context to specify Fondation path
# docker build --build-context fondation-source=/path/to/fondation .
COPY --from=fondation-source . .

# Install Fondation dependencies
RUN bun install

# Try to build the bundled CLI if possible
RUN bun run build:cli || echo "CLI bundling failed, will use source"

# Set working directory for worker
WORKDIR /app

# Copy worker script
COPY worker.js .
COPY package.json .

# Create required directories
RUN mkdir -p /tmp/repos /tmp/outputs

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app /fondation /tmp/repos /tmp/outputs /opt/bun

# Switch to non-root user
USER nodejs

# Set environment variable to indicate we're running in Docker
ENV RUNNING_IN_DOCKER=true

# The worker.js script will be executed by Scaleway Jobs
# No need for EXPOSE or CMD as this is not a server
ENTRYPOINT ["node", "worker.js"]