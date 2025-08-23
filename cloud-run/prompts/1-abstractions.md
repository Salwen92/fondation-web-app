# Core Abstractions Analysis

## Task Overview

Your task is to analyze this codebase and identify the top 5-15 core most important abstractions to help those new to the codebase.

## Instructions

1. **Start by exploring the project structure** to understand the overall architecture
2. **Read key files** like README.md, main entry points, and configuration files
3. **Identify the main components**, patterns, and concepts used throughout the codebase
4. **For each potential abstraction**, read the relevant source files to understand its purpose and implementation
5. **Focus on abstractions** that are fundamental to understanding how the system works

## Output Requirements

For each abstraction, provide:
1. A concise `name`
2. A beginner-friendly `description` explaining what it is with a simple analogy, in around 100 words
3. A list of relevant `file_paths` (full paths relative to project root)

## Exploration Strategy

- Look for main entry points (main.py, index.js, app.py, etc.)
- Check for core directories (src/, lib/, core/, models/, controllers/)
- Examine imports to understand dependencies
- Read class/function definitions to understand responsibilities

## Output Format

**IMPORTANT INSTRUCTION**: You MUST use the Write tool to create a new file at the path: `{{OUTPUT_PATH}}`

Do NOT output the YAML in your response. Instead:
1. Analyze the codebase as instructed
2. Prepare your YAML content
3. Use the Write tool to save it to the specified file path
4. Confirm the file was written successfully

The file should contain ONLY valid YAML with this structure:

```yaml
- name: |
    Query Processing{name_lang_hint}
  description: |
    Explains what the abstraction does.
    It's like a central dispatcher routing requests.
  file_paths:
    - src/query/processor.py
    - src/query/parser.py
- name: |
    Query Optimization
  description: |
    Another core concept, similar to a blueprint for objects.
  file_paths:
    - src/optimizer/query_optimizer.js
# ... up to 15 abstractions
```

**CRITICAL REQUIREMENTS**: 
- You MUST use the Write tool to create the file - do NOT output YAML in your response
- Write ONLY the YAML content to the file (no explanatory text)
- Ensure the YAML is properly formatted and valid
- Start the file content with the first dash (-) character
- The file path must be exactly: `{{OUTPUT_PATH}}`