# Doppler Quick Reference

## Current Configuration
- **Project**: `fondation`
- **Config**: `dev_local` (contains all secrets)
- **Scope**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app`

## Essential Commands

### Check Current Setup
```bash
doppler configure
```

### Switch to Correct Config
```bash
doppler setup --project fondation --config dev_local
```

### View All Secrets
```bash
doppler secrets
```

### Run Development with Doppler
```bash
# From fondation directory
cd fondation
bun run dev  # Automatically uses Doppler
```

### Test Secret Injection
```bash
doppler run -- echo "Claude Token: ${CLAUDE_CODE_OAUTH_TOKEN:0:20}..."
```

## Available Configs
- `dev_local` - **USE THIS** (has all secrets)
- `dev_personal` - Empty, for personal overrides
- `dev` - Base development config
- `stg` - Staging environment
- `prd` - Production environment

## Troubleshooting

### If "secret not found" error:
```bash
# You're probably on wrong config, switch to dev_local
doppler setup --project fondation --config dev_local
```

### If "authentication failed":
```bash
doppler login
```

### To run without Doppler (fallback):
```bash
cd fondation
bun run dev:nodoppler
```