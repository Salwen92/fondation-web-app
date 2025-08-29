# Abstraction Ordering for Tutorial

## Task Overview

Your task is to determine the optimal order for explaining these abstractions in a beginner-friendly tutorial.

**FIRST**: You MUST read both:
1. The abstractions file at: `{{ABSTRACTIONS_PATH}}`
2. The relationships file at: `{{RELATIONSHIPS_PATH}}`

## Instructions

1. **Analyze the project structure** by reading key files:
   - README.md or other documentation
   - Main entry points (main.py, index.js, app.py, etc.)
   - Configuration files
   - Package manifests (package.json, requirements.txt, etc.)

2. **Understand the dependency graph**:
   - Which abstractions depend on others?
   - Which are foundational (used by many others)?
   - Which are leaf nodes (depend on others but nothing depends on them)?

3. **Identify the user's journey**:
   - What would a user interact with first?
   - What's the typical flow of the application?
   - What concepts must be understood before others make sense?

4. **Consider learning progression**:
   - Start with high-level, user-facing concepts
   - Move to core architectural patterns
   - End with implementation details and utilities

## Ordering Principles

- **Prerequisites first**: If A depends on B, explain B before A
- **User perspective**: Start with what users see/interact with
- **Conceptual before implementation**: Explain what before how
- **Simple before complex**: Build up complexity gradually
- **Common before specialized**: Core concepts before edge cases

## Exploration Strategy

Please explore the codebase to determine:
1. Entry points and user-facing interfaces
2. Core abstractions that others build upon
3. Implementation details and utilities
4. The natural flow of data/control through the system

## Output Format

**IMPORTANT INSTRUCTION**: You MUST use the Write tool to create a new file at the path: `{{OUTPUT_PATH}}`

Do NOT output the YAML in your response. Instead:
1. Analyze the project structure and dependencies as instructed
2. Determine the optimal ordering for the tutorial
3. Prepare your YAML content with the ordered list
4. Use the Write tool to save it to the specified file path
5. Confirm the file was written successfully

The file should contain ONLY valid YAML with this structure:

```yaml
order:
  - index: 2
    name: FoundationalConcept
    reasoning: "This is the main entry point users interact with (found in main.py:10)"
  - index: 0
    name: CoreClassA  
    reasoning: "Core data model that other components depend on (imported by 5 other modules)"
  - index: 1
    name: CoreClassB
    reasoning: "Builds on CoreClassA to provide business logic (extends CoreClassA as seen in class_b.py:15)"
  # ... continue for all abstractions
```

**CRITICAL REQUIREMENTS**: 
- You MUST use the Write tool to create the file - do NOT output YAML in your response
- Write ONLY the YAML content to the file (no explanatory text)
- Ensure the YAML is properly formatted and valid
- Include all abstractions from the input in your ordering
- The file path must be exactly: `{{OUTPUT_PATH}}`
- Start the file with 'order:' as the first line