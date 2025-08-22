# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common problems you might encounter while developing or running Fondation, along with their solutions.

## Table of Contents
- [Setup Issues](#setup-issues)
- [Authentication Problems](#authentication-problems)
- [Convex Issues](#convex-issues)
- [Build & Development Errors](#build--development-errors)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

## Setup Issues

### Environment Variables Not Working

**Problem**: Application crashes with "Missing environment variable" errors.

**Solutions**:
1. Ensure `.env` file exists in root directory
2. Check variable names match exactly (case-sensitive)
3. Restart development server after changes
4. Verify no quotes around values unless needed

```bash
# Correct
GITHUB_CLIENT_ID=Ov23ligUtkpPscboFtGw

# Incorrect
GITHUB_CLIENT_ID="Ov23ligUtkpPscboFtGw"  # Unnecessary quotes
github_client_id=Ov23ligUtkpPscboFtGw    # Wrong case
```

### SKIP_ENV_VALIDATION Required

**Problem**: Need to use `SKIP_ENV_VALIDATION=1` for commands.

**Solution**: Set up proper GitHub OAuth credentials:
```bash
# Replace placeholders in .env
GITHUB_CLIENT_ID="your-actual-client-id"
GITHUB_CLIENT_SECRET="your-actual-client-secret"
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 bun run dev
```

## Authentication Problems

### GitHub OAuth Redirect Error

**Problem**: "Redirect URI mismatch" error from GitHub.

**Solutions**:
1. Check callback URL in GitHub OAuth app settings
2. Ensure it matches exactly: `http://localhost:3000/api/auth/callback/github`
3. No trailing slash
4. Check for http vs https

### Session Not Persisting

**Problem**: User gets logged out on refresh.

**Possible Causes & Solutions**:

1. **Missing AUTH_SECRET**:
```bash
# Generate new secret
npx auth secret
# Add to .env
AUTH_SECRET="generated-secret-here"
```

2. **Cookie blocked by browser**:
- Check browser console for cookie warnings
- Ensure localhost is not blocked
- Try incognito mode

3. **NEXTAUTH_URL mismatch**:
```bash
# Should match your dev URL
NEXTAUTH_URL="http://localhost:3000"
```

### GitHub Access Token Missing

**Problem**: `session.accessToken` is undefined.

**Solution**: Check auth config includes token in callbacks:
```typescript
// src/server/auth/config.ts
callbacks: {
  jwt: async ({ token, account }) => {
    if (account) {
      token.accessToken = account.access_token;
    }
    return token;
  },
  session: ({ session, token }) => ({
    ...session,
    accessToken: token.accessToken,
  }),
}
```

### "Invalid callback token" Error

**Problem**: Job status update fails with invalid token.

**Solutions**:
1. Ensure callback token is stored correctly
2. Check token is passed in update request
3. Verify no token modification during transmission

## Convex Issues

### Convex Dev Server Won't Start

**Problem**: `bunx convex dev` hangs or fails.

**Solutions**:
```bash
# Clear Convex cache
rm -rf node_modules/.cache/convex

# Restart with clean state
bunx convex dev --once
bunx convex dev
```

### TypeScript Errors After Schema Changes

**Problem**: Type errors after modifying `convex/schema.ts`.

**Solution**:
```bash
# Regenerate types
bunx convex dev --once

# Restart TS server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### "Function not found" Error

**Problem**: Convex function calls fail with "not found".

**Solutions**:
1. Ensure Convex dev server is running
2. Check function is exported
3. Verify correct import path
4. Wait for hot reload to complete

### Real-time Updates Not Working

**Problem**: Data doesn't update automatically.

**Solutions**:
1. Check WebSocket connection in browser Network tab
2. Ensure using `useQuery` not one-time fetch
3. Verify Convex dev server is running
4. Check for console errors

## Build & Development Errors

### TypeScript Build Errors

**Problem**: `tsc --noEmit` fails with type errors.

**Common Solutions**:

1. **Missing types**:
```bash
# Install type definitions
bun add -D @types/node
```

2. **Module resolution**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true
  }
}
```

3. **Regenerate Convex types**:
```bash
bunx convex dev --once
```

### ESLint Errors

**Problem**: Linting fails with errors.

**Solutions**:

1. **Auto-fix issues**:
```bash
bun run lint:fix
```

2. **Disable rule for line**:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {};
```

3. **Update ESLint config** for project-wide rules

### "Module not found" Error

**Problem**: Import fails with module not found.

**Solutions**:
1. Check file path and extension
2. Verify package is installed
3. Clear Next.js cache:
```bash
rm -rf .next
bun run dev
```

## Runtime Errors

### "Hydration mismatch" Error

**Problem**: React hydration errors in console.

**Solutions**:
1. Ensure consistent data between server and client
2. Use `suppressHydrationWarning` for dynamic content
3. Move dynamic content to client components
4. Check for browser extensions interfering

### Repositories Not Loading

**Problem**: Repository list shows "No repositories found".

**Debugging Steps**:
1. Check browser Network tab for API calls
2. Verify GitHub access token in session
3. Check Convex logs for errors
4. Test GitHub API directly:
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user/repos
```

### Toast Notifications Not Showing

**Problem**: Toast messages don't appear.

**Solutions**:
1. Ensure `<Toaster />` is in root layout
2. Check z-index conflicts in CSS
3. Verify toast is called after mount:
```typescript
useEffect(() => {
  toast.success("Message");
}, []);
```

## Performance Issues

### Slow Page Load

**Problem**: Application takes too long to load.

**Solutions**:
1. Check bundle size:
```bash
ANALYZE=true bun run build
```

2. Implement code splitting:
```typescript
const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <Skeleton />
});
```

3. Optimize images:
```typescript
import Image from 'next/image';
<Image src={url} width={100} height={100} />
```

### High Memory Usage

**Problem**: Development server uses excessive memory.

**Solutions**:
1. Clear Next.js cache
2. Restart development server
3. Check for memory leaks in components
4. Use React DevTools Profiler

## Debugging Tips

### Enable Debug Logging

1. **NextAuth debugging**:
```typescript
// auth/config.ts
export const authConfig = {
  debug: true,
};
```

2. **Convex debugging**:
```typescript
console.log("Convex function called:", args);
```

3. **Next.js debugging**:
```javascript
// next.config.js
module.exports = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
```

### Browser DevTools

1. **Check cookies**: Application → Cookies → localhost
2. **Monitor network**: Network tab → Filter by Fetch/XHR
3. **React DevTools**: Components tab → Check props/state
4. **Console errors**: Look for red error messages

### Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Check:
   - Function logs
   - Data browser
   - Metrics

### Common Debug Commands

```bash
# Check Node version
node --version

# Check Bun version
bun --version

# Clear all caches
rm -rf .next node_modules/.cache

# Check environment variables
env | grep GITHUB

# Test Convex connection
bunx convex function:list

# Check TypeScript version
npx tsc --version

# Analyze bundle
ANALYZE=true bun run build
```

## Getting Help

If you're still stuck after trying these solutions:

1. **Check existing issues**: [GitHub Issues]
2. **Search documentation**: 
   - This `/docs` folder
   - [Convex Docs](https://docs.convex.dev)
   - [Next.js Docs](https://nextjs.org/docs)
   - [NextAuth Docs](https://authjs.dev)

3. **Debug systematically**:
   - Isolate the problem
   - Create minimal reproduction
   - Check recent changes
   - Review error messages carefully

4. **Ask for help**:
   - Include error messages
   - Share relevant code
   - Describe what you've tried
   - Mention your environment (OS, Node version, etc.)

## Quick Fixes Checklist

When something isn't working, try these in order:

- [ ] Restart development server
- [ ] Clear browser cache and cookies
- [ ] Check environment variables
- [ ] Regenerate Convex types (`bunx convex dev --once`)
- [ ] Clear Next.js cache (`rm -rf .next`)
- [ ] Delete node_modules and reinstall (`rm -rf node_modules && bun install`)
- [ ] Check for typos in imports and variable names
- [ ] Verify all required services are running (Next.js, Convex)
- [ ] Check browser console for errors
- [ ] Review recent Git changes

## Environment-Specific Issues

### Development vs Production

Some issues only occur in specific environments:

**Development Only**:
- Hot reload issues → Restart dev server
- Type generation → Run `bunx convex dev`
- Strict mode double-rendering → Expected behavior

**Production Only**:
- Missing environment variables → Check deployment settings
- Build failures → Run `bun run build` locally
- Performance issues → Check bundle size

### Browser-Specific Issues

**Chrome/Edge**:
- Extensions may interfere → Try incognito mode

**Safari**:
- Stricter cookie policies → Check security settings

**Firefox**:
- Different DevTools → Use React Developer Tools extension

## Preventive Measures

To avoid common issues:

1. **Always run checks before committing**:
```bash
bun run check
```

2. **Keep dependencies updated**:
```bash
bun update --dry-run  # Check for updates
bun update           # Apply updates
```

3. **Use proper TypeScript types**:
- Avoid `any` type
- Define interfaces for data structures
- Use Convex-generated types

4. **Handle errors gracefully**:
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  toast.error("Something went wrong");
}
```

5. **Test in multiple browsers** during development

6. **Monitor bundle size** regularly

7. **Document your changes** for future debugging