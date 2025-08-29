# Tutorial Generation Guide

Fondation is a powerful tool for teaching junior developers by automatically generating comprehensive, beginner-friendly tutorials from existing codebases. This guide explains the tutorial generation workflow.

## Overview

The tutorial generation system analyzes your codebase and creates educational content through a 6-phase workflow:

1. **Extract Abstractions** - Identify core concepts and patterns
2. **Analyze Relationships** - Map how concepts connect
3. **Order Chapters** - Determine optimal learning sequence
4. **Generate Chapters** - Create tutorial content
5. **Review Chapters** - Enhance quality and clarity
6. **Generate Tutorials** - Produce final tutorial format

## Quick Start

### Full Automated Analysis

Run the complete workflow with one command:

```bash
fondation analyze ./your-project

# With custom output directory
fondation analyze ./your-project --output-dir ./tutorials
```

This runs all 6 phases automatically and generates:
- Core abstractions analysis
- Relationship mappings
- Optimized chapter ordering
- Generated tutorial chapters
- Reviewed and enhanced chapters
- Final tutorial output

### Step-by-Step Generation

For more control, run each phase individually:

#### 1. Extract Abstractions
```bash
fondation analyze ./your-project --steps extract
```
Creates: `step1_abstractions.yaml`

#### 2. Analyze Relationships
```bash
fondation analyze ./your-project --steps analyze
```
Creates: `step2_relationships.yaml`

#### 3. Order Chapters
```bash
fondation analyze ./your-project --steps order
```
Creates: `step3_order.yaml`

#### 4. Generate Chapters
```bash
fondation generate-chapters \
  -i step3_order.yaml \
  -o ./chapters
```
Creates: Individual chapter files

#### 5. Review Chapters
```bash
fondation review-chapters \
  -i ./chapters \
  -o ./reviewed-chapters
```
Creates: Enhanced chapter files

#### 6. Generate Final Tutorial
```bash
fondation generate-tutorials \
  -i ./reviewed-chapters \
  -o ./tutorials
```
Creates: Final tutorial files

## Command Reference

### `fondation analyze`

Analyzes a codebase and runs the tutorial generation workflow.

```bash
fondation analyze <path> [options]
```

**Options:**
- `--output-dir <dir>` - Output directory (default: `.claude-tutorial-output`)
- `--steps <steps>` - Run specific steps only (comma-separated)
- `--skip-existing` - Skip files that already exist
- `--overwrite` - Overwrite existing files
- `--parallel <n>` - Number of parallel operations
- `--dry-run` - Show what would be done without doing it

**Available Steps:**
- `extract` - Extract abstractions
- `analyze` - Analyze relationships
- `order` - Determine chapter order
- `generate-chapters` - Generate chapters
- `review-chapters` - Review chapters
- `generate-tutorials` - Generate tutorials

### `fondation generate-chapters`

Generate tutorial chapters from analyzed data.

```bash
fondation generate-chapters [options]
```

**Required Options:**
- `-i, --input <file>` - Ordered chapters YAML file

**Options:**
- `--output-dir <dir>` - Output directory (default: `./chapters`)
- `--parallel <n>` - Number of chapters to generate in parallel
- `--chapters <list>` - Generate specific chapters only
- `--skip-existing` - Skip existing chapter files
- `--overwrite` - Overwrite existing files
- `--abstractions <file>` - Abstractions YAML file
- `--relationships <file>` - Relationships YAML file

### `fondation review-chapters`

Review and enhance generated chapters.

```bash
fondation review-chapters [options]
```

**Required Options:**
- `-i, --input <dir>` - Directory containing chapters to review

**Options:**
- `--output-dir <dir>` - Output directory (default: `./reviewed-chapters`)
- `--parallel <n>` - Number of chapters to review in parallel
- `--chapters <list>` - Review specific chapters only
- `--force` - Review even if already reviewed
- `--abstractions <file>` - Abstractions YAML file
- `--order <file>` - Chapter order YAML file

### `fondation generate-tutorials`

Convert reviewed chapters into final tutorial format.

```bash
fondation generate-tutorials [options]
```

**Required Options:**
- `-i, --input <dir>` - Directory containing reviewed chapters

**Options:**
- `--output-dir <dir>` - Output directory (default: `./tutorials`)
- `--parallel <n>` - Number of tutorials to generate in parallel
- `--interactive` - Add extra interactive elements
- `--difficulty <level>` - Set difficulty level (beginner/intermediate/advanced)
- `--abstractions <file>` - Abstractions YAML file
- `--order <file>` - Chapter order YAML file
- `--overwrite` - Overwrite existing files

## Understanding the Output

### Abstractions (step1_abstractions.yaml)
Contains identified concepts, patterns, and architectural elements from your codebase.

### Relationships (step2_relationships.yaml)
Maps dependencies and connections between abstractions.

### Chapter Order (step3_order.yaml)
Optimized learning sequence based on concept dependencies.

### Generated Chapters
Individual markdown files for each concept, written for beginners.

### Reviewed Chapters
Enhanced versions with improved clarity, examples, and exercises.

### Final Tutorials
Complete, interactive tutorials ready for junior developers.

## Best Practices

1. **Start with Clean Code** - Well-structured code produces better tutorials
2. **Use TypeScript** - Type information enhances tutorial quality
3. **Include Comments** - Good comments become tutorial explanations
4. **Review Output** - Always review generated content before sharing
5. **Customize Prompts** - Modify prompts in the `prompts/` directory for your needs

## Use Cases

### Teaching Junior Developers
Generate comprehensive tutorials from your production codebase to onboard new team members.

### Creating Course Material
Convert open-source projects into educational content for coding bootcamps.

### Documentation Generation
Automatically create beginner-friendly documentation for complex systems.

### Knowledge Transfer
Capture senior developer insights and make them accessible to juniors.

## Troubleshooting

### Missing Prompts Error
Ensure the `prompts/` directory contains all required prompt files:
- `1-abstractions.md`
- `2-analyze-relationshipt.md`
- `3-order-chapters.md`
- `4-write-chapters.md`
- `5-review-chapters.md`
- `6-tutorials.md`

### Generation Takes Too Long
- Reduce parallelism with `--parallel 1`
- Generate specific chapters only with `--chapters 1,2,3`
- Use `--skip-existing` to avoid regenerating

### Poor Quality Output
- Ensure your codebase has clear structure
- Add more comments to your code
- Customize the prompts for your domain
- Use the review phase to enhance quality