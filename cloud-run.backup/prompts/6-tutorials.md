# Interactive Tutorial Generation

## CRITICAL OUTPUT REQUIREMENT

YOU MUST OUTPUT A SINGLE INTERACTIVE TUTORIAL FOR THE GIVEN CHAPTER IN MARKDOWN FORMAT.

DO NOT include any:
- Processing logs or meta-commentary
- Explanations of your approach
- Multiple tutorial options
- Summary statements

START YOUR RESPONSE DIRECTLY WITH: `# Interactive Tutorial: {abstraction_name}`

## Task Overview

Generate a hands-on, interactive tutorial that transforms the chapter content for `{abstraction_name}` into an active learning exercise. This tutorial should allow developers to practice and reinforce the concepts from Chapter {chapter_num}.

## Project Context

- **Project Location**: {project_root_path}
- **Chapter Number**: {chapter_num}
- **Abstraction Name**: {abstraction_name}
- **Abstraction Description**: {abstraction_description}
- **Associated Files**: {abstraction_file_paths}

## Tutorial Structure Context

**Complete Tutorial Structure**:
{full_chapter_listing}

**Reviewed Chapter Content**:
{reviewed_chapter_content}

## Tutorial Requirements

### 1. Tutorial Metadata
- **Title**: Interactive Tutorial: {abstraction_name}
- **Estimated Time**: 45-90 minutes
- **Difficulty Level**: Based on chapter complexity
- **Prerequisites**: Reference specific previous chapters

### 2. Learning Objectives
Extract and extend the key concepts from the chapter into practical objectives that can be demonstrated through hands-on exercises.

### 3. Interactive Exercise Design
Create a user story with acceptance criteria:
```
As a developer learning {project_name}
I want to [specific practical task related to the abstraction]
So that [concrete benefit that reinforces chapter learning]

Acceptance Criteria:
- [ ] Implement [specific feature using the abstraction]
- [ ] Test [specific behavior or edge case]
- [ ] Demonstrate [integration with other components]
```

### 4. Guided Implementation Steps

Structure as progressive, hands-on steps:

#### Step 1: Explore the Foundation
- Start with the files from {abstraction_file_paths}
- Identify key methods/functions to understand
- Find existing usage examples in the codebase
- Questions to investigate before coding

#### Step 2: Implement Core Functionality
- Build a minimal working example
- Provide code skeleton with strategic TODOs
- Include hints that reference actual project patterns
- Test the basic functionality

#### Step 3: Add Real-World Features
- Extend the basic implementation
- Handle edge cases and errors
- Integrate with other project components
- Follow project conventions and patterns

#### Step 4: Test and Validate
- Write tests that verify the implementation
- Check integration with existing code
- Validate against project standards
- Debug common issues

### 5. Code Scaffolding Guidelines
- Provide partial implementations with meaningful TODOs
- Reference actual patterns from the project files
- Include hints that point to specific files and line numbers
- Keep individual code blocks under 15 lines
- Use the project's actual naming conventions and style

### 6. Testing and Verification
- Include specific test cases to implement
- Reference the project's testing patterns and frameworks
- Provide examples of expected outputs
- Include debugging tips specific to this abstraction

### 7. Success Criteria
- [ ] Implementation works as intended
- [ ] Code follows project conventions
- [ ] Tests pass and cover edge cases
- [ ] Integration points function correctly
- [ ] No linting or type errors

### 8. Extension Challenges
Optional advanced exercises for quick finishers:
- Performance optimization
- Additional feature implementation
- Refactoring exercise
- Advanced integration scenario

## Tutorial Generation Instructions

1. **Read the chapter content** to understand the key concepts and examples
2. **Design a practical exercise** that reinforces the main learning points
3. **Create scaffolded implementation steps** with real project context
4. **Include testing and validation** using project patterns
5. **Provide debugging guidance** specific to common issues with this abstraction

## Code Discovery Strategy

- Search for test files that use {abstraction_name}
- Find examples in the main application code
- Look for configuration or setup files that reference this abstraction
- Identify common usage patterns and edge cases
- Reference actual file paths and line numbers

## Output Format

Your response must be a complete interactive tutorial in markdown format that:
- Starts with `# Interactive Tutorial: {abstraction_name}`
- Includes clear learning objectives
- Provides hands-on exercises with code scaffolding
- References actual project files and patterns
- Includes testing and validation steps
- Ends with extension challenges

## FINAL REMINDER

Output ONLY the complete tutorial content. Begin immediately with the tutorial heading and end with the extension challenges. No explanatory text before or after.