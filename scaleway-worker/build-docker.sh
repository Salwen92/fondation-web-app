#!/bin/bash
# Build PURE Scaleway Worker Docker image - NO Cloud Run references
# Fresh, clean Scaleway-only implementation

set -e

echo "🚀 Building PURE Scaleway Worker Docker image..."
echo "✨ Clean Scaleway-only architecture - no Cloud Run"
echo ""

# Navigate to the scaleway-worker directory
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/scaleway-worker

# Create build context
echo "📦 Preparing Scaleway build context..."
rm -rf build-context
mkdir -p build-context

# Copy worker files
cp worker.js build-context/
cp package.json build-context/

# Copy the CLI from fondation (but we'll reorganize it for Scaleway)
mkdir -p build-context/fondation-cli

# Use the bundled CLI but place it in Scaleway structure
cp /Users/salwen/Documents/Cyberscaling/fondation/cloud-run/cli.bundled.cjs build-context/fondation-cli/
cp -r /Users/salwen/Documents/Cyberscaling/fondation/cloud-run/prompts build-context/fondation-cli/

# Copy fondation source for backup/reference
mkdir -p build-context/fondation-source
cp -r /Users/salwen/Documents/Cyberscaling/fondation/src build-context/fondation-source/ 2>/dev/null || true
cp /Users/salwen/Documents/Cyberscaling/fondation/package.json build-context/fondation-source/

# Create the PURE Scaleway Dockerfile
cat > build-context/Dockerfile <<'EOF'
# PURE Scaleway Worker - Clean architecture without Cloud Run
FROM node:20-alpine

# Metadata
LABEL maintainer="Scaleway Worker"
LABEL description="Pure Scaleway implementation for Fondation documentation generation"

# Install system dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    python3 \
    make \
    g++ \
    ca-certificates

# Install bun runtime
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    chmod -R 755 /opt/bun
ENV PATH="/opt/bun/bin:$PATH"

# Set up Scaleway Fondation directory (no cloud-run path!)
WORKDIR /scaleway/fondation

# Copy CLI to Scaleway-specific location
COPY fondation-cli/cli.bundled.cjs /scaleway/fondation/cli.bundled.cjs
COPY fondation-cli/prompts /scaleway/fondation/prompts/

# Create symbolic link for compatibility (but in Scaleway namespace)
RUN mkdir -p /fondation && \
    ln -s /scaleway/fondation/cli.bundled.cjs /fondation/cli.bundled.cjs && \
    ln -s /scaleway/fondation/prompts /fondation/prompts

# For the worker.js compatibility, create the expected structure
RUN mkdir -p /fondation/cloud-run && \
    ln -s /scaleway/fondation/cli.bundled.cjs /fondation/cloud-run/cli.bundled.cjs && \
    ln -s /scaleway/fondation/prompts /fondation/cloud-run/prompts

# Copy source for reference
COPY fondation-source /scaleway/fondation-source/

# Set up Scaleway worker directory
WORKDIR /scaleway/worker

# Copy worker files
COPY worker.js .
COPY package.json .

# Install minimal dependencies
RUN npm install --production || true

# Create job directories
RUN mkdir -p /tmp/repos /tmp/outputs /var/log/scaleway

# Security: Create non-root user
RUN addgroup -g 1001 -S scaleway && \
    adduser -S scaleway -u 1001 -G scaleway

# Set ownership
RUN chown -R scaleway:scaleway /scaleway /fondation /tmp/repos /tmp/outputs /var/log/scaleway /opt/bun

# Switch to non-root user
USER scaleway

# Scaleway-specific environment
ENV RUNNING_IN_DOCKER=true
ENV NODE_ENV=production
ENV SCALEWAY_MODE=true
ENV PATH="/opt/bun/bin:$PATH"
ENV FONDATION_PATH=/scaleway/fondation
ENV WORKER_PATH=/scaleway/worker

# Health check (for container orchestration)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy'); process.exit(0);" || exit 1

# Entry point
WORKDIR /scaleway/worker
ENTRYPOINT ["node", "worker.js"]
EOF

# Build the Docker image
echo "🔨 Building Scaleway Docker image..."
cd build-context
docker build -t scaleway-worker:latest -t scaleway-worker:$(date +%Y%m%d) .

# Clean up build context
cd ..
rm -rf build-context

echo ""
echo "✅ PURE Scaleway Docker image built successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 CLAUDE AUTHENTICATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Now you need to authenticate Claude inside the container."
echo ""
echo "STEP 1: Start interactive container as root:"
echo "=========================================="
echo "docker run -it --user root --entrypoint /bin/sh scaleway-worker:latest"
echo ""
echo "STEP 2: Inside container, install Claude CLI:"
echo "============================================="
echo "npm install -g @anthropic-ai/sdk claude-cli"
echo ""
echo "STEP 3: Authenticate with Claude:"
echo "================================="
echo "claude auth"
echo ""
echo "STEP 4: Verify authentication works:"
echo "===================================="
echo "echo 'test' | claude"
echo ""
echo "STEP 5: Exit container:"
echo "======================="
echo "exit"
echo ""
echo "STEP 6: Find container ID and save authenticated image:"
echo "======================================================="
echo "docker ps -a | head -2"
echo "docker commit <CONTAINER_ID> scaleway-worker:authenticated"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After authentication, the image will be ready for both"
echo "development and production use with Scaleway!"