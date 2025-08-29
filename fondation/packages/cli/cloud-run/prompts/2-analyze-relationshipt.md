# Abstraction Relationships Analysis

## Task Overview

Your task is to analyze how these abstractions interact with each other by examining the actual code.

**FIRST**: You MUST read the abstractions file at: `{{ABSTRACTIONS_PATH}}` to understand what abstractions were identified.

## Instructions

1. **For each abstraction**, read its associated files to understand:
   - What it does and how it's implemented
   - What other components it imports or references
   - What interfaces/APIs it exposes
   - What dependencies it has

2. **Look for concrete evidence of relationships**:
   - Direct function/method calls between components
   - Import statements showing dependencies
   - Inheritance relationships (extends/implements)
   - Data flow (one component passing data to another)
   - Configuration or initialization patterns
   - Event handling or callback registrations

3. **Focus on the most important**, architectural relationships that help understand the system

## Output Requirements

Please provide:

1. **A high-level `summary`** of the project's main purpose and functionality in a few beginner-friendly sentences. Use markdown formatting with **bold** and *italic* text to highlight important concepts.

2. **A list (`relationships`)** describing the key interactions between these abstractions. For each relationship:
   - `from_abstraction`: Index and name of source abstraction
   - `to_abstraction`: Index and name of target abstraction  
   - `label`: A brief label for the interaction **in just a few words**
   - `evidence`: Brief description of what you found in the code that proves this relationship (file:line references)

## Important Notes

- Base relationships on actual code evidence, not assumptions
- Every abstraction must appear in at least ONE relationship
- Read the actual implementation files to verify relationships

## Exploration Strategy

1. Start with main entry points to see the initialization flow
2. Check import statements at the top of each file
3. Look for class constructors to see dependencies
4. Search for method calls between components
5. Examine configuration files for wiring patterns

## Output Format

**IMPORTANT INSTRUCTION**: You MUST use the Write tool to create a new file at the path: `{{OUTPUT_PATH}}`

Do NOT output the YAML in your response. Instead:
1. Analyze the code relationships as instructed
2. Prepare your YAML content with summary and relationships
3. Use the Write tool to save it to the specified file path
4. Confirm the file was written successfully

The file should contain ONLY valid YAML with this structure:

```yaml
summary: |
  A brief, simple explanation of the project.
  Can span multiple lines with **bold** and *italic* for emphasis.
relationships:
  - from_abstraction: 0 # AbstractionName1
    to_abstraction: 1 # AbstractionName2
    label: "Manages"
    evidence: "Router.py:45 creates DatabaseManager instance"
  - from_abstraction: 2 # AbstractionName3
    to_abstraction: 0 # AbstractionName1
    label: "Provides config"
    evidence: "config.py:12 imported by router.py:3"
  # ... other relationships
```

**CRITICAL REQUIREMENTS**: 
- You MUST use the Write tool to create the file - do NOT output YAML in your response
- Write ONLY the YAML content to the file (no explanatory text)
- Ensure the YAML is properly formatted and valid
- The file path must be exactly: `{{OUTPUT_PATH}}`
- Start the file with 'summary:' as the first line