#!/bin/bash

echo "Building Claude CLI Sandbox Docker Image"
echo "========================================"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running"
    exit 1
fi

# Build the image
echo "Building image..."
docker build -t claude-sandbox:latest -f docker/Dockerfile.sandbox .

if [ $? -eq 0 ]; then
    echo "Successfully built claude-sandbox:latest"
    
    # Show image info
    echo -e "\nImage details:"
    docker images claude-sandbox:latest
    
    # Test the image
    echo -e "\nTesting the image..."
    docker run --rm claude-sandbox:latest sh -c "echo 'Sandbox test successful'"
    
    if [ $? -eq 0 ]; then
        echo -e "\n✓ Sandbox image is ready to use!"
        echo "To use it, run: claude-prompts run --sandbox docker --sandbox-image claude-sandbox:latest"
    else
        echo -e "\n✗ Image test failed"
        exit 1
    fi
else
    echo "Failed to build sandbox image"
    exit 1
fi