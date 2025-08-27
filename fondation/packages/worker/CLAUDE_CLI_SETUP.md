# Claude CLI Authentication Setup Guide

## Overview

The Fondation Worker requires authenticated Claude CLI access to perform repository analysis and documentation generation. This guide covers the authentication setup process for production deployment.

## Authentication Requirements

### 1. Claude CLI Version
- **Installed Version**: Claude Code v1.0.93
- **Installation Method**: Official curl installer from https://claude.ai/install.sh
- **Location**: `/usr/local/bin/claude` in container

### 2. Authentication Methods

Claude CLI supports two authentication methods:

#### Method A: Claude Pro/Max Subscription
- Requires active Claude Pro or Max subscription
- Interactive login via web browser: `claude` (first run)
- Stores credentials in `~/.claude/` directory

#### Method B: Anthropic Console Account  
- Requires Anthropic Console account
- API token setup: `claude setup-token`
- Long-lived authentication tokens

### 3. Container Authentication Setup

For production worker deployment, choose one approach:

#### Option 1: Pre-authenticated Container Volume
```bash
# 1. Authenticate locally
claude  # Follow web browser login

# 2. Copy credentials to persistent volume
docker volume create claude-auth
docker run --rm -v claude-auth:/data -v ~/.claude:/source alpine cp -r /source /data

# 3. Mount volume in worker container
docker run -v claude-auth:/home/worker/.claude fondation-worker
```

#### Option 2: Environment Token (Recommended for Production)
```bash
# 1. Setup long-lived token
claude setup-token

# 2. Extract token from config
cat ~/.claude/config.json

# 3. Set environment variable in deployment
CLAUDE_TOKEN="your-long-lived-token"
```

## Production Deployment Checklist

### ✅ **Container Requirements Met**
- [x] Claude Code CLI v1.0.93 installed
- [x] `/usr/local/bin/claude` executable permissions
- [x] Non-interactive mode support with `--print` flag
- [x] JSON output format support with `--output-format json`
- [x] Working directory context support

### ⚠️ **Authentication Setup Required**
- [ ] Choose authentication method (Pro/Max subscription or Console account)
- [ ] Setup persistent credentials storage (`~/.claude/` directory)
- [ ] Verify authentication with `claude --print "test prompt"`
- [ ] Test repository analysis functionality
- [ ] Configure credential persistence for container restarts

### 🔧 **CLI Integration Verified**
- [x] Updated CLI executor with correct command syntax
- [x] Non-interactive execution with `--print` flag
- [x] JSON output format for structured responses
- [x] Working directory context passing
- [x] Error handling for authentication failures

## Testing Authentication

### Local Testing
```bash
# Test CLI installation
claude --version

# Test authentication status  
claude --print "Hello, test prompt"

# Test repository analysis (requires authenticated CLI)
cd /path/to/repository
claude --print --output-format json "Analyze this repository structure"
```

### Container Testing
```bash
# Test CLI availability in container
docker run --rm fondation-worker claude --version

# Test authentication (will fail without setup)
docker run --rm -v ~/.claude:/home/worker/.claude fondation-worker claude --print "test"
```

## Error Scenarios and Solutions

### Error: "Invalid API key · Please run /login"
**Cause**: Claude CLI not authenticated
**Solution**: Complete authentication setup using one of the methods above

### Error: "Raw mode is not supported on the current process.stdin"
**Cause**: Interactive command used in non-interactive environment
**Solution**: Always use `--print` flag for container execution

### Error: "Permission denied"
**Cause**: Incorrect file permissions on Claude CLI binary
**Solution**: Verify executable permissions with `chmod +x /usr/local/bin/claude`

## Production Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App       │    │   Convex Queue   │    │ Worker Container│
│                 │───▶│                  │───▶│                 │
│ Job Creation    │    │ Job Distribution │    │ Claude CLI      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Claude AI API   │
                                               │ (via CLI auth)  │
                                               └─────────────────┘
```

## Security Considerations

1. **Credential Storage**: Store authentication tokens securely
2. **Container Isolation**: Use non-root user (`worker:worker`)
3. **Network Security**: Ensure secure communication with Claude API
4. **Token Rotation**: Regularly rotate authentication tokens
5. **Audit Logging**: Monitor Claude CLI usage and authentication events

## Next Steps

1. **Choose Authentication Method**: Pro/Max subscription or Console account
2. **Setup Credentials**: Follow authentication setup process
3. **Test Integration**: Verify Claude CLI works in worker container
4. **Deploy with Persistence**: Ensure credentials persist across container restarts
5. **Monitor Usage**: Track Claude API usage and costs

---

**Status**: ✅ Claude CLI successfully installed and configured
**Next**: Complete authentication setup for production deployment