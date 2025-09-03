# Authentication Guide - Fondation CLI

## Overview
The Fondation CLI uses the Claude Code SDK for AI-powered repository analysis. Authentication is handled through OAuth tokens.

## Authentication Methods

### 1. Host System (Development)
When running the CLI directly on your host system (not in Docker), authentication uses the installed Claude CLI:

```bash
# Test authentication
claude -p "1+1"
# Output: 2 (if authenticated)

# Run analyze command
bun run cli:source analyze /path/to/repo
```

### 2. Docker Container (Production)
Docker containers require the OAuth token passed as an environment variable:

```bash
# Set token in .env file
CLAUDE_CODE_OAUTH_TOKEN="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"

# Run with token
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" \
  -v /path/to/repo:/workspace \
  -v /path/to/output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output
```

## Setting Up Authentication

### Step 1: Obtain OAuth Token
The OAuth token is obtained through Claude authentication. If you need a new token:
1. Install Claude CLI: `brew install claude` or `npm install -g @anthropic-ai/claude-code`
2. Authenticate: `claude login`
3. The token is stored and used automatically

### Step 2: Configure Environment
Add the token to your `.env` file:

```bash
# .env
CLAUDE_CODE_OAUTH_TOKEN="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"
```

### Step 3: Verify Authentication

#### Host System
```bash
claude -p "1+1"
# Should output: 2
```

#### Docker
```bash
source .env
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN \
  fondation/cli:latest \
  --version
# Should output version number
```

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Claude API | Docker execution |

## Common Issues

### Docker: "Claude Code process exited with code 1"
**Cause**: Missing or invalid OAuth token
**Solution**: Ensure `CLAUDE_CODE_OAUTH_TOKEN` is set correctly in environment

### Host: "Command not found: claude"
**Cause**: Claude CLI not installed
**Solution**: Install with `brew install claude` or `npm install -g @anthropic-ai/claude-code`

## Security Best Practices

1. **Never commit tokens**: Add `.env` to `.gitignore`
2. **Use environment files**: Pass tokens via `--env-file .env` instead of inline
3. **Rotate tokens regularly**: Generate new tokens periodically
4. **Limit token scope**: Use minimal required permissions
5. **Secure storage**: Store tokens in secure vaults for production

## Token Format
Valid Claude OAuth tokens follow this format:
- Start with: `sk-ant-oat`
- Format: `sk-ant-oat[version]-[unique-identifier]`
- Length: Approximately 100-120 characters

## Testing Authentication

### Quick Test Script
```bash
#!/bin/bash
# test-auth.sh

echo "Testing host authentication..."
if claude -p "1+1" 2>/dev/null | grep -q "2"; then
  echo "✅ Host authentication working"
else
  echo "❌ Host authentication failed"
fi

echo "Testing Docker authentication..."
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  if docker run --rm -e CLAUDE_CODE_OAUTH_TOKEN fondation/cli:latest --version >/dev/null 2>&1; then
    echo "✅ Docker authentication working"
  else
    echo "❌ Docker authentication failed"
  fi
else
  echo "❌ CLAUDE_CODE_OAUTH_TOKEN not set"
fi
```

## FAQ

### Q: Do I need different tokens for development and production?
A: You can use the same token, but for security, it's recommended to use separate tokens for different environments.

### Q: How long do tokens last?
A: OAuth tokens don't expire but can be revoked. Monitor for authentication failures and rotate as needed.

### Q: Can I use API keys instead of OAuth tokens?
A: No, the Claude Code SDK requires OAuth tokens, not API keys.

### Q: Why doesn't interactive authentication work in Docker?
A: Docker containers run in non-interactive mode and can't open browsers for OAuth flow. Token must be passed via environment variable.