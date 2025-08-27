#!/bin/bash

# Script to create an authenticated Docker image with Claude CLI
# This image will have Claude pre-authenticated for development use

set -e

echo "🔨 Building base Docker image..."
cd ../.. # Go to fondation root
docker build -t fondation-worker:base -f apps/worker/Dockerfile.authenticated .

echo "🔐 Starting container for authentication..."
# Run container with interactive terminal
docker run -it \
  --name claude-auth-temp \
  --entrypoint /bin/sh \
  fondation-worker:base -c "
    echo '📝 Authenticating Claude CLI...'
    echo 'Please follow the prompts to authenticate with your Claude Pro/Max account:'
    claude login
    
    if [ \$? -eq 0 ]; then
      echo '✅ Authentication successful!'
      echo 'Testing Claude...'
      claude --print 'Authentication test successful'
    else
      echo '❌ Authentication failed'
      exit 1
    fi
  "

echo "💾 Creating authenticated image..."
# Commit the authenticated container as a new image
docker commit \
  --message "Claude CLI authenticated" \
  --author "Fondation Team" \
  claude-auth-temp \
  fondation-worker:authenticated

echo "🧹 Cleaning up temporary container..."
docker rm claude-auth-temp

echo "✅ Done! Authenticated image created: fondation-worker:authenticated"
echo ""
echo "📦 To save this image for sharing:"
echo "  docker save fondation-worker:authenticated | gzip > fondation-worker-authenticated.tar.gz"
echo ""
echo "📥 To load on another machine:"
echo "  docker load < fondation-worker-authenticated.tar.gz"
echo ""
echo "🚀 To run the authenticated worker:"
echo "  docker run -d \\"
echo "    --name fondation-worker \\"
echo "    --network host \\"
echo "    -e CONVEX_URL=http://localhost:3210 \\"
echo "    -e WORKER_ID=worker-dev-1 \\"
echo "    fondation-worker:authenticated"