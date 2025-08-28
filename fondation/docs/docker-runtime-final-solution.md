# Fondation Docker Runtime (FINAL)

## Canonical Runtime (do not change)
**Image**: `fondation-worker:authed-patched`  
**User/HOME**: uid=1001 /home/worker  
**Command**: `cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js <repo>`  
**Auth**: OAuth via `claude login` baked into image; if expired, re-run login & commit  
**Prompts**: `/app/packages/cli/prompts/`  

**Never use**: cli.bundled.cjs or Bun in runtime.

## Preflight
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker \
  fondation-worker:authed-patched sh -lc 'claude -p "auth ok?" --output-format text | head -3'
```

## Definitive Run
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker -e NODE_PATH=/app/node_modules \
  fondation-worker:authed-patched sh -lc '
    set -e
    cd /app/packages/cli
    mkdir -p /tmp/repo && printf "# tmp\n" > /tmp/repo/README.md
    time node dist/analyze-all.js /tmp/repo
    echo "[ARTIFACTS]"; find /tmp/repo/.claude-tutorial-output -maxdepth 2 -type f | sort | sed -n "1,120p"
  '
```

## Why this works
- ESM self-heal: `/packages/cli/scripts/patch-esm-imports.js` runs in Docker build and appends `.js` to relative imports under `/app/packages/cli/dist/**`.
- SDK resolves from monorepo via `NODE_PATH=/app/node_modules`.
- No Bun required at runtime.

## One-time auth (interactive)
```bash
docker run -it --name cc-login --user 1001:1001 -e HOME=/home/worker \
  fondation-worker:patched claude login
docker commit cc-login fondation-worker:authed-patched
docker rm cc-login
```

## Troubleshooting

**401 / Invalid API key**: re-run interactive login or use non-TTY fallback to copy host creds into /home/worker.

**No chapters on trivial repos**: seed a tiny src/*.ts to force content.

**Do not use cli.bundled.cjs in production**.

## Non-TTY fallback (if needed)
```bash
docker run --rm -u 0:0 \
  -e HOME=/home/worker \
  -v "$HOME/.claude:/mnt/hostclaude:ro" \
  -v "$HOME/.claude.json:/mnt/hostclaude.json:ro" \
  fondation-worker:patched sh -lc '
    set -e
    mkdir -p /home/worker/.claude
    cp -a /mnt/hostclaude/. /home/worker/.claude/ || true
    cp -a /mnt/hostclaude.json /home/worker/.claude.json || true
    chown -R 1001:1001 /home/worker/.claude /home/worker/.claude.json
    su -s /bin/sh worker -c "
      cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js /tmp/repo
      find /tmp/repo/.claude-tutorial-output -maxdepth 2 -type f | sort | sed -n \"1,120p\"
    "
  '
```

# TL;DR for the team

- **Use** `fondation-worker:authed-patched`.
- **Run** `cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js <repo>`.
- **Auth** is already baked in that image; if it ever expires, re-run `claude login` and re-commit.
- ESM patching is **automatic** in the image; no manual fixes needed.

# Next phase (when you're ready)

- Proceed to the **UI E2E "Test" trigger on repo card** and **Playwright data-testids** work exactly as we outlined earlier. No Docker changes required now that the runtime is green.