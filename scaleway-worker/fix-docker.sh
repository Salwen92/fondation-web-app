#!/bin/bash
# Fix Docker container issues

set -e

echo "🔧 Fixing Docker container issues..."

# Enter the running authenticated container and fix issues
docker exec -u root 585c008c9ba1 /bin/sh -c '
    # Fix missing package.json in /scaleway
    echo "Fixing missing package.json..."
    cp /scaleway/fondation-source/package.json /scaleway/package.json 2>/dev/null || \
    cp /fondation/package.json /scaleway/package.json 2>/dev/null || \
    echo "{\"name\":\"scaleway-fondation\",\"version\":\"1.0.0\"}" > /scaleway/package.json
    
    # Ensure proper permissions
    chown -R scaleway:scaleway /scaleway/package.json
    
    # Create a wrapper script to preserve environment
    cat > /scaleway/worker/run-with-env.sh << "EOF"
#!/bin/sh
# Preserve Claude authentication environment
export CLAUDECODE=${CLAUDECODE:-1}
export CLAUDE_CODE_SSE_PORT=${CLAUDE_CODE_SSE_PORT}
export CLAUDE_CODE_ENTRYPOINT=${CLAUDE_CODE_ENTRYPOINT}

# Fix callback URL for Docker networking
if [ "$CALLBACK_URL" = "http://localhost:3000/api/webhook/job-callback" ]; then
    export CALLBACK_URL="http://host.docker.internal:3000/api/webhook/job-callback"
fi

# Run the worker
exec node /scaleway/worker/worker.js
EOF
    
    chmod +x /scaleway/worker/run-with-env.sh
    chown scaleway:scaleway /scaleway/worker/run-with-env.sh
    
    echo "Fixes applied successfully!"
'

# Save the fixed container
echo "💾 Saving fixed container..."
docker commit 585c008c9ba1 scaleway-worker:fixed

echo "✅ Container fixed and saved as scaleway-worker:fixed"