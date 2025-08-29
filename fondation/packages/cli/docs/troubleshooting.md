# Troubleshooting

Common issues and solutions for the Fondation CLI.

## 🚨 **Common Issues**

### **Configuration Problems**

#### **Invalid Configuration**
```bash
Error: Configuration validation failed:
  - model: Invalid enum value
```
**Solution**: Check your model name in configuration
```bash
# Check available models
fondation run --help

# Fix configuration
{
  "model": "claude-sonnet-4-20250514"  // Use exact model name
}
```

#### **Profile Not Found**
```bash
Error: Profile "my-profile" not found. Available: clean, dev, debug, production, test
```
**Solution**: Check available profiles
```bash
# List available profiles
fondation config show

# Create custom profile in .fondation.json
{
  "profiles": {
    "my-profile": {
      "temperature": 0.7
    }
  }
}
```

### **Permission & File Issues**

#### **File Not Found**
```bash
Error: Configuration file not found: /path/to/config.json
```
**Solution**: Check file path and permissions
```bash
# Check file exists
ls -la /path/to/config.json

# Use absolute path
fondation run --config /absolute/path/to/config.json
```

#### **Permission Denied**
```bash
Error: EACCES: permission denied, open '/path/to/file'
```
**Solution**: Fix file permissions
```bash
# Fix permissions
chmod 644 /path/to/file

# Or run from different directory
cd ~/my-project && fondation run -p "prompt"
```

### **Tool Execution Issues**

#### **Tool Not Found**
```bash
Error: Tool 'InvalidTool' not found
```
**Solution**: Use valid tool names
```bash
# Valid tools: Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS, WebFetch, WebSearch
fondation run --tools Read,Write,Edit,Bash
```

#### **Bash Command Fails**
```bash
[✗] Bash: Command failed (120ms)
   Error: command not found: nonexistent-command
```
**Solution**: Check command availability
```bash
# Test command exists
which nonexistent-command

# Use full path
fondation run -p "Run /usr/bin/ls"

# Check PATH
echo $PATH
```

### **Network & API Issues**

#### **API Key Issues**
```bash
Error: Unauthorized: Invalid API key
```
**Solution**: Check API key configuration
```bash
# Set environment variable
export CLAUDE_API_KEY="your-api-key"

# Or check configuration
fondation config show
```

#### **Network Timeout**
```bash
Error: Request timeout after 30000ms
```
**Solution**: Check network connectivity
```bash
# Test connectivity
ping api.anthropic.com

# Use longer timeout
fondation run -p "prompt" --timeout 60000
```

## 🔧 **Debugging Steps**

### **Step 1: Check Configuration**
```bash
# Show current configuration
fondation config show

# Check with verbose output
fondation run -p "test" --verbose
```

### **Step 2: Test with Minimal Output**
```bash
# Minimal output
fondation run -p "test" --quiet
```

### **Step 3: Enable Full Debugging**
```bash
# Maximum debugging info
fondation run -p "test" --verbose --thinking

# Check system logs
fondation run -p "test" --verbose
```

### **Step 4: Check Environment**
```bash
# Check environment variables
env | grep CLAUDE

# Check system info
fondation version
```

## 🩺 **Manual Diagnostics**

### **Check Your Setup**
```bash
# Check API key
echo $ANTHROPIC_API_KEY

# Check version
fondation version

# Test basic functionality
fondation run "Hello" --quiet
```

## 📊 **Debug Output Analysis**

### **Understanding Log Levels**
```bash
# Error level (red)
{"level":"error","msg":"Command failed"}

# Warning level (yellow)
{"level":"warn","msg":"Session not found"}

# Info level (blue)
{"level":"info","msg":"Query completed"}

# Debug level (gray)
{"level":"debug","msg":"Configuration loaded"}
```

### **Tool Execution Logs**
```bash
# Tool start
[⏺] Read: Reading file src/app.ts

# Tool success
[✓] Read: Read 150 lines (5.2KB) (220ms)

# Tool failure
[✗] Bash: Command failed (120ms)
   Error: command not found
```

### **Thinking Process**
```bash
# Thinking start
💭 Claude is thinking...

# Thinking content (with --thinking-verbose)
💭 I need to analyze this step by step...

# Thinking end
└─ Thinking complete (2.3s)
```

## 🚀 **Performance Issues**

### **Slow Responses**
```bash
# Check with timing
fondation run -p "test" --profile debug

# Reduce token limit
fondation run -p "test" --max-turns 1

# Use faster model
fondation run -p "test" --model claude-sonnet-4-20250514
```

### **Memory Issues**
```bash
# Check memory usage
ps aux | grep bun

# Use session flag for context
fondation run -p "test" --session my-session-id
```

### **High CPU Usage**
```bash
# Reduce concurrency
fondation run -p "test" --no-stream

# Use production profile
fondation run -p "test" --profile production
```

## 🔍 **Debugging Specific Issues**

### **JSON Output Problems**
```bash
# Test JSON output
fondation run -p "test" --json

# Check output format
fondation run -p "test" --output-format json

# Validate JSON
fondation run -p "test" --json | jq '.'
```

### **Profile Issues**
```bash
# Test profile with config file
fondation run -p "test" --config ./config.json --profile my-profile --verbose

# Remember: profiles only affect temperature, model, tools, etc.
# They do NOT control output visibility - use flags for that
```

### **Tool Permission Issues**
```bash
# Test with limited tools
fondation run -p "test" --profile test

# Limit tools to safe ones only
fondation run -p "test" --tools Read,Grep,LS
```

## 🆘 **Getting Help**

### **Built-in Help**
```bash
# General help
fondation --help

# Command help
fondation run --help

# Profile help
fondation config --help
```

### **Verbose Information**
```bash
# System information
fondation version --verbose

# Configuration details
fondation config show --verbose

# Check environment
fondation version --verbose
```

### **Log Files**
```bash
# Save debug logs
fondation run -p "test" --verbose --log-file debug.log

# Analyze logs
tail -f debug.log

# Filter logs
grep "error" debug.log
```

## 📋 **Common Error Messages**

### **Configuration Errors**
```bash
# Solution: Check configuration syntax
Error: Unexpected token } in JSON at position 123

# Solution: Use valid enum values
Error: Invalid enum value. Expected 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514'

# Solution: Check number ranges
Error: Number must be between 0 and 1
```

### **Runtime Errors**
```bash
# Solution: Check file paths
Error: ENOENT: no such file or directory

# Solution: Check permissions
Error: EACCES: permission denied

# Solution: Check network
Error: getaddrinfo ENOTFOUND api.anthropic.com
```

### **Tool Errors**
```bash
# Solution: Check tool availability
Error: Tool 'InvalidTool' is not available

# Solution: Fix command syntax
Error: Bash command failed: syntax error

# Solution: Check file paths
Error: File not found: /path/to/file
```

## 🔄 **Recovery Procedures**

### **Reset Configuration**
```bash
# Reset to defaults
fondation config reset

# Remove custom config
rm .fondation.json

# Clear cache
rm -rf .claude-output
```

### **Clean Environment**
```bash
# Clear environment variables
unset CLAUDE_MODEL CLAUDE_OUTPUT_DIR

# Reset to minimal config
echo '{}' > .fondation.json

# Test basic functionality
fondation run -p "test" --profile clean
```

### **Reinstall Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or with bun
rm -rf node_modules bun.lockb
bun install
```

## 📖 **Related Documentation**

- [**Configuration**](configuration.md) - Configuration file options
- [**Flags Reference**](flags-reference.md) - Command line flags
- [**Commands Reference**](commands-reference.md) - All available commands