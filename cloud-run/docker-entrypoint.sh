#!/bin/bash

# Check if Claude is authenticated
if ! claude --version > /dev/null 2>&1; then
    echo "Claude CLI needs authentication. Please run:"
    echo "docker run -it --rm fondation-worker /bin/bash"
    echo "Then run: claude --version"
    echo "And authenticate when prompted."
    exit 1
fi

# Set environment variable to indicate we're running in Docker
export RUNNING_IN_DOCKER=true

# Start the server
exec node /app/server.js