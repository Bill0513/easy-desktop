# Code Map Workflow

This project uses a generated code map to keep module/function indexing in sync with code changes.

## Commands

- Build/update map: `npm run code-map:build`

## Files

- Machine-readable index: `docs/code-map/index.json`
- Human-readable map: `docs/code-map/index.md`

## When to update

Run `npm run code-map:build` after changes to:

- frontend files in `src/`
- local backend files in `server/`
- edge handlers in `functions/`

Then commit code changes and `docs/code-map/*` together.

## Optional local Git hook

If you want automatic updates before each commit:

```bash
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
npm run code-map:build
HOOK
chmod +x .git/hooks/pre-commit
```
