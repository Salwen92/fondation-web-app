# End User Guide

This guide is for users who have installed Fondation via npm and want to use it as a CLI tool.

## Installation

```bash
# Install globally
npm install -g @fondation-io/fondation@beta

# Or install as a dev dependency
npm install --save-dev @fondation-io/fondation@beta
```

## Quick Start

### Basic Usage

```bash
# Ask a simple question
fondation "What is TypeScript?"

# Or use the explicit run command
fondation run "Explain async/await in JavaScript"

# Use the -p flag for multi-word prompts
fondation -p "Write a function that reverses a string"
```

### Interactive Chat Mode

```bash
# Start interactive chat (default when no arguments)
fondation

# Or explicitly
fondation chat
```

## Core Commands

### `fondation run` - Execute Prompts (Headless Mode)

The primary command for one-off prompts and automation.

```bash
# Direct prompt
fondation run "Your prompt here"

# From a file
fondation run -f prompt.txt

# From stdin (great for piping)
echo "Explain this error: undefined is not a function" | fondation run --stdin

# With thinking mode (see Claude's reasoning)
fondation run "Debug this complex issue" --thinking

# Continue a previous session
fondation run "What did we discuss earlier?" --session my-session-id
```

**Key Options:**
- `-p, --prompt <text>` - Provide prompt as a string
- `-f, --file <path>` - Read prompt from file
- `--stdin` - Read from standard input
- `--thinking` - Show Claude's reasoning process
- `--session <id>` - Continue a previous conversation
- `-m, --model <model>` - Choose model (claude-sonnet-4 or claude-opus-4)

### `fondation chat` - Interactive Chat UI

Start an interactive conversation with Claude.

```bash
# Start new chat
fondation chat

# Resume a previous chat session
fondation chat --resume session-abc123

# Use a specific model
fondation chat --model claude-opus-4-20250514

# Chat without saving history
fondation chat --no-history
```

**Key Options:**
- `-r, --resume <session>` - Resume a specific session
- `--no-history` - Don't save conversation to disk
- `-m, --model <model>` - Choose AI model

### `fondation config` - Configuration Management

Manage your CLI settings.

```bash
# Show current configuration
fondation config show

# Create a new config file
fondation config init

# Get a specific setting
fondation config get model

# Validate your config file
fondation config validate --file ./my-config.json
```

### `fondation version` - Version Information

```bash
# Show version info
fondation version

# Output as JSON (useful for scripts)
fondation version --json

# Check for updates
fondation version --check-updates
```

## Output Control Flags

These global flags work with all commands:

### `--quiet` - Minimal Output
```bash
# Only show Claude's response, no tool logs
fondation run "Calculate 5 * 12" --quiet
```

### `--verbose` - Debug Output
```bash
# Show detailed execution logs
fondation run "Debug this" --verbose
```

### `--json` - Structured Output
```bash
# Get JSON output for automation
fondation run "List prime numbers under 10" --json
```

## Configuration

### Configuration File

Create a `.fondation.json` file in your project:

```json
{
  "model": "claude-opus-4-20250514",
  "temperature": 0.7,
  "outputDir": "./claude-output",
  "tools": ["Read", "Write", "Edit", "Bash"]
}
```

Load it with:
```bash
fondation run "Your prompt" --config ./.fondation.json
```

### Configuration Profiles

Use built-in profiles for different scenarios:

```bash
# Production mode (lower temperature, consistent outputs)
fondation run "Generate API docs" --profile production

# Debug mode (verbose output, thinking enabled)
fondation run "Debug this issue" --profile debug

# Clean mode (minimal output)
fondation run "Quick calculation" --profile clean
```

Available profiles:
- `clean` - Minimal output
- `dev` - Development mode with verbose logging
- `debug` - Maximum verbosity with thinking
- `production` - Consistent outputs (temperature 0.3)
- `test` - Limited tools, lower token limit

### Environment Variables

```bash
# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Override default model
export CLAUDE_MODEL="claude-opus-4-20250514"

# Set output directory
export CLAUDE_OUTPUT_DIR="./my-claude-sessions"
```

## Common Use Cases

### Code Analysis
```bash
fondation run -f analyze-this-code.md --thinking
```

### Quick Calculations
```bash
fondation "What is 15% of 240?" --quiet
```

### Debugging Help
```bash
# Pipe error messages directly
npm test 2>&1 | fondation run --stdin -p "Explain this test failure"
```

### Automation & CI/CD
```bash
# Use JSON output for parsing
result=$(fondation run "Check code quality" --json --quiet)
echo $result | jq '.messages[-1].content'
```

### Documentation Generation
```bash
fondation run -f generate-docs-prompt.md --profile production
```

## Tips

1. **Use `--quiet` for clean output** when piping or using in scripts
2. **Use `--thinking` to understand Claude's reasoning** for complex tasks
3. **Use `--session` to maintain context** across multiple commands
4. **Use profiles** to quickly switch between different configurations
5. **Pipe output** to other commands for powerful workflows

## Troubleshooting

### API Key Not Set
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Command Not Found
Make sure fondation is in your PATH:
```bash
npm list -g @fondation-io/fondation
```

### Session Not Found
Sessions are stored in the output directory. Check:
```bash
ls .claude-output/sessions/
```