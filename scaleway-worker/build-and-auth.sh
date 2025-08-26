#!/bin/bash
# Build Scaleway Docker image and authenticate Claude

set -e

echo "🔨 Building Scaleway Docker image with cloud-run CLI bundle..."

# Build the Docker image with fondation source as build context
docker build \
  --build-context fondation-source=/Users/salwen/Documents/Cyberscaling/fondation \
  -t scaleway-worker:base \
  -f Dockerfile \
  .

echo "✅ Base image built successfully"

echo "🔐 Starting container for Claude authentication..."

# Run container in interactive mode for authentication
docker run -it \
  --name scaleway-auth-temp \
  --user root \
  -e CLAUDECODE=1 \
  scaleway-worker:base \
  /bin/sh -c '
    echo "📦 Installing Claude CLI globally..."
    npm install -g @anthropic/claude-cli
    
    echo "🔑 Please authenticate with Claude now..."
    echo "Run: claude auth"
    echo ""
    echo "After authentication, type exit to continue"
    /bin/sh
  '

echo "💾 Saving authenticated image..."
docker commit scaleway-auth-temp scaleway-worker:authenticated

echo "🧹 Cleaning up temporary container..."
docker rm scaleway-auth-temp

echo "✅ Scaleway Docker image built and authenticated!"
echo "   Image: scaleway-worker:authenticated"