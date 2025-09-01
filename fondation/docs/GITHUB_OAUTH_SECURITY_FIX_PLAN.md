# GitHub OAuth Security Fix Implementation Plan

## Current State
- **Security Score:** 4/10 🔴 CRITICAL
- **Production Readiness:** NOT SAFE FOR PRODUCTION
- **Branch:** fix/github-oauth-security
- **Started:** 2025-09-01

## Critical Vulnerabilities to Fix
1. **No Real Encryption** - Tokens stored with base64 only
2. **Tokens in Git URLs** - Visible in process lists
3. **Over-scoped Permissions** - Full repo access when read-only sufficient
4. **No Rate Limiting** - Will fail at API limits
5. **No Token Validation** - Expired tokens not detected
6. **Missing Security Monitoring** - No audit trail

## Fix Phases

### Phase 1: Critical Security - Token Encryption ⏳
- [ ] Create new encryption module with AES-256-GCM
- [ ] Replace base64 "obfuscation" with real encryption
- [ ] Update token storage/retrieval functions
- [ ] Add encryption key management
- [ ] Test encryption/decryption roundtrip
- **Status:** In Progress
- **Started:** 2025-09-01

### Phase 2: Critical Security - Git URL Token Exposure
- [ ] Implement Git credential helper approach
- [ ] Remove tokens from clone URLs
- [ ] Add token masking in logs
- [ ] Clean up credentials after use
- [ ] Test git operations security
- **Status:** Pending

### Phase 3: Scope Reduction & Permission Management
- [ ] Reduce OAuth scope to minimum required
- [ ] Add scope configuration options
- [ ] Update authentication flow
- [ ] Document permission requirements
- [ ] Test with reduced permissions
- **Status:** Pending

### Phase 4: Rate Limiting & Token Lifecycle
- [ ] Implement GitHub API rate limiting
- [ ] Add token validation before use
- [ ] Handle expired/revoked tokens
- [ ] Add token refresh mechanism
- [ ] Test rate limit behavior
- **Status:** Pending

### Phase 5: Monitoring & Audit Logging
- [ ] Add security event logging
- [ ] Implement token usage monitoring
- [ ] Create security alerts
- [ ] Add suspicious activity detection
- [ ] Test audit trail completeness
- **Status:** Pending

### Phase 6: Testing & Validation
- [ ] Create comprehensive security test suite
- [ ] Test all vulnerability fixes
- [ ] Perform security audit
- [ ] Update documentation
- [ ] Final security score assessment
- **Status:** Pending

## Implementation Rules

### Pre-Phase Checklist
```bash
git status                    # Clean working directory
bun test                      # All tests pass
bun run typecheck            # No type errors
bun run lint                 # No lint errors
```

### Post-Phase Requirements
```bash
bun test                     # All tests pass
bun run build               # Build succeeds
git diff --stat             # Review changes
git commit -m "fix(security): Phase X - [description]"
```

## Progress Tracking

### Phase 1 Progress
- Started: 2025-09-01
- Files to modify:
  - [ ] packages/web/src/lib/encryption.ts (new)
  - [ ] packages/web/src/lib/simple-crypto.ts (update)
  - [ ] packages/web/src/app/api/auth/store-token/route.ts
  - [ ] packages/worker/src/worker.ts
  - [ ] packages/worker/src/simple-crypto.ts

### Environment Variables Required
```env
# Add to .env files
ENCRYPTION_KEY=<32-byte-hex-string>  # Generate with: openssl rand -hex 32
```

## Success Criteria
- [ ] Security score improved to 8+/10
- [ ] No tokens visible in logs/process list
- [ ] Proper encryption implemented
- [ ] Rate limiting functional
- [ ] All tests passing
- [ ] Production ready

## Blockers & Issues
- None identified yet

## Testing Commands
```bash
# After each phase
bun test src/**/*.test.ts
bun run typecheck
bun run lint

# Security validation
grep -r "ghs_\|ghp_\|github_pat_" . --exclude-dir=node_modules
ps aux | grep git  # During clone operations
```

## Notes
- Each phase must be completed and tested before moving to the next
- All changes must maintain backward compatibility where possible
- Security fixes take priority over feature work
- Document all security-related decisions

---

**Last Updated:** 2025-09-01
**Current Phase:** 1 - Token Encryption
**Next Review:** After Phase 1 completion