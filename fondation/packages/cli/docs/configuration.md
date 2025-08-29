# Configuration

Advanced configuration options for customizing Fondation CLI.

## 📁 **Configuration Files**

The CLI only loads configuration when explicitly specified with the `--config` flag:
```bash
fondation run "prompt" --config ./.fondation.json
```

Supported file formats:
- `.fondation.json`
- `.fondation.yaml` / `.fondation.yml`  
- `.fondation.js`
- `.fondation.config.js`
- `.fondationrc`
- `.fondationrc.json`
- `.fondationrc.yaml`
- `.fondationrc.yml`
- `.fondationrc.js`

**Note**: There is no automatic search for config files. You must use `--config`.

## 🔧 **Configuration Schema**

### **Basic Configuration**
```json
{
  "model": "claude-sonnet-4-20250514",
  "outputDir": ".claude-output",
  "temperature": 0.7,
  "maxOutputTokens": 4096,
  "logMessages": true,
  "tools": ["Read", "Write", "Edit", "Bash"]
}
```

### **Configuration with Profiles**
```json
{
  "model": "claude-sonnet-4-20250514",
  "outputDir": ".claude-output",
  "temperature": 0.7,
  "maxOutputTokens": 4096,
  "logMessages": true,
  "tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
  "profiles": {
    "my-profile": {
      "temperature": 0.9,
      "maxOutputTokens": 8192
    }
  }
}
```

## ⚙️ **Configuration Options**

### **Model Settings**
```json
{
  "model": "claude-sonnet-4-20250514",  // Default model (claude-opus-4-20250514 also available)
  "temperature": 0.7,                    // 0.0 to 1.0, lower = more deterministic
  "maxOutputTokens": 4096               // Maximum tokens in response
}
```

### **Output Settings**
```json
{
  "outputDir": ".claude-output",         // Directory for session files
  "logMessages": true                    // Enable message logging to files
}
```

### **Tool Configuration**
```json
{
  "tools": [                           // Available tools
    "Read", "Write", "Edit", "MultiEdit",
    "Bash", "Grep", "Glob", "LS",
    "Task", "TodoRead", "TodoWrite",
    "WebFetch", "WebSearch",
    "NotebookRead", "NotebookEdit",
    "exit_plan_mode"
  ]
}
```

## 🎯 **Profile Configuration**

Profiles allow you to define preset configurations. When using `--profile`, these settings override the base configuration.

**Important**: Profiles currently only affect:
- `model`
- `temperature`
- `maxOutputTokens`
- `logMessages`
- `tools`

Profile settings for logging visibility (`verbose`, `quiet`) are controlled by command-line flags only.

### **Built-in Profiles**

The following profiles are available without a config file:

- **`clean`**: Intended for minimal output (use with `--quiet` flag)
- **`dev`**: Intended for development (use with `--verbose` flag)
- **`debug`**: Intended for debugging (use with `--verbose --thinking` flags)
- **`production`**: Lower temperature (0.3) for consistent results
- **`test`**: Limited tools (Read only), lower token limit (1000)

### **Custom Profiles**
```json
{
  "profiles": {
    "writing": {
      "temperature": 0.8,
      "maxOutputTokens": 8192
    },
    "coding": {
      "temperature": 0.3,
      "tools": ["Read", "Write", "Edit", "Bash"]
    },
    "analysis": {
      "temperature": 0.2,
      "maxOutputTokens": 8192,
      "tools": ["Read", "Grep", "Glob"]
    }
  }
}
```

### **Profile Inheritance**
```json
{
  "temperature": 0.7,                  // Base configuration
  "profiles": {
    "my-profile": {
      "temperature": 0.9              // Overrides base temperature
    }
  }
}
```

## 🌍 **Environment Variables**

The CLI respects these environment variables:

### **Core Settings**
```bash
# Model configuration
export CLAUDE_MODEL="claude-sonnet-4-20250514"

# Output directory
export CLAUDE_OUTPUT_DIR="/custom/output/path"

# Message logging
export ENABLE_MESSAGE_LOGGING=true
```

## 📂 **Configuration Examples**

### **Simple Configuration**
```json
{
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7
}
```

### **Developer Configuration**
```json
{
  "model": "claude-sonnet-4-20250514",
  "logMessages": true,
  "profiles": {
    "code-review": {
      "temperature": 0.3,
      "tools": ["Read", "Grep", "Bash"]
    },
    "refactor": {
      "temperature": 0.2,
      "tools": ["Read", "Write", "Edit", "MultiEdit"]
    }
  }
}
```

### **Content Creation Configuration**
```json
{
  "model": "claude-sonnet-4-20250514",
  "profiles": {
    "blog": {
      "temperature": 0.8,
      "maxOutputTokens": 4096
    },
    "technical-docs": {
      "temperature": 0.5,
      "maxOutputTokens": 8192
    }
  }
}
```

## 🔍 **Configuration Validation**

The CLI validates your configuration and provides helpful error messages:

### **Common Validation Errors**
```bash
# Invalid model
Error: Configuration validation failed:
  - model: Invalid enum value. Expected 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514'

# Invalid temperature
Error: Configuration validation failed:
  - temperature: Number must be between 0 and 1

# Invalid tools
Error: Configuration validation failed:
  - tools: Invalid tool name 'InvalidTool'
```

### **Configuration Testing**
```bash
# Test configuration
fondation run "test" --config ./my-config.json --verbose

# Test specific profile
fondation run "test" --config ./my-config.json --profile my-profile
```

## 🏗️ **Advanced Configuration**

### **Dynamic Configuration with JavaScript**
```javascript
// .fondation.config.js
module.exports = {
  model: "claude-sonnet-4-20250514",
  temperature: process.env.NODE_ENV === 'production' ? 0.3 : 0.7,
  profiles: {
    dev: {
      temperature: 0.7,
      maxOutputTokens: 4096
    },
    prod: {
      temperature: 0.2,
      maxOutputTokens: 2048
    }
  }
};
```

## 🔧 **Configuration Commands**

### **Using Configuration**
```bash
# Use specific config file
fondation run "prompt" --config ./my-config.json

# Use config with profile
fondation run "prompt" --config ./my-config.json --profile dev
```

### **Built-in Profiles (no config needed)**
```bash
# Use built-in profiles
fondation run "prompt" --profile production
fondation run "prompt" --profile test
```

## 💡 **Important Notes**

1. **Config files must be explicitly loaded** with `--config` flag
2. **Profiles only affect certain settings** (not logging visibility)
3. **Command-line flags override all config settings**
4. **Use `--quiet` for minimal output**, not profile settings
5. **Use `--verbose` for debug output**, not profile settings
6. **Use `--thinking` to see reasoning**, not profile settings

## 📖 **Related Documentation**

- [**Profiles Guide**](profiles-guide.md) - Using profiles effectively
- [**Flags Reference**](flags-reference.md) - Command line flag options
- [**Daily Usage**](daily-usage.md) - Common configuration patterns