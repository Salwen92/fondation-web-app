# CLI Analyze Command - Complete Guide

## Overview
The `fondation analyze` command is the core functionality that processes a repository and generates comprehensive educational content using Claude AI. It performs a 6-step analysis process to create structured learning materials.

## Development Setup and Execution

### Prerequisites
- Bun runtime installed
- Claude AI API access (via `@anthropic-ai/claude-code` SDK)
- Repository access (local filesystem or GitHub)

### Environment Variables
```bash
# Required
CLAUDE_MODEL=claude-sonnet-4-20250514  # or claude-opus-4-20250514

# Optional
CLAUDE_OUTPUT_DIR=.claude-tutorial-output  # Default output directory
CLAUDE_SESSION_ID=<uuid>                   # For session persistence
ENABLE_MESSAGE_LOGGING=true                # Log Claude interactions
```

### Running in Development

#### Direct Source Execution
```bash
cd fondation/packages/cli
bun run src/cli.ts analyze <path> [options]

# Or using the dev script
bun run cli:source analyze ./my-repo
```

#### Using Built CLI
```bash
# Build first
bun run build

# Run built version
bun dist/cli.js analyze <path> [options]

# Or bundled version
bun dist/cli.bundled.mjs analyze <path> [options]
```

### Command Options
```bash
fondation analyze <path> [options]

Arguments:
  path                    Path to the codebase to analyze

Options:
  -o, --output-dir <dir>  Output directory (default: .claude-tutorial-output)
  -m, --model <model>     Claude model to use (sonnet/opus)
  --skip-existing         Skip files that already exist
  --overwrite            Overwrite existing files
  -p, --parallel <n>     Number of parallel operations (default: 5)
  -s, --steps <steps>    Run specific steps only (comma-separated)
  
Global Options:
  -v, --verbose          Enable verbose output for debugging
  -q, --quiet           Suppress all logs and tool output
  --json                Output structured JSON format
  --profile <profile>   Use configuration profile (clean, dev, debug, production, test)
  --config <path>       Path to custom config file
  --log-file <path>     Write logs to specified file
```

### Analysis Steps

The analyze command executes 6 sequential steps:

1. **Extract** (`step1_abstractions.yaml`)
   - Identifies core abstractions and concepts
   - Maps system architecture
   - Documents key components

2. **Analyze** (`step2_relationships.yaml`)
   - Maps relationships between components
   - Identifies dependencies
   - Documents interactions

3. **Order** (`step3_order.yaml`)
   - Determines optimal learning path
   - Orders chapters logically
   - Creates curriculum structure

4. **Generate Chapters** (`chapters/`)
   - Creates detailed chapter content
   - Includes code examples
   - Generates exercises

5. **Review Chapters** (`reviewed-chapters/`)
   - Enhances chapter quality
   - Adds additional examples
   - Improves explanations

6. **Generate Tutorials** (`tutorials/`)
   - Creates interactive tutorials
   - Includes hands-on exercises
   - Provides practical applications

### Running Specific Steps
```bash
# Run only extraction and analysis
fondation analyze ./repo --steps extract,analyze

# Run only chapter generation
fondation analyze ./repo --steps generate-chapters

# Run from chapter generation onwards
fondation analyze ./repo --steps generate-chapters,review-chapters,generate-tutorials
```

## Docker/Production Execution

### Building the Docker Image
```bash
cd fondation
bun run docker:build

# Or manually
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .
```

### Running with Docker

#### Basic Analysis
```bash
docker run --rm \
  --env-file .env \
  -v "$PWD":/workspace \
  -v "$PWD/output":/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output
```

#### With Custom Options
```bash
docker run --rm \
  -e CLAUDE_MODEL=claude-opus-4-20250514 \
  -v "$PWD":/workspace \
  -v "$PWD/analysis":/analysis \
  fondation/cli:latest \
  analyze /workspace \
    --output-dir /analysis \
    --steps extract,analyze,order \
    --verbose
```

### Docker Environment Variables
```bash
# Pass through .env file
docker run --env-file .env ...

# Or set individually
docker run \
  -e CLAUDE_MODEL=claude-sonnet-4-20250514 \
  -e CLAUDE_OUTPUT_DIR=/output \
  ...
```

### Volume Mounts
- `/workspace`: Mount your repository here
- `/output`: Mount for analysis results
- Prompts are bundled in the image at `/app/cli/dist/prompts`

## Output Structure

After successful execution, the output directory contains:

```
output/
├── step1_abstractions.yaml      # Core concepts and abstractions
├── step2_relationships.yaml     # Component relationships
├── step3_order.yaml             # Chapter ordering
├── chapters/                    # Generated chapter content
│   ├── chapter_001_*.md
│   ├── chapter_002_*.md
│   └── ...
├── reviewed-chapters/           # Enhanced chapters
│   ├── chapter_001_*.md
│   ├── chapter_002_*.md
│   └── ...
└── tutorials/                   # Interactive tutorials
    ├── tutorial_001_*.md
    ├── tutorial_002_*.md
    └── ...
```

## Troubleshooting

### Common Issues

#### 1. Claude SDK Not Found
```bash
Error: Cannot find module '@anthropic-ai/claude-code'
```
**Solution**: Install the SDK
```bash
bun add @anthropic-ai/claude-code
```

#### 2. Prompts Not Found
```bash
Error: Prompt file not found: prompts/1-abstractions.md
```
**Solution**: Ensure prompts are in the correct location or use Docker image

#### 3. Memory Issues
```bash
Error: JavaScript heap out of memory
```
**Solution**: Increase Node memory limit
```bash
NODE_OPTIONS="--max-old-space-size=4096" bun run cli:source analyze ./repo
```

#### 4. Docker Permission Issues
```bash
Error: Permission denied
```
**Solution**: Ensure proper volume permissions
```bash
# Use current user's UID/GID
docker run --user $(id -u):$(id -g) ...
```

### Debug Mode
Enable verbose logging for troubleshooting:
```bash
# Development
bun run cli:source analyze ./repo --verbose --profile debug

# Docker
docker run --rm --env-file .env \
  fondation/cli:latest analyze /workspace \
  --verbose --profile debug
```

## Performance Optimization

### Parallel Processing
Increase parallel operations for faster processing:
```bash
fondation analyze ./repo --parallel 10
```

### Skip Existing Files
Avoid regenerating existing content:
```bash
fondation analyze ./repo --skip-existing
```

### Step Selection
Run only necessary steps:
```bash
# Quick analysis (no content generation)
fondation analyze ./repo --steps extract,analyze,order

# Content generation only (requires previous YAML files)
fondation analyze ./repo --steps generate-chapters,review-chapters
```

## Integration with Worker

The Worker package can execute the CLI analyze command programmatically:

```typescript
// Worker executes CLI via strategy pattern
const strategy = CLIStrategyFactory.create(cliPath);
const result = await strategy.execute(repoPath, {
  prompt: "Analyze repository",
  onProgress: (step) => console.log(step)
});
```

This enables the web UI to trigger analysis jobs that are processed asynchronously by the worker.