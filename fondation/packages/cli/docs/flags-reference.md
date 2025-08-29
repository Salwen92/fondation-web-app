# Flags Reference

Complete reference for all CLI flags with examples and use cases.

## 🌐 **Global Flags**

These flags work with all commands:

### **`--verbose` / `-v`**
Enable verbose output for debugging
```bash
fondation run -p "prompt" --verbose
```
**Shows**: Configuration loading, command lifecycle, app debugging info

### **`--quiet` / `-q`**
Suppress all logs and tool output (minimal output)
```bash
fondation run -p "prompt" --quiet
```
**Effect**: Only shows Claude's response, no tool logs or system messages

### **`--json`**
Output structured JSON format
```bash
fondation run -p "prompt" --json
```
**Returns**: 
```json
{
  "messages": [...],
  "tools": [...],
  "error": null,
  "stats": { "duration": 3000, "messageCount": 1 }
}
```

### **`--profile <profile>`**
Use configuration profile
```bash
fondation run -p "prompt" --profile clean
```
**Available**: `clean`, `dev`, `debug`, `production`, `test`

### **`--config <path>`**
Path to custom config file
```bash
fondation run -p "prompt" --config ./my-config.json
```

### **`--log-file <path>`**
Write logs to specified file
```bash
fondation run -p "prompt" --log-file debug.log
```

## 🏃 **Run Command Flags**

### **Input Options**

#### **`--prompt <text>` / `-p`**
Provide prompt directly
```bash
fondation run -p "What is TypeScript?"
```

#### **`--file <path>` / `-f`**
Read prompt from file
```bash
fondation run -f ./my-prompt.txt
```

#### **`--stdin`**
Read prompt from stdin
```bash
echo "Long prompt here" | fondation run --stdin
```

### **Output Control**



### **Thinking & Reasoning**

#### **`--thinking`**
Show Claude's reasoning process
```bash
fondation run -p "Solve this problem step by step" --thinking
```
**Shows**: 
```
💭 Claude is thinking...
└─ Thinking complete (2.3s)

[Claude's response]
```


### **Logging & Debug**

#### **`--verbose`**
Show detailed system logs for debugging
```bash
fondation run -p "prompt" --verbose
```
**Shows**: Query processing, SDK messages, system events

#### **`--quiet`**
Suppress tool execution logs (cleaner output)
```bash
fondation run -p "prompt" --quiet
```
**Effect**: No `[⏺] Tool: action` or `[✓] Tool: result` messages

### **Model & Tools**

#### **`--model <model>` / `-m`**
Claude model to use
```bash
fondation run -p "prompt" --model claude-opus-4-20250514
```
**Available**: `claude-sonnet-4-20250514`, `claude-opus-4-20250514` (default: claude-sonnet-4-20250514)

#### **`--tools <tools...>`**
Allowed tools (comma-separated)
```bash
fondation run -p "prompt" --tools Read,Write,Bash
```
**Default**: `["Read","Write","Edit","Bash"]`

### **Session Management**

#### **`--session <id>`**
Session ID for context
```bash
fondation run -p "continue our conversation" --session abc123
```

#### **`--system-prompt <path>`**
Custom system prompt file
```bash
fondation run -p "prompt" --system-prompt ./custom-system.txt
```



## 💬 **Chat Command Flags**

### **`--model <model>` / `-m`**
Claude model to use
```bash
fondation chat --model claude-opus-4-20250514
```

### **`--resume <session>` / `-r`**
Resume specific session
```bash
fondation chat --resume session-123
```

### **`--no-history`**
Disable conversation history (messages won't be saved)
```bash
fondation chat --no-history
```

### **`--output-dir <dir>` / `-o`**
Set output directory
```bash
fondation chat --output-dir ./my-sessions
```

## 🔗 **Flag Combinations**

### **Common Combinations**

#### **Clean End User Experience**
```bash
fondation run -p "prompt" --profile clean --thinking
```

#### **Full Developer Debug**
```bash
fondation run -p "prompt" --verbose --thinking
```

#### **Automated/Scripting**
```bash
fondation run -p "prompt" --json --quiet
```

#### **Production Use**
```bash
fondation run -p "prompt" --profile production
```

### **Flag Priority**
When flags conflict, this is the priority order:
1. **CLI flags** (highest priority)
2. **Profile settings**
3. **Config file**
4. **Environment variables**
5. **Built-in defaults** (lowest priority)

## 💡 **Pro Tips**

### **Performance**
- Use `--quiet` to reduce output processing overhead
- Use `--profile production` for consistent results

### **Debugging**
- Start with `--profile debug` for maximum visibility
- Use `--verbose` to debug system issues
- Use `--thinking` to understand Claude's reasoning

### **Automation**
- Use `--json` for structured output
- Use `--quiet` to reduce noise in logs