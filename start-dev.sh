#!/bin/bash

# Fondation Web App - Development Startup Script
# This script starts all required services for local development

echo "🚀 Starting Fondation Web App Development Environment..."

# Kill any existing processes on required ports
echo "📋 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
pkill -f "convex dev" 2>/dev/null

# Start Convex Backend
echo "🔷 Starting Convex backend..."
bunx convex dev &
CONVEX_PID=$!
echo "   Convex started with PID: $CONVEX_PID"

# Wait for Convex to be ready
echo "   Waiting for Convex to initialize..."
sleep 5

# Start Next.js Frontend
echo "⚛️  Starting Next.js frontend..."
bun run dev &
NEXT_PID=$!
echo "   Next.js started with PID: $NEXT_PID"

# Wait for Next.js to be ready
sleep 3

# Start Scaleway Gateway
echo "🌉 Starting Scaleway Gateway..."
cd scaleway-gateway
bun run dev &
GATEWAY_PID=$!
cd ..
echo "   Gateway started with PID: $GATEWAY_PID"

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📌 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Gateway:   http://localhost:8081" 
echo "   Convex:    Check terminal for dashboard URL"
echo ""
echo "📝 Service PIDs:"
echo "   Convex:    $CONVEX_PID"
echo "   Next.js:   $NEXT_PID"
echo "   Gateway:   $GATEWAY_PID"
echo ""
echo "🛑 To stop all services, press Ctrl+C or run: pkill -P $$"
echo ""

# Wait for user interrupt
trap "echo '🛑 Stopping all services...'; kill $CONVEX_PID $NEXT_PID $GATEWAY_PID 2>/dev/null; exit" INT TERM
wait