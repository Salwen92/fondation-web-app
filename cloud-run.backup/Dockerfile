# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install git and other dependencies
RUN apk add --no-cache git bash curl

# Install bun globally for all users
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    chmod -R 755 /opt/bun
ENV PATH="/opt/bun/bin:$PATH"

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy Fondation source code (will be provided during build)
WORKDIR /fondation
# Note: During build, use --build-arg to specify Fondation path
# docker build --build-context fondation-source=/path/to/fondation .
COPY --from=fondation-source . .

# Install Fondation dependencies
RUN bun install

# Set working directory for server
WORKDIR /app

# Copy and install server dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY server.js .

# Create required directories
RUN mkdir -p /tmp/repos /tmp/outputs

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership (including bun directory)
RUN chown -R nodejs:nodejs /app /fondation /tmp/repos /tmp/outputs /opt/bun

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the server
CMD ["node", "server.js"]