# Fondation CLI

**Fondation** is a powerful, headless Command Line Interface (CLI) for interacting with Claude AI. It provides a robust set of tools to streamline development workflows, analyze codebases, and leverage the full power of Claude's generative capabilities directly from your terminal.

Originally created as the **Claude Tutorial Generator**, Fondation specializes in teaching junior developers how to code by automatically generating comprehensive, beginner-friendly tutorials from existing codebases. It analyzes production code and transforms it into educational content that helps juniors learn while giving seniors insights into the learning process.

This tool is designed for developers who want to integrate AI-driven analysis and generation into their daily scripts, CI/CD pipelines, and development loops.

![Fondation CLI Demo](https://user-images.githubusercontent.com/12345/placeholder.gif) _(Note: Add a real demo GIF here)_

## Key Features

### Tutorial Generation (Core Feature)
- **Automated Tutorial Creation**: Transform any codebase into comprehensive educational content
- **6-Phase Workflow**: Extract abstractions → Analyze relationships → Order chapters → Generate → Review → Final tutorials
- **Junior-Friendly Output**: Creates beginner-focused explanations with examples and exercises
- **Senior Developer Insights**: Helps experienced developers understand how juniors learn

### CLI Capabilities
- **Headless Operation**: Built for scripting and automation. All commands are designed to be run from the terminal without requiring a GUI.
- **Powerful Run Command**: Execute prompts with full Claude Code SDK integration, including file operations, web searches, and code analysis.
- **Rich Tooling**: Integrates with Claude Code's comprehensive tool suite for development tasks.
- **Configurable**: Use profiles (`--profile`) and local configuration files to tailor the CLI's behavior to your needs.
- **Transparent**: See Claude's work and tool usage by default, with options for quiet (`--quiet`) or highly detailed (`--verbose`) output.
- **Thinking Mode**: Use `--thinking` to see Claude's reasoning process for learning and debugging.

## Getting Started

Full installation instructions and usage guides can be found in our official documentation.

**➡️ [Read the Full Documentation](./docs/README.md)**

- [**Installation Guide**](./docs/installation.md) - Authentication and setup
- [**Quick Start Guide**](./docs/quick-start.md) - Basic usage examples
- [**Tutorial Generation Guide**](./docs/tutorial-generation.md) - Creating educational content
- [**End User Guide**](./docs/end-user-guide.md) - Complete command reference
- [**Developer Guide**](./docs/developer-guide.md) - Contributing and development

## Quick Install

> **Note**: This is a private package. Please see the [Installation Guide](./docs/installation.md) for authentication details.

```bash
# Install the latest beta version as a dev dependency
npm install --save-dev @fondation-io/fondation@beta

# Run the help command
npx fondation --help

# Run your first prompt
npx fondation run "Hello world"
```

## Basic Usage

### Tutorial Generation Commands

The tutorial generation system works differently between the main and beta branches:

#### Main Branch (Original Implementation)
In the main branch, tutorial generation runs as **standalone TypeScript files** executed via npm scripts:

```bash
# Clone and install
git clone https://github.com/Fondation-io/fondation.git
cd fondation
npm install

# Run the complete tutorial generation workflow
npm run analyze-all -- ./your-project

# Or run individual steps
npm run generate-chapters
npm run review-chapters  
npm run generate-tutorials
```

These scripts run directly through Node/Bun and operate in a **headless manner** - they execute Claude AI prompts programmatically without any interactive UI. The system:
- Reads your codebase automatically
- Sends structured prompts to Claude AI
- Processes responses without user intervention
- Writes output files directly to disk
- Perfect for CI/CD integration and batch processing

#### Beta Branch (CLI Integration)
The beta branch enhances these capabilities by wrapping them into **proper CLI commands**:

```bash
# Install the beta CLI globally
npm install -g @fondation-io/fondation@beta

# Now use as CLI commands from anywhere
fondation analyze ./your-project

# Generate chapters from analysis
fondation generate-chapters -i step3_order.yaml -o ./chapters

# Review and enhance chapters
fondation review-chapters -i ./chapters -o ./reviewed-chapters

# Generate final tutorials
fondation generate-tutorials -i ./reviewed-chapters -o ./tutorials
```

**Key Differences**:
- **Main Branch**: Requires cloning the repo and running npm scripts from the project directory
- **Beta Branch**: Installs as a global CLI tool, can be run from any directory
- **Both**: Execute the same underlying tutorial generation logic in a headless, automated fashion

The beta branch essentially provides a more convenient, production-ready interface to the same powerful tutorial generation capabilities.

### AI Interaction Commands

```bash
# Run a simple prompt
fondation run "Analyze the structure of this project."

# Run with thinking enabled to see Claude's reasoning
fondation run "Refactor this function to be more efficient." --thinking

# Get just the final output for scripting
fondation run "What is the current version of typescript?" --quiet

# Use different models
fondation run "Complex analysis task" --model claude-opus-4-20250514

# Work with sessions for context
fondation run "Continue our previous discussion" --session my-project
```

## Use Cases

### Primary: Teaching Junior Developers
Fondation was built to solve a critical problem in software development: bridging the knowledge gap between senior and junior developers. It automatically generates educational content that:
- Explains complex codebases in beginner-friendly terms
- Creates step-by-step tutorials with practical examples
- Provides exercises and challenges for hands-on learning
- Helps seniors understand how juniors perceive their code

### Secondary: AI-Powered Development
Beyond tutorial generation, Fondation serves as a powerful CLI for:
- Code analysis and documentation
- Automated refactoring suggestions
- Project structure analysis
- Integration with CI/CD pipelines
- Scripted AI interactions

## Contributing

This project welcomes contributions. Please see the `CONTRIBUTING.md` file for guidelines. (You may want to create this file).

## Architecture

Fondation is built with:
- **TypeScript** for type safety and better developer experience
- **Commander.js** for CLI command structure
- **Claude Code SDK** (`@anthropic-ai/claude-code`) for AI interactions
- **Cosmiconfig** for flexible configuration management
- **Pino** for structured logging

The tutorial generation system uses a sophisticated 6-phase analysis pipeline that:
1. Extracts core abstractions and patterns from your codebase
2. Analyzes relationships and dependencies between components
3. Determines optimal learning order based on complexity
4. Generates initial tutorial content with examples
5. Reviews and enhances content for clarity
6. Produces final interactive tutorials

### Headless Operation

Both the main branch scripts and beta CLI commands operate in a truly headless fashion:
- **No Interactive Prompts**: All parameters are provided upfront via command line arguments
- **Automated Claude Integration**: Uses the Claude Code SDK to programmatically send prompts and receive responses
- **File-Based I/O**: Reads prompts from `prompts/` directory, writes outputs to specified directories
- **Progress Logging**: Provides real-time status updates via structured logs (Pino)
- **Error Handling**: Fails gracefully with clear error messages for debugging
- **Batch Processing**: Can process multiple projects or chapters in parallel

This makes Fondation ideal for:
- Continuous Integration pipelines
- Scheduled documentation updates
- Bulk tutorial generation
- Automated onboarding material creation

## License

This project is licensed under the MIT License.