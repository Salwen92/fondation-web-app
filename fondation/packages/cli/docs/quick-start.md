# Quick Start Guide

Get up and running with Fondation CLI in minutes.

## 🚀 **Installation**

```bash
# Install from GitHub Packages (requires authentication - see Installation Guide)
npm install --save-dev @fondation-io/fondation@beta

# Or install globally
npm install -g @fondation-io/fondation@beta
```

See the [Installation Guide](./installation.md) for detailed authentication setup.

## 💡 **Basic Usage**

### **1. Simple Prompt**
```bash
# The -p flag allows you to provide a prompt directly as a string
fondation run -p "What is TypeScript?"

# Or use the convenience syntax (automatically adds 'run -p')
fondation "What is TypeScript?"
```

### **2. Clean Output (Recommended for Scripting)**
```bash
# Minimal output, no tool logs
fondation run -p "Explain this code" --quiet
```

### **3. With Thinking Process**
```bash
# Show Claude's reasoning process
fondation run -p "Debug this error" --thinking
```

## 🎯 **Most Used Commands**

### **Run Command** (Primary)
```bash
# The -p flag: Provide prompt as a string (useful for multi-word prompts)
fondation run -p "Your prompt here"

# Direct argument (without -p flag)
fondation run "Your prompt here"

# Convenience: -p flag without 'run' command defaults to run
fondation -p "Your prompt here"

# From file
fondation run -f prompt.txt

# From stdin
echo "Your prompt" | fondation run --stdin
```

### **Available Options**
```bash
# Session management
fondation run "Your prompt" --session my-session

# Custom model selection
fondation run "Your prompt" --model claude-sonnet-4-20250514

# Custom system prompt
fondation run "Your prompt" --system-prompt my-prompt.md
```

## 🔧 **Essential Flags**

### **Output Control**
```bash
# Minimal output (no tool logs)
--quiet

# Verbose output (debugging)
--verbose

# JSON output (for automation)
--json
```

### **Thinking & Profiles**
```bash
# See Claude's reasoning process
--thinking

# Use configuration profiles (Note: profiles don't control output visibility)
--profile production  # Lower temperature (0.3) for consistent results
--profile test     # Limited tools (Read only) and lower token limit

# Custom configuration
--config path/to/config.json
```

## 📝 **Common Patterns**

### **For End Users**
```bash
# Clean, simple output
fondation run "Summarize this document" --quiet

# With reasoning shown
fondation run "Explain this concept" --thinking
```

### **For Developers**
```bash
# Full debugging
fondation run "Debug this issue" --verbose

# JSON for automation
fondation run "Analyze code" --json --quiet

# Development mode (if running from source)
bun run dev

# Quick prompt without 'run' command
fondation -p "Explain this error"
```

## 🛠️ **For Development**

If you're running from source:

```bash
# Start the development server
bun run dev

# Or if you have the package installed globally
fondation
```

## 🆘 **Need Help?**

```bash
# General help
fondation --help

# Command-specific help
fondation run --help
```

## 📖 **Next Steps**

- [**Daily Usage**](daily-usage.md) - Common usage patterns
- [**Flags Reference**](flags-reference.md) - Complete flag documentation
- [**Profiles Guide**](profiles-guide.md) - Pre-configured profiles