# Scaleway Worker

This is the worker component that runs as Scaleway Serverless Jobs for long-running Fondation CLI analyze tasks.

## Architecture

- **Scaleway Serverless Jobs**: Handles long-running tasks (up to 24 hours)
- **Docker Container**: Includes Fondation CLI and all dependencies
- **Callback System**: Reports progress back to Convex database

## Local Development

The worker runs locally in development mode when triggered by the API Gateway:

```bash
# Worker is automatically spawned by the gateway
# No manual startup needed
```

## Docker Build

### Building with ANTHROPIC_API_KEY

The ANTHROPIC_API_KEY must be baked into the Docker image during build:

```bash
# Build with API key baked in
docker build \
  --build-arg ANTHROPIC_API_KEY=your-api-key \
  --build-context fondation-source=/path/to/fondation \
  -t scaleway-worker .
```

### Testing Docker Image Locally

```bash
# Test with environment variables
docker run \
  -e JOB_ID=test123 \
  -e REPOSITORY_URL=https://github.com/user/repo \
  -e BRANCH=main \
  -e CALLBACK_URL=http://localhost:3000/api/webhook/job-callback \
  -e CALLBACK_TOKEN=test-token \
  scaleway-worker
```

## Environment Variables

Required in runtime:
- `JOB_ID`: Unique job identifier
- `REPOSITORY_URL`: GitHub repository URL
- `BRANCH`: Branch to analyze
- `CALLBACK_URL`: Webhook URL for progress updates
- `CALLBACK_TOKEN`: Authentication token for callbacks

Optional:
- `GITHUB_TOKEN`: For private repositories

## Deployment to Scaleway

1. Build and push Docker image to Scaleway Container Registry
2. Create Serverless Job definition
3. Configure environment variables in Scaleway console
4. Job will be triggered by API Gateway

## Progress Tracking

The worker reports progress through callbacks:
1. Cloning repository
2. Extracting core abstractions
3. Analyzing component relationships
4. Determining chapter order
5. Generating chapter content
6. Reviewing and enhancing chapters
7. Creating interactive tutorials

## Files Generated

Output files are gathered and sent back via callback:
- `step1_abstractions.yaml`
- `step2_relationships.yaml`
- `step3_order.yaml`
- `chapters/*.md`
- `reviewed-chapters/*.md`
- `tutorials/*.md`