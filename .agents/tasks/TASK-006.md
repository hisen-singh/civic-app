# TASK-006
- **Task ID:** TASK-006
- **Title:** Fix husky pre-commit hook (deprecation + hang)
- **Priority:** MEDIUM
- **Status:** COMPLETED

## Objective
Make `git commit` run its pre-commit checks reliably and without the husky v9 deprecation failure risk.

## Context
- Observed by MANAGER on 2026-08-25: commits hung at "Running pre-commit checks... Files to check: 15" and had to be made with `--no-verify` (commits d1794ac, 4bb0155).
- `.husky/pre-commit` contains deprecated lines: shebang + `. "$(dirname -- "$0")/_/husky.sh"` which WILL FAIL in husky v10.
- lint-staged config lives in package.json (`eslint --fix` + `prettier --write`). A repo-wide prettier pass was already committed in `d1794ac`, so future runs should be no-ops formatting-wise.

## Detailed requirements
1. Rewrite `.husky/pre-commit` to the modern single-command form (`npm run`-able), removing the two deprecated lines.
2. Diagnose why lint-staged hung: check for stale node/eslint processes conceptually; ensure eslint resolves quickly on this repo (`npx eslint --ext .js,.jsx screens/ProfileScreen.js` as smoke test). If eslint config is missing/broken, report it — do NOT add config files without manager approval.
3. Verify a real `git commit` completes WITH hooks enabled (make an empty commit `git commit --allow-empty -m "test: hook verification"` then confirm it exists).

## Acceptance criteria
- `git commit` with hooks completes in reasonable time (<60s) on an empty change.
- No deprecation warning from husky.

## Allowed files
- `.husky/pre-commit`
- `.husky/` helper files if strictly required by husky v9 migration

## Forbidden actions
- Disabling or deleting hooks entirely.
- Editing package.json lint-staged config.
- Installing/updating packages.

## Required tests
- Empty-commit verification described above; full `npx jest --ci` remains green.

## Completion requirements
- Result file `.agents/results/TASK-006.md`.
