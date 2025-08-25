# Tutorial Chapter Writing

## CRITICAL OUTPUT REQUIREMENT

YOU MUST OUTPUT ONLY THE FINAL TUTORIAL CHAPTER IN MARKDOWN FORMAT. 

DO NOT include any:
- Processing logs ("I'll help you write...", "Let me start by exploring...")
- Meta-commentary about what you're doing
- Explanations of your approach
- Summary statements about what you wrote
- Research notes or exploration logs

START YOUR RESPONSE DIRECTLY WITH: `# Chapter {chapter_num}: {abstraction_name}`

## Task Overview

Write a very beginner-friendly tutorial chapter (in Markdown format) for the project `{project_name}` about the concept: "{abstraction_name}". This is Chapter {chapter_num}.

## Project Context

- **Project Location**: {project_root_path}
- **Concept Details**{concept_details_note}:
  - Name: {abstraction_name}
  - Description: {abstraction_description}
  - Associated Files: {abstraction_file_paths}

## Tutorial Structure

**Complete Tutorial Structure**{structure_note}:
{full_chapter_listing}

**Context from previous chapters**{prev_summary_note}:
{previous_chapters_summary if previous_chapters_summary else "This is the first chapter."}

## Research Phase

Your task is to write a comprehensive chapter by exploring the actual codebase. Follow these steps:

1. **Read the abstraction's files** to understand:
   - Main classes/functions and their purpose
   - Key methods and their signatures
   - Dependencies and imports
   - Configuration or initialization patterns

2. **Find concrete examples** by looking for:
   - Usage examples in documentation
   - Test files that demonstrate usage
   - Main entry points that use this abstraction
   - Configuration files that reference it

3. **Understand the implementation** by examining:
   - Core algorithms or business logic
   - Data flow and transformations
   - Error handling patterns
   - Integration points with other components

4. **Look for supporting context**:
   - Comments that explain design decisions
   - README sections about this component
   - Example configurations or data files

## Chapter Writing Instructions

Structure your chapter as follows:

1. **Start with heading**: `# Chapter {chapter_num}: {abstraction_name}`

2. **Transition** (if not first chapter): Reference previous chapter with proper link

3. **Motivation & Problem**: 
   - What real-world problem does this solve?
   - Find a concrete use case from the code (tests, examples, main usage)
   - Make it relatable with analogies

4. **Basic Usage**:
   - Show the simplest possible example (< 10 lines)
   - Use actual code from the project when possible
   - Explain expected inputs/outputs
   - Walk through what happens step by step

5. **Key Concepts**:
   - Break down complex abstractions into digestible pieces
   - Use code snippets to illustrate each concept
   - Keep examples minimal and focused

6. **Under the Hood**:
   - Create a sequence diagram showing the flow
   - Read the actual implementation to understand the steps
   - Explain the algorithm or process in plain language
   - Show key code snippets with file references

7. **Integration**:
   - How does this connect to other abstractions?
   - Use proper markdown links to reference other chapters
   - Show actual import/usage patterns from the code

8. **Conclusion**:
   - Summarize key learnings
   - Transition to next chapter with proper link

## Code Guidelines

- Find real examples from the codebase rather than creating synthetic ones
- Keep code blocks under 10 lines
- Add comments to explain non-obvious parts
- Reference actual file locations (e.g., "As seen in `src/router.py:45`")
- Simplify complex code while preserving core concepts

## Discovery Strategies

- Check for `examples/` or `docs/` directories
- Look in test files for usage patterns
- Search for the main class/function name across the codebase
- Examine import statements to understand dependencies
- Look for configuration files that use this abstraction

## Output Requirements

- Write entirely in {language.capitalize()} (except code syntax)
- Use extensive analogies and beginner-friendly explanations
- Include mermaid diagrams for complex flows
- Provide file:line references for code examples
- Ensure every code block has a clear explanation

## Implementation Notes

Now, explore the codebase and write the chapter. Start by reading the associated files to understand the abstraction, then write your beginner-friendly tutorial chapter.

## FINAL REMINDER - CRITICAL

Your response must be ONLY the tutorial chapter content in markdown format. Do not include any explanatory text, processing logs, or meta-commentary. Start immediately with:

`# Chapter {chapter_num}: {abstraction_name}`

And end with the conclusion section. Nothing before or after the actual tutorial content.

### Key Changes Made

1. **Removed pre-provided code snippets** - Agent reads files directly
2. **Added research phase** - Systematic exploration of the codebase
3. **Emphasized real examples** - Use actual code from the project, not synthetic examples
4. **Added discovery strategies** - How to find relevant examples and usage patterns
5. **File reference requirements** - Include actual file:line citations
6. **Step-by-step exploration** - Guide the agent through understanding the code

### Additional Implementation Considerations

You might want to provide focused sub-prompts:

#### Exploration Prompt
```
Before writing the chapter, explore these specific areas:
1. Read {abstraction_file_paths} to understand the core implementation
2. Search for test files containing "{abstraction_name}" to find usage examples
3. Look for this abstraction in the main entry points
4. Check for any documentation or README sections about this component
Summarize your findings before writing the chapter.
```

#### Example Finding Prompt
```
Find concrete examples of "{abstraction_name}" being used:
1. Search test files for instantiation patterns
2. Look in examples/ or docs/ directories
3. Check main.py or similar entry points
4. Find configuration files that reference this component
Provide the best example you found with file:line reference.
```

This approach creates more accurate, code-based tutorials since the agent can:
- Find real usage examples instead of creating synthetic ones
- Understand actual implementation details
- Provide accurate file references
- Discover edge cases and real-world usage patterns
- Create more authentic and practical tutorials