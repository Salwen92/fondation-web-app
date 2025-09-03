# Fondation CLI Integration Guide

## Overview

This guide documents the definitive approach for integrating the Fondation CLI's `analyze` command into a web application server environment. The analyze command orchestrates a sophisticated 6-step AI-powered tutorial generation workflow.

## Key Facts

### Execution Characteristics
- **Command**: `bun run src/analyze-all.ts /path/to/project`
- **Duration**: 30-60+ minutes for typical repositories (7 minutes for minimal 3-file projects)
- **Mode**: Fully headless/non-interactive
- **Output**: Silent execution (no stdout progress)
- **Dependencies**: Requires `@anthropic-ai/claude-code` SDK

### Output Structure
The analyze command generates the following file structure:
```
.claude-tutorial-output/
├── step1_abstractions.yaml     # Core abstractions extracted
├── step2_relationships.yaml    # Component relationships mapped
├── step3_order.yaml            # Chapter ordering determined
├── chapters/                   # Raw chapter content (multiple .md files)
├── reviewed-chapters/          # Enhanced chapters (multiple .md files)
└── tutorials/                  # Interactive tutorials (multiple .md files)
```

## Integration Architecture

### 1. Docker Container Setup

```dockerfile
FROM node:20-alpine

# Install bun for TypeScript execution
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install git for repository cloning
RUN apk add --no-cache git

# Copy Fondation source code
WORKDIR /fondation
COPY fondation-source/ .
RUN bun install

# Setup execution environment
WORKDIR /app
COPY server.js .
RUN npm install express body-parser

EXPOSE 8080
CMD ["node", "server.js"]
```

### 2. Server Implementation

```javascript
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// Main execution endpoint
app.post('/analyze', async (req, res) => {
  const { 
    jobId, 
    repoUrl, 
    githubToken,  // For private repositories
    callbackUrl, 
    callbackToken 
  } = req.body;
  
  // Immediate response
  res.json({ 
    status: 'accepted', 
    jobId,
    estimatedMinutes: 45 
  });
  
  // Execute in background
  processRepository(jobId, repoUrl, githubToken, callbackUrl, callbackToken)
    .catch(error => {
      console.error(`Job ${jobId} failed:`, error);
    });
});

async function processRepository(jobId, repoUrl, githubToken, callbackUrl, callbackToken) {
  const repoPath = `/tmp/repos/${jobId}`;
  const outputDir = `/tmp/outputs/${jobId}`;
  
  try {
    // Step 1: Clone repository
    await cloneRepository(repoUrl, repoPath, githubToken);
    await notifyProgress(callbackUrl, callbackToken, jobId, 'Repository cloned');
    
    // Step 2: Run analyze command
    const startTime = Date.now();
    const command = `cd /fondation && bun run src/analyze-all.ts ${repoPath}`;
    
    const analyzeProcess = exec(command, {
      timeout: 3600000, // 60 minutes
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_OUTPUT_DIR: outputDir
      }
    });
    
    // Step 3: Monitor progress via file creation
    const progressInterval = setInterval(async () => {
      const progress = await checkProgress(outputDir);
      if (progress) {
        await notifyProgress(callbackUrl, callbackToken, jobId, progress);
      }
    }, 10000); // Check every 10 seconds
    
    // Step 4: Wait for completion
    await new Promise((resolve, reject) => {
      analyzeProcess.on('exit', (code) => {
        clearInterval(progressInterval);
        if (code === 0) resolve();
        else reject(new Error(`Process exited with code ${code}`));
      });
      
      analyzeProcess.on('error', reject);
    });
    
    // Step 5: Gather and upload results
    const duration = Math.round((Date.now() - startTime) / 1000);
    const files = await gatherOutputFiles(outputDir);
    
    await notifyCompletion(callbackUrl, callbackToken, {
      jobId,
      status: 'completed',
      duration,
      files
    });
    
  } catch (error) {
    await notifyError(callbackUrl, callbackToken, jobId, error.message);
  } finally {
    // Cleanup
    await cleanup(repoPath, outputDir);
  }
}

async function cloneRepository(repoUrl, targetPath, githubToken) {
  const cloneUrl = githubToken 
    ? `https://${githubToken}@github.com/${repoUrl}.git`
    : `https://github.com/${repoUrl}.git`;
    
  return new Promise((resolve, reject) => {
    exec(`git clone ${cloneUrl} ${targetPath}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function checkProgress(outputDir) {
  const progressMap = {
    'step1_abstractions.yaml': 'Extracting abstractions (Step 1/6)',
    'step2_relationships.yaml': 'Analyzing relationships (Step 2/6)',
    'step3_order.yaml': 'Determining order (Step 3/6)',
    'chapters': 'Generating chapters (Step 4/6)',
    'reviewed-chapters': 'Reviewing content (Step 5/6)',
    'tutorials': 'Creating tutorials (Step 6/6)'
  };
  
  for (const [file, message] of Object.entries(progressMap)) {
    const filePath = path.join(outputDir, file);
    try {
      await fs.access(filePath);
      return message;
    } catch {
      // File doesn't exist yet, continue checking
    }
  }
  
  return null;
}

async function gatherOutputFiles(outputDir) {
  const files = [];
  const categories = ['chapters', 'reviewed-chapters', 'tutorials'];
  
  // Gather YAML files
  for (const yamlFile of ['step1_abstractions.yaml', 'step2_relationships.yaml', 'step3_order.yaml']) {
    const content = await fs.readFile(path.join(outputDir, yamlFile), 'utf-8');
    files.push({
      path: yamlFile,
      content,
      type: 'yaml'
    });
  }
  
  // Gather markdown files from directories
  for (const category of categories) {
    const dirPath = path.join(outputDir, category);
    const dirFiles = await fs.readdir(dirPath);
    
    for (const file of dirFiles) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
        files.push({
          path: `${category}/${file}`,
          content,
          type: 'markdown'
        });
      }
    }
  }
  
  return files;
}

async function notifyProgress(callbackUrl, token, jobId, message) {
  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'X-Job-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobId,
      type: 'progress',
      message,
      timestamp: Date.now()
    })
  });
}

async function notifyCompletion(callbackUrl, token, data) {
  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'X-Job-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

async function notifyError(callbackUrl, token, jobId, error) {
  await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'X-Job-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobId,
      type: 'error',
      error,
      timestamp: Date.now()
    })
  });
}

async function cleanup(repoPath, outputDir) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Fondation worker listening on port ${PORT}`);
});
```

## Deployment Configuration

### Environment Variables
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
PORT=8080
MAX_CONCURRENT_JOBS=3
CLEANUP_INTERVAL=3600000
```

### Cloud Run Deployment
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: fondation-worker
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 10
      timeoutSeconds: 3600  # 60 minutes
      containers:
      - image: gcr.io/PROJECT/fondation-worker
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: anthropic-key
              key: api-key
```

### Deployment Commands
```bash
# Build and push Docker image
docker build -t fondation-worker .
docker tag fondation-worker gcr.io/PROJECT/fondation-worker
docker push gcr.io/PROJECT/fondation-worker

# Deploy to Cloud Run
gcloud run deploy fondation-worker \
  --image gcr.io/PROJECT/fondation-worker \
  --platform managed \
  --region us-central1 \
  --timeout 3600 \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 10 \
  --set-env-vars ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
```

## Progress Monitoring Strategy

Since the analyze command runs silently, progress must be inferred from file creation:

### Progress Checkpoints
1. **0%**: Job started, cloning repository
2. **5%**: Repository cloned successfully
3. **10%**: Step 1 complete (abstractions.yaml exists)
4. **25%**: Step 2 complete (relationships.yaml exists)
5. **35%**: Step 3 complete (order.yaml exists)
6. **50%**: Step 4 complete (chapters/ directory populated)
7. **75%**: Step 5 complete (reviewed-chapters/ directory populated)
8. **95%**: Step 6 complete (tutorials/ directory populated)
9. **100%**: All files gathered and uploaded

## Error Handling

### Common Failure Scenarios

1. **Repository Clone Failure**
   - Private repo without valid token
   - Repository doesn't exist
   - Network timeout

2. **Analyze Command Failure**
   - Insufficient ANTHROPIC_API_KEY quota
   - Repository too large (>500MB)
   - Malformed code causing parser errors
   - 60-minute timeout exceeded

3. **Output Collection Failure**
   - Disk space exhausted
   - Corrupted output files
   - Missing expected files

### Retry Strategy
```javascript
async function retryableAnalyze(repoPath, outputDir, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runAnalyze(repoPath, outputDir);
      return;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 10000));
      }
    }
  }
  
  throw lastError;
}
```

## Testing the Integration

### Local Testing
```bash
# 1. Start local server
node server.js

# 2. Test with small repository
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-123",
    "repoUrl": "owner/small-repo",
    "callbackUrl": "http://localhost:3000/webhook",
    "callbackToken": "test-token"
  }'

# 3. Monitor progress
tail -f /tmp/outputs/test-123/progress.log
```

### Production Testing
1. Deploy to staging environment
2. Test with repositories of varying sizes:
   - Tiny (1-5 files): ~5-10 minutes
   - Small (10-50 files): ~15-30 minutes  
   - Medium (50-200 files): ~30-45 minutes
   - Large (200+ files): ~45-60 minutes

## Performance Optimization

### Current Limitations
- Single-threaded execution
- No caching of intermediate results
- Full repository analysis every time
- Memory-intensive for large codebases

### Future Optimizations
1. **Incremental Analysis**: Only analyze changed files
2. **Result Caching**: Cache results for unchanged repositories
3. **Parallel Processing**: Run multiple analysis steps concurrently
4. **Resource Scaling**: Adjust CPU/memory based on repository size

## Security Considerations

### Token Management
- Never log GitHub tokens
- Encrypt tokens at rest
- Use short-lived tokens when possible
- Implement token rotation

### Sandbox Execution
- Run in isolated containers
- Limit network access
- Restrict file system access
- Monitor resource usage

### Input Validation
```javascript
function validateRepository(repoUrl) {
  // Validate GitHub URL format
  const pattern = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/;
  if (!pattern.test(repoUrl)) {
    throw new Error('Invalid repository format');
  }
  
  // Check against blocklist
  if (BLOCKED_REPOS.includes(repoUrl)) {
    throw new Error('Repository not allowed');
  }
  
  return true;
}
```

## Monitoring and Logging

### Key Metrics
- Job success rate
- Average completion time by repository size
- API token usage per job
- Error frequency by type
- Queue depth and wait times

### Logging Strategy
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log job lifecycle
logger.info('Job started', { jobId, repoUrl, timestamp: Date.now() });
logger.info('Progress update', { jobId, step: 'abstractions', timestamp: Date.now() });
logger.error('Job failed', { jobId, error: error.message, timestamp: Date.now() });
```

## Troubleshooting Guide

### Issue: Job times out after 60 minutes
**Solution**: Repository too large. Consider implementing chunking or increasing timeout.

### Issue: "Cannot find module '@anthropic-ai/claude-code'"
**Solution**: Ensure Fondation source is properly copied with dependencies installed.

### Issue: No progress updates
**Solution**: Check output directory permissions and disk space.

### Issue: High memory usage
**Solution**: Implement streaming for large file operations, increase container memory.

## Conclusion

This integration guide provides a production-ready approach for running the Fondation CLI's analyze command in a web application context. The key insights are:

1. Run from source, not bundled CLI
2. Expect 30-60+ minute execution times
3. Monitor progress via file creation
4. Handle failures gracefully with retries
5. Set proper user expectations upfront

By following this guide, you can successfully integrate Fondation's powerful course generation capabilities into your web application.