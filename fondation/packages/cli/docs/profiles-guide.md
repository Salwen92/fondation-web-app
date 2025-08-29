# Profiles Guide

Pre-configured profiles that set specific configuration values for different use cases.

## 🎯 **What Are Profiles?**

Profiles are preset configurations that change settings like temperature, model, and available tools. They do NOT control output visibility - use command-line flags for that.

**Important**: Profiles work differently than you might expect:
- Profiles only affect: `model`, `temperature`, `maxOutputTokens`, `logMessages`, and `tools`
- Profiles do NOT affect: output visibility, thinking mode, or verbosity
- Use `--quiet`, `--verbose`, and `--thinking` flags to control output

## 📋 **Available Built-in Profiles**

### **`clean` Profile**
Intended for clean output, but you must use `--quiet` flag.

```bash
# WRONG - profile alone doesn't hide tool logs
fondation run -p "Explain TypeScript" --profile clean

# CORRECT - use --quiet flag
fondation run -p "Explain TypeScript" --quiet
```

**What it sets**: Nothing that affects output visibility

### **`dev` Profile**
Intended for development, but you must use `--verbose` flag.

```bash
# WRONG - profile alone doesn't show debug logs
fondation run -p "Debug this" --profile dev

# CORRECT - use --verbose flag
fondation run -p "Debug this" --verbose
```

**What it sets**: Nothing that affects output visibility

### **`debug` Profile**
Intended for debugging, but you must use both `--verbose` and `--thinking` flags.

```bash
# WRONG - profile alone doesn't enable thinking or debug logs
fondation run -p "Complex problem" --profile debug

# CORRECT - use the flags
fondation run -p "Complex problem" --verbose --thinking
```

**What it sets**: Nothing that affects output visibility or thinking

### **`production` Profile**
Actually useful! Sets lower temperature for consistency.

```bash
fondation run -p "Process this data" --profile production
```

**What it sets**:
- ✅ Lower temperature (`temperature: 0.3`) for consistent results
- ❌ Does NOT enable Docker sandbox (feature not implemented)

### **`test` Profile**
Actually useful! Limits tools and token output.

```bash
fondation run -p "Test query" --profile test
```

**What it sets**:
- ✅ Limited tools (`tools: ['Read']`)
- ✅ Lower token limit (`maxOutputTokens: 1000`)
- ✅ Custom output directory (`outputDir: './test-output'`)

## 🔧 **Using Profiles**

### **Basic Usage**
```bash
# Use profile (limited effect)
fondation run -p "Your prompt" --profile <profile-name>

# Profiles + flags for intended behavior
fondation run -p "Your prompt" --profile clean --quiet
fondation run -p "Your prompt" --profile dev --verbose
fondation run -p "Your prompt" --profile debug --verbose --thinking
```

### **With Configuration File**
```bash
# Profiles from config file
fondation run -p "prompt" --config ./my-config.json --profile my-profile
```

### **Profile Priority**
1. **CLI flags** (highest priority - always win)
2. **Profile settings** (only for supported options)
3. **Config file defaults**
4. **Built-in defaults** (lowest priority)

## 🏗️ **Custom Profiles**

You can define custom profiles in your configuration file:

### **Example Configuration**
```json
{
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "profiles": {
    "creative": {
      "temperature": 0.9,
      "maxOutputTokens": 8192
    },
    "precise": {
      "temperature": 0.2,
      "maxOutputTokens": 4096,
      "tools": ["Read", "Grep"]
    }
  }
}
```

### **Using Custom Profiles**
```bash
# Must specify config file
fondation run -p "Write a story" --config ./config.json --profile creative
fondation run -p "Analyze code" --config ./config.json --profile precise
```

## 🎯 **Practical Examples**

### **For Clean Output**
```bash
# Don't rely on profiles, use flags
fondation run -p "prompt" --quiet
```

### **For Development**
```bash
# Don't rely on profiles, use flags
fondation run -p "prompt" --verbose
```

### **For Consistent Results**
```bash
# Production profile is actually useful
fondation run -p "prompt" --profile production
```

### **For Limited Testing**
```bash
# Test profile is actually useful
fondation run -p "prompt" --profile test
```

### **For Full Debugging**
```bash
# Combine flags, not profile
fondation run -p "prompt" --verbose --thinking
```

## 💡 **What Profiles Actually Do**

### **Settings that Profiles CAN Change:**
- `model` - Which Claude model to use
- `temperature` - Response randomness (0-1)
- `maxOutputTokens` - Response length limit
- `logMessages` - Whether to save messages to files
- `tools` - Which tools are available

### **Settings that Profiles CANNOT Change:**
- Tool log visibility (use `--quiet`)
- System log visibility (use `--verbose`)
- Thinking mode (use `--thinking`)
- Output format (use `--json`)
- Any sandbox/Docker settings (not implemented)

## 🚫 **Common Misconceptions**

### **Misconception 1: Profiles control output**
❌ **Wrong**: "Use `--profile clean` for minimal output"  
✅ **Right**: Use `--quiet` flag for minimal output

### **Misconception 2: Debug profile enables thinking**
❌ **Wrong**: "Use `--profile debug` to see thinking"  
✅ **Right**: Use `--thinking` flag to see thinking

### **Misconception 3: Profiles enable sandbox**
❌ **Wrong**: "Production profile uses Docker sandbox"  
✅ **Right**: Sandbox functionality is not implemented

## 🔄 **Migration Guide**

If you're used to other tools where profiles control everything:

### **Instead of:**
```bash
fondation run -p "prompt" --profile clean
fondation run -p "prompt" --profile dev  
fondation run -p "prompt" --profile debug
```

### **Use:**
```bash
fondation run -p "prompt" --quiet
fondation run -p "prompt" --verbose
fondation run -p "prompt" --verbose --thinking
```

## 📊 **When Profiles Are Useful**

Profiles ARE useful for:
1. **Changing temperature** - Use `production` profile for consistency
2. **Limiting tools** - Use `test` profile for restricted access
3. **Custom configurations** - Define your own model/temperature combinations

Profiles are NOT useful for:
1. **Controlling output visibility** - Use flags instead
2. **Enabling features** - Use flags instead
3. **Sandbox/security** - Not implemented

## 📖 **Related Documentation**

- [**Flags Reference**](flags-reference.md) - Command line flags (what actually controls output)
- [**Configuration**](configuration.md) - How to create custom profiles
- [**Daily Usage**](daily-usage.md) - Practical usage patterns