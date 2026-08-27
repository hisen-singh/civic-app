# TASK-008
- **Task ID:** TASK-008
- **Title:** Add minimal flat ESLint config so lint-staged pre-commit works on real changes
- **Priority:** MEDIUM
- **Status:** COMPLETED

## Objective
Without an `eslint.config.js`, every commit containing staged `.js/.jsx` files fails at the pre-commit hook (`ESLint couldn't find an eslint.config.* file`). This blocks the whole hook pipeline TASK-006 just fixed.

## Context
- `.husky/pre-commit` = `npx --yes lint-staged`; package.json lint-staged runs `eslint --fix` on `*.{js,jsx}`.
- Repo has NO eslint config file anywhere (verified by worker diagnostics).
- eslint version available via node_modules (used by lint-staged). Check installed major version FIRST (`npx eslint --version`) — if v9+, use flat config (`eslint.config.js`); if v8, use `.eslintrc.json`.

## Detailed requirements
1. Add a MINIMAL config enabling recommended rules only, with sensible ignores (`node_modules/`, `.expo/`, `dist*/`, `web-client/`, `functions/node_modules/`, `admin-dashboard/dist/`, coverage dirs).
2. Rules: default recommended; relax `react-native/no-unused-styles` style plugins are NOT to be added (no new packages). If `eslint-plugin-react` etc. are not installed, do NOT reference them — plain JS recommended only.
3. Run `npx eslint --ext .js,.jsx screens/ProfileScreen.js utils/timeAgo.js` as smoke test — it must EXIT 0 after your config exists (warnings tolerated, errors not). If existing code produces errors you cannot ignore via config without hiding real bugs, STOP and report the count/examples instead of weakening rules blindly.
4. Verify end-to-end: stage a trivial change to one .js file and complete a `git commit` WITH hooks enabled.

## Acceptance criteria
- `npx eslint --ext .js,.jsx <file>` exits 0 on sample files.
- A real commit with a staged .js file completes with hooks enabled.
- Full `npx jest --ci` stays green (config shouldn't affect tests, but confirm).

## Allowed files
- `eslint.config.js` OR `.eslintrc.json` (whichever matches installed eslint major)
- One scratch file for the end-to-end commit test (delete after)

## Forbidden actions
- Installing packages. Changing package.json. Disabling rules file-by-file across the codebase. Mass-reformatting source.

## Required tests
- As described above; plus full jest run green.

## Completion requirements
- Result file `.agents/results/TASK-008.md`.
