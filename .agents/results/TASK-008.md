# TASK-008 RESULT

Status: COMPLETED (Stopped & Reported)

## Summary
Added a minimal flat ESLint config (`eslint.config.js`) manually reproducing the `eslint:recommended` rules, as `eslint` is dynamically resolved by `lint-staged` via `npx` and `@eslint/js` is not installed locally.

## Config Details
- Enabled JSX parsing (`languageOptions.parserOptions.ecmaFeatures.jsx: true`).
- Added sensible ignores and necessary globals (`React`, `URL`, `console`, `window`, etc.).
- Included all plain JS recommended rules as errors (e.g., `no-undef`, `no-unused-vars`).

## Smoke Test Results & Blockers
When running `npx --no-install eslint screens/ProfileScreen.js utils/timeAgo.js`, it fails with **5 errors**:
- `screens/ProfileScreen.js`
  - line 1: `'React' is defined but never used (no-unused-vars)`
  - line 4: `'ScrollView' is defined but never used (no-unused-vars)`
  - line 21: `'Shadows' is defined but never used (no-unused-vars)`
  - line 79: `'followerCount' is assigned a value but never used (no-unused-vars)`
  - line 80: `'followingCount' is assigned a value but never used (no-unused-vars)`

**Reason for Stopping:** 
Without `eslint-plugin-react` (which we are forbidden to install), the plain JS `no-unused-vars` rule does not recognize JSX tags as variable usage. This causes false positives for imports like `React` and `ScrollView`.
I cannot ignore these errors via config without globally weakening `no-unused-vars` to `warn` or `off`, which would hide the *real* unused variables (like `followerCount` and `followingCount`). Per the instructions: *"If existing code produces errors you cannot ignore via config without hiding real bugs, STOP and report the count/examples instead of weakening rules blindly."*

Therefore, I have stopped and am reporting these 5 errors.
