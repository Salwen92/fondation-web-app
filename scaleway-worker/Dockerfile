# Scaleway Worker Dockerfile
# This container runs as a Scaleway Serverless Job for long-running Fondation CLI analyze tasks

# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install git, bash, and other dependencies
RUN apk add --no-cache git bash curl

# Set working directory for Fondation CLI files
WORKDIR /fondation

# Copy the CLI bundle and prompts from the cloud-run directory
# These files will be provided via build context
COPY --from=fondation-source cloud-run/cli.bundled.cjs ./cloud-run/
COPY --from=fondation-source cloud-run/prompts ./cloud-run/prompts/

# Copy package.json from fondation source for any needed metadata
COPY --from=fondation-source package.json ./

# Set working directory for worker
WORKDIR /scaleway

# Copy worker and server files
COPY worker.js ./worker/
COPY server.js ./worker/
COPY package.json ./

# Create required directories
RUN mkdir -p /tmp/repos /tmp/outputs

# Create a non-root user for security
RUN addgroup -g 1001 -S scaleway && \
    adduser -S scaleway -u 1001

# Set ownership
RUN chown -R scaleway:scaleway /fondation /scaleway /tmp/repos /tmp/outputs

# Switch to non-root user
USER scaleway

# Set environment variable to indicate we're running in Docker
ENV RUNNING_IN_DOCKER=true

# Install Express for the server
RUN npm install express

# Expose port for the server
EXPOSE 8080

# Run the server instead of the worker directly
ENTRYPOINT ["node", "/scaleway/worker/server.js"]