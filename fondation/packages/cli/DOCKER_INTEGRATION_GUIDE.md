# Docker Integration Guide for Fondation Analyze

## Overview
This guide provides instructions for running the Fondation `analyze` command in a Docker container, enabling headless operation suitable for CI/CD pipelines and automated workflows.

## Prerequisites
- Docker 20.10+ installed
- Docker Compose (optional, for compose usage)
- Anthropic API key (for non-dry-run execution)

## Quick Start

### 1. Build the Docker Image
```bash
docker build -t fondation-analyze:latest .
```

### 2. Run Analysis on a Project
```bash
# Basic usage
docker run --rm \
  -v /path/to/project:/workspace:ro \
  -v ./output:/output \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  fondation-analyze:latest \
  analyze /workspace --output-dir /output

# Dry run (no API calls)
docker run --rm \
  -v /path/to/project:/workspace:ro \
  -v ./output:/output \
  fondation-analyze:latest \
  analyze /workspace --output-dir /output --dry-run
```

## Usage Methods

### Method 1: Shell Script (Recommended)
```bash
# Make script executable
chmod +x scripts/docker-analyze.sh

# Run analysis
./scripts/docker-analyze.sh /path/to/project -o ./docs

# With options
./scripts/docker-analyze.sh /path/to/project \
  --output ./documentation \
  --model claude-opus-4-20250514 \
  --verbose \
  --steps extract,analyze
```

### Method 2: Docker Compose
```bash
# Set environment variables
export PROJECT_PATH=/path/to/project
export OUTPUT_PATH=./analysis-output
export ANTHROPIC_API_KEY=your-api-key

# Run analysis
docker-compose up fondation-analyze

# Or for dry-run testing
docker-compose up fondation-test
```

### Method 3: Direct Docker Command
```bash
docker run --rm \
  -v "$(pwd)/target-project:/workspace:ro" \
  -v "$(pwd)/output:/output" \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e CLAUDE_MODEL=claude-sonnet-4-20250514 \
  fondation-analyze:latest \
  analyze /workspace \
  --output-dir /output \
  --verbose
```

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required for execution |
| `CLAUDE_MODEL` | Model to use | claude-sonnet-4-20250514 |
| `CLAUDE_OUTPUT_DIR` | Output directory inside container | /output |
| `VERBOSE` | Enable verbose logging | false |

### Volume Mounts
| Mount Point | Purpose | Mode |
|-------------|---------|------|
| `/workspace` | Project to analyze | Read-only |
| `/output` | Analysis results | Read-write |

### Available Analyze Options
- `--output-dir <dir>`: Output directory (default: /output)
- `--model <model>`: Claude model selection
- `--steps <steps>`: Run specific steps (extract,analyze,order,generate-chapters,review-chapters,generate-tutorials)
- `--dry-run`: Preview without API calls
- `--verbose`: Detailed logging
- `--json`: JSON output format
- `--parallel <n>`: Parallel operations (default: 5)
- `--overwrite`: Overwrite existing files

## CI/CD Integration

### GitHub Actions
```yaml
name: Analyze Codebase

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Fondation Docker Image
        run: docker build -t fondation-analyze:latest .
      
      - name: Run Analysis
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace:ro \
            -v ${{ github.workspace }}/docs:/output \
            -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
            fondation-analyze:latest \
            analyze /workspace --output-dir /output
      
      - name: Upload Analysis Results
        uses: actions/upload-artifact@v3
        with:
          name: analysis-results
          path: docs/
```

### GitLab CI
```yaml
analyze-codebase:
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_DRIVER: overlay2
  script:
    - docker build -t fondation-analyze:latest .
    - |
      docker run --rm \
        -v $CI_PROJECT_DIR:/workspace:ro \
        -v $CI_PROJECT_DIR/analysis:/output \
        -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
        fondation-analyze:latest \
        analyze /workspace --output-dir /output
  artifacts:
    paths:
      - analysis/
    expire_in: 1 week
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    
    environment {
        ANTHROPIC_API_KEY = credentials('anthropic-api-key')
    }
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t fondation-analyze:latest .'
            }
        }
        
        stage('Analyze Codebase') {
            steps {
                sh '''
                    docker run --rm \
                      -v ${WORKSPACE}:/workspace:ro \
                      -v ${WORKSPACE}/analysis:/output \
                      -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
                      fondation-analyze:latest \
                      analyze /workspace --output-dir /output
                '''
            }
        }
        
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'analysis/**/*', allowEmptyArchive: false
            }
        }
    }
}
```

## Testing and Validation

### 1. Test with Dry Run
```bash
# No API calls, validates setup
docker run --rm \
  -v /path/to/test-project:/workspace:ro \
  -v ./test-output:/output \
  fondation-analyze:latest \
  analyze /workspace --output-dir /output --dry-run --verbose
```

### 2. Test Single Step
```bash
# Test only extraction step
docker run --rm \
  -v /path/to/project:/workspace:ro \
  -v ./output:/output \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  fondation-analyze:latest \
  analyze /workspace --output-dir /output --steps extract
```

### 3. Validate Output
Expected output structure:
```
output/
├── step1_abstractions.yaml
├── step2_relationships.yaml
├── step3_order.yaml
├── chapters/
│   ├── chapter_1.md
│   ├── chapter_2.md
│   └── ...
├── reviewed-chapters/
│   ├── chapter_1.md
│   ├── chapter_2.md
│   └── ...
└── tutorials/
    ├── tutorial_1.md
    ├── tutorial_2.md
    └── ...
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```
   Error: ANTHROPIC_API_KEY environment variable is not set
   Solution: Export your API key or pass it with -e flag
   ```

2. **Permission Denied**
   ```
   Error: Permission denied when writing to output directory
   Solution: Ensure output directory has write permissions or use sudo
   ```

3. **Out of Memory**
   ```
   Error: Container killed due to memory limits
   Solution: Increase memory limits in docker-compose.yml or use --memory flag
   ```

4. **Build Failures**
   ```
   Error: npm install fails in Docker build
   Solution: Clear Docker cache with: docker build --no-cache -t fondation-analyze:latest .
   ```

### Debug Commands
```bash
# Check container logs
docker logs <container-id>

# Run interactive shell in container
docker run --rm -it \
  -v /path/to/project:/workspace:ro \
  --entrypoint /bin/bash \
  fondation-analyze:latest

# Test CLI inside container
docker run --rm fondation-analyze:latest --version
docker run --rm fondation-analyze:latest analyze --help
```

## Security Considerations

1. **API Key Management**
   - Never hardcode API keys in Dockerfiles or scripts
   - Use environment variables or secret management systems
   - Consider using Docker secrets for production

2. **File System Access**
   - Mount source code as read-only (`:ro`)
   - Limit output directory permissions
   - Run container as non-root user (already configured)

3. **Resource Limits**
   - Set memory and CPU limits to prevent resource exhaustion
   - Monitor container resource usage

## Performance Optimization

1. **Cache Docker Layers**
   ```bash
   # Build with cache
   docker build -t fondation-analyze:latest .
   
   # Force rebuild without cache
   docker build --no-cache -t fondation-analyze:latest .
   ```

2. **Parallel Processing**
   ```bash
   # Increase parallel operations
   docker run --rm \
     -v /path/to/project:/workspace:ro \
     -v ./output:/output \
     -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
     fondation-analyze:latest \
     analyze /workspace --output-dir /output --parallel 10
   ```

3. **Selective Steps**
   ```bash
   # Run only needed steps
   --steps extract,analyze,order
   ```

## Support and Issues

For issues or questions:
1. Check the [test results](./ANALYZE_TEST_RESULTS.md)
2. Review Docker logs with `docker logs <container-id>`
3. Run with `--verbose` flag for detailed output
4. Open an issue on the GitHub repository