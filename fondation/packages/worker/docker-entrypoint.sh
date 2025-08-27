#!/bin/sh
set -e

echo "🚀 Starting Fondation Worker"
echo "📍 Worker ID: ${WORKER_ID:-auto}"
echo "🔗 Convex URL: ${CONVEX_URL}"
echo "🔄 Poll Interval: ${POLL_INTERVAL:-5000}ms"

# Check if Claude CLI is available
if command -v claude > /dev/null 2>&1; then
  echo "✅ Claude CLI found"
  
  # Check if authenticated
  if [ -f "/home/worker/.claude/config" ] || [ -f "/home/worker/.claude/credentials" ]; then
    echo "✅ Claude credentials found"
  else
    echo "⚠️  Claude CLI not authenticated"
    echo "   To authenticate, run:"
    echo "   docker-compose run worker /bin/sh -c 'claude login'"
  fi
else
  echo "⚠️  Claude CLI not found - using mock mode"
  echo "   Install instructions will be provided in OPERATIONS.md"
fi

# Start the worker
exec node dist/index.js "$@"