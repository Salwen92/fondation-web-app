#!/bin/bash

# Migration script to move fondation-web-app into monorepo structure
# Run from the fondation-web-app directory

set -e

echo "🚀 Starting monorepo migration..."

# Check if fondation directory exists
if [ ! -d "fondation" ]; then
  echo "❌ fondation directory not found. Please run this from fondation-web-app directory"
  exit 1
fi

echo "📦 Creating backup..."
cp -r . ../fondation-web-app-backup-$(date +%Y%m%d-%H%M%S)

echo "📁 Moving web app to monorepo structure..."

# Create apps/web directory
mkdir -p fondation/apps/web

# Copy essential directories and files, excluding vendor-specific ones
echo "📋 Copying application files..."
cp -r src fondation/apps/web/
cp -r convex fondation/apps/web/
cp -r public fondation/apps/web/
cp package.json fondation/apps/web/
cp tsconfig.json fondation/apps/web/
cp next.config.js fondation/apps/web/ 2>/dev/null || true
cp tailwind.config.ts fondation/apps/web/ 2>/dev/null || cp tailwind.config.js fondation/apps/web/ 2>/dev/null || true
cp postcss.config.js fondation/apps/web/ 2>/dev/null || true
cp .env.example fondation/apps/web/ 2>/dev/null || true
cp README.md fondation/apps/web/ 2>/dev/null || true

# Update the web app's package.json name
echo "📝 Updating package.json..."
cd fondation/apps/web
if [ -f package.json ]; then
  # Update package name
  sed -i '' 's/"name": "fondation-web-app"/"name": "@fondation\/web"/' package.json 2>/dev/null || \
  sed -i 's/"name": "fondation-web-app"/"name": "@fondation\/web"/' package.json
fi
cd ../../..

# Create worker app structure
echo "🤖 Creating worker app structure..."
mkdir -p fondation/apps/worker/src

# Create worker package.json
cat > fondation/apps/worker/package.json << 'EOF'
{
  "name": "@fondation/worker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fondation/shared": "workspace:*",
    "convex": "^1.26.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "tsx": "^4.0.0",
    "typescript": "^5.8.2"
  }
}
EOF

# Create worker tsconfig
cat > fondation/apps/worker/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create root tsconfig if it doesn't exist
if [ ! -f fondation/tsconfig.json ]; then
cat > fondation/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@fondation/shared": ["./packages/shared/src/index.ts"]
    }
  }
}
EOF
fi

# Create .gitignore for monorepo
cat > fondation/.gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Production
dist/
build/
out/
.next/

# Misc
.DS_Store
*.pem
.vscode/
.idea/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
bun-debug.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# Convex
.convex/

# Temporary files
tmp/
temp/

# Logs
logs/
*.log
EOF

echo "📦 Installing dependencies..."
cd fondation
bun install

echo "✅ Migration structure created!"
echo ""
echo "Next steps:"
echo "1. Review the migrated structure in fondation/"
echo "2. Copy any missing configuration files"
echo "3. Update environment variables"
echo "4. Test with: cd fondation && bun dev:web"
echo "5. Remove old vendor-specific directories:"
echo "   - rm -rf scaleway-gateway"
echo "   - rm -rf scaleway-worker"
echo ""
echo "Backup created at: ../fondation-web-app-backup-$(date +%Y%m%d-%H%M%S)"