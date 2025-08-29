#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN not found in .env file"
    exit 1
fi

# Configure npm to use the token
echo "@fondation-io:registry=https://npm.pkg.github.com" > ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc

echo "✅ npm authentication configured successfully"
echo "You can now install the package with: npm install @fondation-io/fondation@beta"