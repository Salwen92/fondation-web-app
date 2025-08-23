#!/bin/bash

# Local testing script for Cloud Run service

echo "🚀 Starting local Cloud Run service test..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Copy CLI and prompts
echo "📋 Copying CLI and prompts..."
bun run copy-cli
bun run copy-prompts

# Start the server
echo "🌐 Starting server on port 8080..."
echo "Server will be available at: http://localhost:8080"
echo ""
echo "Test endpoints:"
echo "  - Health check: GET http://localhost:8080/"
echo "  - Execute job: POST http://localhost:8080/execute"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
NODE_ENV=development node server.js