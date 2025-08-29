# Daily Usage Patterns

Common patterns and workflows for everyday use of the Fondation CLI.

## 👤 **End User Patterns**

### **Basic Q&A**
```bash
# Simple questions with clean output
fondation run -p "What is TypeScript?" --quiet
fondation run -p "How do I center a div in CSS?" --quiet
```

### **With Reasoning**
```bash
# See how Claude thinks through problems
fondation run -p "Explain why this approach is better" --thinking --quiet
fondation run -p "Compare these two solutions" --thinking --quiet
```

### **File-based Prompts**
```bash
# Long prompts from files
fondation run -f ./prompts/code-review.txt --quiet
fondation run -f ./prompts/documentation.txt --thinking --quiet
```

### **Interactive Sessions**
```bash
# Start interactive chat
fondation chat

# Resume previous conversation
fondation chat --resume session-abc123
```

## 🔧 **Developer Patterns**

### **Code Analysis**
```bash
# Debug code issues
fondation run -p "Why is this function not working?" --verbose

# Deep analysis with thinking
fondation run -p "Optimize this algorithm" --verbose --thinking
```

### **Documentation Generation**
```bash
# Generate docs with clean output
fondation run -p "Generate API documentation for this code" --quiet

# Review generated docs
fondation run -f ./generated-docs.md --thinking --quiet
```

### **Testing & Validation**
```bash
# Test with limited scope
fondation run -p "Test this function" --profile test

# Validate with full context
fondation run -p "Review this implementation" --verbose
```

## 🏢 **Production/Automation Patterns**

### **Batch Processing**
```bash
# Process multiple files
for file in *.md; do
  fondation run -p "Summarize this document" -f "$file" --profile production --json >> results.json
done
```

### **CI/CD Integration**
```bash
# Code review in CI
fondation run -p "Review this PR for security issues" --profile production --quiet

# Documentation updates
fondation run -f ./changelog.md --profile production --json > processed-changelog.json
```

### **Monitoring & Logging**
```bash
# Production with logging
fondation run -p "Analyze error logs" --profile production --log-file production.log

# Automated reports
fondation run -p "Generate weekly report" --profile production --json --no-stream
```

## 🎯 **Task-Specific Patterns**

### **Code Review**
```bash
# Quick review
fondation run -p "Review this code for bugs" --verbose

# Detailed analysis
fondation run -p "Comprehensive security review" --verbose --thinking

# Production review
fondation run -p "Production readiness check" --profile production
```

### **Writing & Documentation**
```bash
# Content creation
fondation run -p "Write technical documentation" --quiet

# Editing with reasoning
fondation run -p "Improve this documentation" --thinking --quiet

# Batch content processing
for file in ./content/*.md; do
  fondation run -f "$file" --profile clean --json
done
```

### **Learning & Exploration**
```bash
# Understand concepts
fondation run -p "Explain this technology" --thinking --quiet

# Deep dive learning
fondation run -p "How does this work internally?" --verbose --thinking

# Compare technologies
fondation run -p "Compare X vs Y" --thinking --no-tools
```

## 🔄 **Workflow Integration**

### **VS Code Integration**
```bash
# Add to VS Code tasks.json
{
  "label": "Claude Review",
  "type": "shell",
  "command": "fondation run -p 'Review this code' --verbose"
}
```

### **Git Hooks**
```bash
# Pre-commit hook
#!/bin/bash
fondation run -p "Quick security check" --profile production --quiet
```

### **Make/Scripts Integration**
```bash
# Makefile target
review:
	fondation run -p "Code review" --profile dev

docs:
	fondation run -f ./docs-prompt.txt --profile clean > generated-docs.md
```

## 🚀 **Performance Optimization**

### **Fast Execution**
```bash
# Minimal overhead
fondation run -p "prompt" --profile production --quiet --no-stream

# Reduce token usage
fondation run -p "prompt" --profile test --max-turns 1
```

### **Batch Processing**
```bash
# Parallel execution
fondation run -p "task1" --profile production &
fondation run -p "task2" --profile production &
wait
```

### **Memory Management**
```bash
# Long-running tasks
fondation run -p "large task" --profile production --session temp-session
```

## 🐛 **Debugging Patterns**

### **Progressive Debugging**
```bash
# Start simple
fondation run -p "debug this" --quiet

# Add visibility
fondation run -p "debug this" --verbose

# Full debug
fondation run -p "debug this" --verbose --thinking
```

### **Tool Debugging**
```bash
# See what tools are used
fondation run -p "analyze this file"

# Show system logs only
fondation run -p "analyze this file" --verbose --quiet

# Full visibility
fondation run -p "analyze this file" --verbose
```

### **Configuration Debugging**
```bash
# Check configuration
fondation run -p "test" --verbose

# Test specific settings
fondation run -p "test" --config ./debug-config.json --profile my-profile
```

## 📊 **Output Management**

### **Structured Output**
```bash
# JSON for processing
fondation run -p "analyze data" --json --profile production

# Formatted output
fondation run -p "generate report" --output-format markdown --profile clean
```

### **Logging & Monitoring**
```bash
# Detailed logs
fondation run -p "task" --profile dev --log-file task.log

# Production monitoring
fondation run -p "task" --profile production --log-file production.log --json
```

### **Error Handling**
```bash
# Quiet error handling
fondation run -p "risky task" --profile production --quiet 2>/dev/null

# Verbose error debugging
fondation run -p "failing task" --profile debug --verbose
```

## 💡 **Pro Tips**

### **Efficiency**
- Use `--quiet` for 90% of everyday tasks
- Use `--verbose` when you need to see what's happening
- Use `--verbose --thinking` only when debugging complex issues

### **Consistency**
- Create team standards for which flags to use
- Document common patterns in your project README
- Use the same flags across similar environments

### **Automation**
- Always use `--profile production` for automated tasks
- Add `--json` for structured output in scripts
- Use `--quiet` to reduce log noise in automation

### **Learning**
- Use `--thinking` to understand Claude's reasoning
- Use `--verbose --thinking` when learning new concepts
- Combine `--thinking` with `--quiet` for clean reasoning output

## 📖 **Related Documentation**

- [**Flags Reference**](flags-reference.md) - Complete flag documentation
- [**Profiles Guide**](profiles-guide.md) - Detailed profile information
- [**Configuration**](configuration.md) - Custom configuration options