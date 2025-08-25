# Local Development Setup - Scaleway Hybrid Architecture

This guide provides step-by-step instructions for running the complete Fondation Web App locally with the new Scaleway hybrid architecture.

## Architecture Overview

The application uses a hybrid architecture optimized for Scaleway:
- **API Gateway** (Scaleway Serverless Container): Instant response, handles HTTP requests
- **Worker** (Scaleway Serverless Job): Long-running tasks (up to 24 hours)
- **Web App** (Next.js): User interface
- **Database** (Convex): Real-time data synchronization

## Prerequisites

- Node.js 20+ and npm/bun
- Docker (optional, for containerized testing)
- Fondation CLI source code at `/Users/salwen/Documents/Cyberscaling/fondation`
- Anthropic API key

## Environment Setup

### 1. Set Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret

# Convex
NEXT_PUBLIC_CONVEX_URL=your-convex-url

# Anthropic API (for Fondation CLI)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Scaleway Gateway (for local development)
SCALEWAY_GATEWAY_URL=http://localhost:8081
```

### 2. Install Dependencies

```bash
# Install web app dependencies
bun install

# Install Scaleway Gateway dependencies
cd scaleway-gateway
npm install
cd ..

# No installation needed for worker (uses system Node.js)
```

## Starting the Services

You need to run **three services** in parallel. Open three terminal windows:

### Terminal 1: Convex Backend

```bash
# Start Convex development server
bunx convex dev
```

This will:
- Start the Convex backend
- Watch for schema changes
- Provide real-time synchronization

### Terminal 2: Scaleway API Gateway

```bash
# Navigate to gateway directory
cd scaleway-gateway

# Start in development mode (spawns local workers)
npm run dev
```

This will:
- Start the API Gateway on port 8081
- Enable local worker spawning for development
- Show logs for all worker processes

Available endpoints:
- `GET http://localhost:8081/` - Health check
- `POST http://localhost:8081/analyze` - Trigger analysis job
- `POST http://localhost:8081/cancel/:jobId` - Cancel running job
- `GET http://localhost:8081/status` - View active jobs

### Terminal 3: Next.js Web Application

```bash
# Start Next.js development server
bun run dev
```

This will:
- Start the web app on port 3000
- Enable hot module replacement
- Connect to Convex and the API Gateway

## Testing the Complete Flow

### 1. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Sign In with GitHub

1. Click "Se connecter avec GitHub"
2. Authorize the OAuth application
3. You'll be redirected to the dashboard

### 3. Generate Documentation

1. Select a repository from your list
2. Click "Générer Documentation"
3. The system will:
   - Create a job in Convex
   - Trigger the Scaleway Gateway
   - Gateway spawns a local worker process
   - Worker clones the repository
   - Worker runs Fondation CLI analyze
   - Progress updates are sent to Convex
   - UI updates in real-time

### 4. Monitor Progress

You can monitor the job progress in multiple ways:

**In the UI:**
- Real-time progress bar
- Status messages
- Step indicators

**In the Gateway Terminal:**
```bash
# You'll see logs like:
[Development Mode] Starting local worker for job j123...
[Worker j123] stdout: Cloning repository...
[Worker j123] stdout: Running analyze command...
```

**Check Active Jobs:**
```bash
curl http://localhost:8081/status
```

**View Convex Logs:**
Check the Convex terminal for database updates and callbacks.

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

If ports are already in use:
- Web app: Change port with `PORT=3001 bun run dev`
- Gateway: Edit `PORT` in `scaleway-gateway/server-gateway.ts`
- Convex: Will automatically find an available port

#### 2. Worker Fails to Start

Check:
- Anthropic API key is set correctly
- Fondation CLI path exists (`/Users/salwen/Documents/Cyberscaling/fondation`)
- Node.js version is 20+

#### 3. GitHub Authentication Issues

Ensure:
- GitHub OAuth app is configured correctly
- Callback URL is `http://localhost:3000/api/auth/callback/github`
- GITHUB_ID and GITHUB_SECRET are correct

#### 4. Worker Process Hangs

To kill a stuck worker:
```bash
# Find the process
ps aux | grep worker.js

# Kill it
kill -9 <PID>

# Or use the cancel endpoint
curl -X POST http://localhost:8081/cancel/<jobId>
```

## Development Tips

### Testing Worker Directly

You can test the worker script directly without the gateway:

```bash
cd scaleway-worker

# Set required environment variables
export JOB_ID=test-123
export REPOSITORY_URL=https://github.com/example/repo
export BRANCH=main
export CALLBACK_URL=http://localhost:3000/api/webhook/job-callback
export CALLBACK_TOKEN=test-token
export ANTHROPIC_API_KEY=your-key

# Run the worker
node worker.js
```

### Using Docker (Optional)

To test the containerized version:

```bash
# Build images
cd scaleway-gateway
docker build -t scaleway-gateway .

cd ../scaleway-worker
docker build -t scaleway-worker \
  --build-context fondation-source=/Users/salwen/Documents/Cyberscaling/fondation .

# Run gateway container
docker run -p 8081:8081 \
  -e NODE_ENV=development \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  scaleway-gateway
```

### Debugging

1. **Enable verbose logging:**
   ```bash
   DEBUG=* npm run dev  # In gateway directory
   ```

2. **Check Convex functions:**
   - Open Convex dashboard
   - View function logs
   - Check data in tables

3. **Monitor network requests:**
   - Open browser DevTools
   - Check Network tab for API calls
   - Verify callback URLs are correct

## Production Deployment

When ready to deploy to Scaleway:

1. **Deploy Gateway to Scaleway Serverless Container:**
   ```bash
   # Build and push image
   docker build -t rg.fr-par.scw.cloud/fondation/gateway:latest scaleway-gateway
   docker push rg.fr-par.scw.cloud/fondation/gateway:latest
   
   # Deploy container
   scw container container create \
     name=fondation-gateway \
     namespace-id=$NAMESPACE_ID \
     registry-image=rg.fr-par.scw.cloud/fondation/gateway:latest
   ```

2. **Deploy Worker to Scaleway Serverless Jobs:**
   ```bash
   # Build and push image
   docker build -t rg.fr-par.scw.cloud/fondation/worker:latest scaleway-worker
   docker push rg.fr-par.scw.cloud/fondation/worker:latest
   
   # Create job definition
   scw jobs definition create \
     name=fondation-worker \
     image-uri=rg.fr-par.scw.cloud/fondation/worker:latest
   ```

3. **Update environment variables:**
   - Set `SCALEWAY_GATEWAY_URL` to production URL
   - Configure Scaleway API credentials
   - Update callback URLs

## Architecture Benefits

This hybrid approach provides:
- ✅ **Instant response** from the API Gateway
- ✅ **60-minute+ execution** time for analysis
- ✅ **Cost efficiency** with scale-to-zero
- ✅ **Local development** that mirrors production
- ✅ **Easy debugging** with separate components

## Support

For issues or questions:
- Check the [main README](README.md)
- Review [cloud-run](cloud-run/README.md) for comparison
- Open an issue on GitHub