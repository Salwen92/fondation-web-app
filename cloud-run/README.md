# Fondation Cloud Run Service

This directory contains the Cloud Run service for executing Fondation CLI documentation generation jobs.

## Overview

The service provides a webhook endpoint that:
1. Receives job requests from the web application
2. Clones the specified repository
3. Runs the Fondation CLI to generate documentation
4. Sends callbacks to update job status

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for containerized testing)
- Fondation CLI bundle (`cli.bundled.cjs`)

### Setup

1. Install dependencies:
```bash
bun install
```

2. Copy CLI and prompts from the main Fondation project:
```bash
bun run copy-cli
bun run copy-prompts
```

3. Start the local server:
```bash
npm run dev
# or use the test script
./test-local.sh
```

The server will start on port 8080.

### Testing Endpoints

#### Health Check
```bash
curl http://localhost:8080/
```

#### Execute Job
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-job-123",
    "repositoryUrl": "https://github.com/example/repo",
    "branch": "main",
    "prompt": "general",
    "callbackUrl": "http://localhost:3000/api/webhook/job-callback",
    "callbackToken": "test-token-456"
  }'
```

## Docker Development

### Build the image:
```bash
bun run docker:build
```

### Run the container:
```bash
bun run docker:run
```

## Google Cloud Deployment

### Prerequisites
1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. Cloud Run API enabled

### Environment Setup

1. Set your project ID:
```bash
gcloud config set project YOUR_PROJECT_ID
```

2. Enable required APIs:
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Deploy to Cloud Run

1. Deploy directly from source:
```bash
bun run deploy
```

Or manually:
```bash
gcloud run deploy fondation-cli \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --timeout 300 \
  --max-instances 10
```

2. Get the service URL:
```bash
gcloud run services describe fondation-cli \
  --region us-central1 \
  --format 'value(status.url)'
```

### Configure Web App

Add the Cloud Run URL to your web app's `.env`:
```env
CLOUD_RUN_URL=https://fondation-cli-xxxxx-uc.a.run.app
CLOUD_RUN_TOKEN=your-optional-auth-token
```

## Security Considerations

### Authentication Options

1. **Allow unauthenticated** (for testing):
   - Simple but less secure
   - Use custom token validation in the app

2. **Require authentication** (recommended for production):
   ```bash
   gcloud run deploy --no-allow-unauthenticated
   ```
   Then configure service account:
   ```bash
   gcloud run services add-iam-policy-binding fondation-cli \
     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
     --role="roles/run.invoker"
   ```

### Environment Variables

Set environment variables in Cloud Run:
```bash
gcloud run services update fondation-cli \
  --set-env-vars NODE_ENV=production
```

## Monitoring

View logs:
```bash
gcloud run services logs read fondation-cli --limit 50
```

View metrics in Google Cloud Console:
- Go to Cloud Run > Services > fondation-cli
- Check Metrics, Logs, and Revisions tabs

## Cost Optimization

Cloud Run Free Tier includes:
- 2 million requests per month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute time

Tips to stay within free tier:
- Set max instances to limit concurrent executions
- Use appropriate memory allocation (1-2GB is usually sufficient)
- Implement request timeouts
- Clean up temporary files after each job

## Troubleshooting

### Common Issues

1. **CLI bundle not found**
   - Ensure `cli.bundled.cjs` is copied to the cloud-run directory
   - Check file permissions

2. **Git clone fails**
   - Verify repository URL is accessible
   - Check if private repos need authentication

3. **Callback fails**
   - Verify callback URL is accessible from Cloud Run
   - Check token validation

4. **Memory issues**
   - Increase memory allocation in Cloud Run
   - Implement file cleanup after processing

### Debug Mode

Set `NODE_ENV=development` for verbose logging:
```bash
NODE_ENV=development node server.js
```

## API Documentation

### POST /execute

Executes a documentation generation job.

**Request Body:**
```json
{
  "jobId": "string (required)",
  "repositoryUrl": "string (required)",
  "branch": "string (optional, default: main)",
  "prompt": "string (optional, default: general)",
  "callbackUrl": "string (required)",
  "callbackToken": "string (required)"
}
```

**Response:**
```json
{
  "status": "accepted",
  "jobId": "string",
  "message": "Job processing started"
}
```

**Callback Payload:**

Progress update:
```json
{
  "jobId": "string",
  "type": "progress",
  "status": "cloning|analyzing",
  "message": "string",
  "timestamp": "ISO 8601"
}
```

Success:
```json
{
  "jobId": "string",
  "type": "complete",
  "status": "success",
  "documentation": {
    "filename.md": "content..."
  },
  "timestamp": "ISO 8601"
}
```

Error:
```json
{
  "jobId": "string",
  "type": "error",
  "status": "failed",
  "error": "string",
  "timestamp": "ISO 8601"
}
```