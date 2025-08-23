# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install git and other dependencies
RUN apk add --no-cache git bash

# Set working directory
WORKDIR /app

# Copy the CLI bundle and prompts
COPY cli.bundled.cjs .
COPY prompts ./prompts

# Copy and install server dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server.js .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the server
CMD ["node", "server.js"]