#!/bin/bash
# Fondation Analyze Docker Runner Script
# Usage: ./docker-analyze.sh <project-path> [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PROJECT_PATH=""
OUTPUT_DIR="./analysis-output"
CLAUDE_MODEL="claude-sonnet-4-20250514"
DOCKER_IMAGE="fondation-analyze:latest"
ADDITIONAL_ARGS=""
BUILD_IMAGE=false
DRY_RUN=false

# Function to display usage
usage() {
    echo "Usage: $0 <project-path> [options]"
    echo ""
    echo "Arguments:"
    echo "  project-path          Path to the project to analyze"
    echo ""
    echo "Options:"
    echo "  -o, --output <dir>    Output directory (default: ./analysis-output)"
    echo "  -m, --model <model>   Claude model to use (default: claude-sonnet-4-20250514)"
    echo "  -b, --build           Build Docker image before running"
    echo "  -d, --dry-run         Run in dry-run mode (no API calls)"
    echo "  -v, --verbose         Enable verbose output"
    echo "  -s, --steps <steps>   Specific steps to run (comma-separated)"
    echo "  -h, --help            Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 ./my-project"
    echo "  $0 ./my-project -o ./docs -m claude-opus-4-20250514"
    echo "  $0 ./my-project --build --dry-run --verbose"
    echo "  $0 ./my-project --steps extract,analyze"
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -m|--model)
            CLAUDE_MODEL="$2"
            shift 2
            ;;
        -b|--build)
            BUILD_IMAGE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            ADDITIONAL_ARGS="$ADDITIONAL_ARGS --dry-run"
            shift
            ;;
        -v|--verbose)
            ADDITIONAL_ARGS="$ADDITIONAL_ARGS --verbose"
            shift
            ;;
        -s|--steps)
            ADDITIONAL_ARGS="$ADDITIONAL_ARGS --steps $2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            ;;
        *)
            if [ -z "$PROJECT_PATH" ]; then
                PROJECT_PATH="$1"
            else
                echo -e "${RED}Error: Multiple project paths specified${NC}"
                usage
            fi
            shift
            ;;
    esac
done

# Check if project path is provided
if [ -z "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project path is required${NC}"
    usage
fi

# Convert to absolute path
PROJECT_PATH=$(realpath "$PROJECT_PATH" 2>/dev/null || echo "$PROJECT_PATH")
OUTPUT_DIR=$(realpath "$OUTPUT_DIR" 2>/dev/null || echo "$OUTPUT_DIR")

# Validate project path exists
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}Error: Project path does not exist: $PROJECT_PATH${NC}"
    exit 1
fi

# Check for API key if not in dry-run mode
if [ "$DRY_RUN" = false ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}Warning: ANTHROPIC_API_KEY environment variable is not set${NC}"
    echo "The analyze command will fail without a valid API key."
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build Docker image if requested
if [ "$BUILD_IMAGE" = true ]; then
    echo -e "${GREEN}Building Docker image...${NC}"
    docker build -t "$DOCKER_IMAGE" .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to build Docker image${NC}"
        exit 1
    fi
fi

# Check if Docker image exists
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
    echo -e "${YELLOW}Docker image not found. Building...${NC}"
    docker build -t "$DOCKER_IMAGE" .
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to build Docker image${NC}"
        exit 1
    fi
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Display configuration
echo -e "${GREEN}Fondation Analyze Docker Runner${NC}"
echo "================================"
echo "Project Path: $PROJECT_PATH"
echo "Output Directory: $OUTPUT_DIR"
echo "Claude Model: $CLAUDE_MODEL"
echo "Dry Run: $DRY_RUN"
echo "Additional Args: $ADDITIONAL_ARGS"
echo "================================"
echo ""

# Run Docker container
echo -e "${GREEN}Starting analysis...${NC}"
docker run --rm \
    -v "$PROJECT_PATH:/workspace:ro" \
    -v "$OUTPUT_DIR:/output" \
    -e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
    -e "CLAUDE_MODEL=${CLAUDE_MODEL}" \
    "$DOCKER_IMAGE" \
    analyze /workspace --output-dir /output $ADDITIONAL_ARGS

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Analysis completed successfully!${NC}"
    echo "Results saved to: $OUTPUT_DIR"
    
    # List generated files
    if [ -d "$OUTPUT_DIR" ] && [ "$(ls -A $OUTPUT_DIR)" ]; then
        echo ""
        echo "Generated files:"
        ls -la "$OUTPUT_DIR"
    fi
else
    echo -e "${RED}Analysis failed${NC}"
    exit 1
fi