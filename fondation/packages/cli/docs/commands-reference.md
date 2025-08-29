# Commands Reference

Complete reference for all available CLI commands.

## 🏃 **run** - Execute Prompts

The primary command for executing prompts in headless mode.

### **Basic Usage**
```bash
fondation run [options] [prompt]
```

### **Input Methods**
```bash
# Direct prompt
fondation run -p "What is TypeScript?"

# From file
fondation run -f prompt.txt

# From stdin
echo "Your prompt" | fondation run --stdin

# As argument
fondation run "What is TypeScript?"
```

### **Key Options**
- `--prompt <text>` / `-p` - Provide prompt directly
- `--file <path>` / `-f` - Read prompt from file
- `--stdin` - Read prompt from stdin
- `--thinking` - Show Claude's reasoning process
- `--quiet` - Suppress tool execution logs and other output
- `--json` - Output in JSON format
- `--session <id>` - Use specific session for context
- `--system-prompt <path>` - Custom system prompt file
- `--model <model>` / `-m` - Choose Claude model
- `--tools <tools...>` - Allowed tools (comma-separated)

### **Examples**
```bash
# Clean output for end users
fondation run -p "Explain REST APIs" --quiet

# Full debugging
fondation run -p "Debug this issue" --verbose --thinking

# JSON output for automation
fondation run -p "Analyze data" --json --quiet
```

## 💬 **chat** - Interactive Chat

Launch the interactive chat UI for ongoing conversations.

### **Basic Usage**
```bash
fondation chat [options]
```

### **Key Options**
- `--model <model>` / `-m` - Choose Claude model
- `--resume <session>` / `-r` - Resume specific session
- `--no-history` - Disable conversation history (messages won't be saved)
- `--output-dir <dir>` / `-o` - Set output directory

### **Examples**
```bash
# Start new chat
fondation chat

# Resume previous session
fondation chat --resume session-abc123

# Use specific model
fondation chat --model claude-opus-4-20250514

# Custom output directory
fondation chat --output-dir ./my-sessions
```

## ⚙️ **config** - Configuration Management

Manage CLI configuration settings.

### **Basic Usage**
```bash
fondation config [subcommand]
```

### **Subcommands**
- `config init` - Create a new configuration file
- `config show` - Display current configuration
- `config get <key>` - Get a configuration value
- `config validate` - Validate configuration file

### **Examples**
```bash
# Create new config file
fondation config init

# Show current config
fondation config show

# Get specific value
fondation config get model

# Validate config file
fondation config validate --config ./my-config.json
```

## 📋 **version** - Version Information

Display version and environment information.

### **Basic Usage**
```bash
fondation version [options]
```

### **Key Options**
- `--json` - Output as JSON (uses global flag)
- `--check-updates` - Check for available updates

### **Examples**
```bash
# Show version
fondation version

# JSON output
fondation version --json

# Check for updates
fondation version --check-updates
```

## 🌐 **Global Options**

These options work with all commands:

### **Core Options**
- `--verbose` / `-v` - Enable verbose output
- `--quiet` / `-q` - Suppress non-essential output
- `--json` - Output in JSON format
- `--profile <profile>` - Use configuration profile
- `--config <path>` - Path to config file
- `--log-file <path>` - Write logs to file

### **Examples**
```bash
# Verbose output for any command
fondation <command> --verbose

# JSON output for any command
fondation <command> --json

# Use profile with any command
fondation <command> --profile debug
```

## 🔄 **Convenience Shortcuts**

### **Direct Prompt Execution**
```bash
# These are equivalent:
fondation "What is TypeScript?"
fondation run -p "What is TypeScript?"

# Using -p flag without command
fondation -p "Complex multi-word prompt"
# Equivalent to: fondation run -p "Complex multi-word prompt"
```

### **Default to Chat**
```bash
# Running without arguments starts chat
fondation
# Equivalent to: fondation chat
```

## 📊 **Output Formats**

### **Text Format** (Default)
```bash
fondation run -p "Hello world"
# Output: Hello! How can I help you today?
```

### **JSON Format**
```bash
fondation run -p "Hello world" --json
# Output: {"messages": [...], "stats": {...}}
```

### **Quiet Mode**
```bash
fondation run -p "Calculate 2+2" --quiet
# Output: 4
```

## 🚀 **Performance Tips**

### **Faster Execution**
- Use `--profile production` for consistent performance
- Use `--quiet` to reduce output processing

### **Resource Management**
- Use `--session <id>` for context continuity without re-sending history
- Use specific `--tools` to limit available tools

### **Debugging**
- For minimal output: use `--quiet` flag
- For development: use `--verbose` flag
- For complex troubleshooting: use `--verbose --thinking` flags
- Profiles (`production`, `test`) only affect model settings, not output visibility

## 📖 **Related Documentation**

- [**Flags Reference**](flags-reference.md) - Complete flag documentation
- [**Profiles Guide**](profiles-guide.md) - Profile usage and configuration
- [**Daily Usage**](daily-usage.md) - Common usage patterns