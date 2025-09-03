# Documentation Changelog

## Overview
This changelog documents all corrections made to the Fondation project documentation based on hands-on testing and discovery of the actual authentication mechanisms.

## Critical Updates Applied

### Authentication Method Corrections

#### Removed (Incorrect Methods)
- **Interactive Docker Authentication**: `docker exec -it auth npx claude auth`
  - **Why removed**: Does not work in Docker containers; Claude CLI requires OAuth token via environment variable
  - **Replaced with**: `CLAUDE_CODE_OAUTH_TOKEN` environment variable method

- **Authenticated Docker Images**: References to `fondation/cli:authenticated`
  - **Why removed**: No separate authenticated image needed; authentication via environment variable
  - **Replaced with**: Standard image with token passed at runtime

- **ANTHROPIC_API_KEY References**
  - **Why removed**: Not used by Claude Code SDK; uses OAuth token instead
  - **Replaced with**: `CLAUDE_CODE_OAUTH_TOKEN`

#### Added (Correct Methods)
- **OAuth Token Authentication**: 
  ```bash
  CLAUDE_CODE_OAUTH_TOKEN="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"
  ```
  - Added to `.env` files for persistence
  - Documented proper passing to Docker containers

### Docker Command Updates

#### Before (Incorrect)
```bash
# Interactive authentication attempt
docker exec -it auth bunx claude auth
docker commit auth fondation/cli:authenticated

# Using authenticated image
docker run fondation/cli:authenticated analyze
```

#### After (Correct)
```bash
# Pass token via environment variable
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" \
  fondation/cli:latest analyze

# Or use env file
docker run --rm --env-file .env fondation/cli:latest analyze
```

### CLI Execution Documentation

#### Added Clarity
1. **Source execution**: Uses host Claude CLI installation
2. **Distribution execution**: Pre-built bundles, uses host Claude CLI
3. **Docker execution**: Requires explicit token via environment variable

### Environment Variable Standardization

#### Before (Mixed references)
- `ANTHROPIC_API_KEY`
- `CLAUDE_API_KEY`
- `CLAUDE_CODE_OAUTH_TOKEN`
- Various other variations

#### After (Standardized)
- **Only**: `CLAUDE_CODE_OAUTH_TOKEN` for all Claude authentication

## Files Updated

### Priority 1 - Critical Authentication Files
1. `/fondation/docs/DOCKER_BUILD_GUIDE.md` - Removed interactive auth, added token method
2. `/fondation/docs/CLAUDE_INTEGRATION.md` - Updated to reflect OAuth token only
3. `/fondation/docs/GETTING_STARTED.md` - Added token to quick start
4. `/fondation/README.md` - Updated Docker examples with token
5. `/fondation/packages/worker/README.md` - Removed authenticated image references

### Priority 2 - Docker & Deployment
1. `/fondation/docs/DEPLOYMENT.md` - Updated production deployment with token
2. `/fondation/docs/DEVELOPMENT.md` - Added token to development setup
3. `/fondation/docs/TROUBLESHOOTING.md` - Fixed authentication troubleshooting

### Priority 3 - Architecture & Reference
1. `/fondation/docs/ARCHITECTURE.md` - Updated authentication architecture
2. `/fondation/docs/API.md` - Clarified authentication endpoints
3. `/fondation/docs/SECURITY.md` - Updated security practices for tokens

## Deprecated Content Removed

### Commands
- `docker exec -it [container] bunx claude auth` - Does not work
- `docker commit [container] fondation/cli:authenticated` - Not needed
- `npx claude auth` - Not applicable in containers

### Configuration
- `ANTHROPIC_API_KEY` environment variable - Not used by Claude Code SDK
- References to browser-based authentication in Docker
- Complex authentication container procedures

### Images
- `fondation/cli:authenticated` - No separate authenticated image needed

## New Documentation Created

1. **CLI_EXECUTION_MASTERY.md** - Complete guide for all three execution methods
2. **AUTHENTICATION_GUIDE.md** - Comprehensive authentication setup
3. **QUICK_START.md** - Fastest path to getting started

## Validation Checklist

- [x] All Docker commands use `CLAUDE_CODE_OAUTH_TOKEN`
- [x] No references to interactive Docker authentication remain
- [x] Token is properly documented in `.env` files
- [x] All three CLI execution methods documented correctly
- [x] Troubleshooting includes token verification steps
- [x] Security documentation updated for token handling

## Recommendations

1. **Token Management**: Consider implementing a token rotation strategy
2. **Documentation Testing**: Add automated tests for documentation commands
3. **Version Control**: Never commit actual tokens to repository
4. **Access Control**: Implement proper token scoping for different environments

## Notes

- The actual OAuth token has been added to `.env` files for persistence
- All commands have been tested and verified to work
- Documentation now reflects actual working procedures, not theoretical ones