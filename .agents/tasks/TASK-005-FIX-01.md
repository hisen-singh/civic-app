# TASK-005-FIX-01
- **Task ID:** TASK-005-FIX-01
- **Title:** Real auth validation tests via extracted pure validators (fixes TASK-005 FAIL)
- **Priority:** MEDIUM
- **Status:** COMPLETED

## Objective
Deliver REAL unit tests for auth validation logic by extracting it into a pure module — no rendering, no placeholder assertions.

## Context
- TASK-005 FAILED: delivered stubs with `expect(true).toBe(true)`.
- Manager probe established deep rendering is blocked by dependency mismatches (RTL v14 `createRoot` missing in installed RTR; RN main-entry Animated getter throws under RTR). Do NOT attempt render-based testing. Do NOT install/upgrade packages.
- LoginScreen currently maps Firebase error codes inline via a ternary chain (~lines 48–55 of screens/LoginScreen.js) and has NO minimum password length check (real bug #1).
- SignupScreen has no confirm-password field (real bug #2) — do NOT add UI fields; just make the validator exist and be tested so the screen can adopt it later.

## Detailed requirements
1. Create `utils/authValidators.js` exporting pure functions:
   - `validateEmail(email)` → `{ ok: boolean, error?: string }` (regex check; empty → error "Email is required.")
   - `validatePassword(password, min = 6)` → same shape; enforces min length ("Password must be at least 6 characters.")
   - `validatePasswordMatch(password, confirmPassword)` → same shape ("Passwords do not match.")
   - `mapFirebaseAuthError(code)` → friendly message string; must cover at least: `auth/user-not-found`, `auth/wrong-password`, `auth/too-many-requests`, `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, default generic.
2. Wire `screens/LoginScreen.js` and `screens/SignupScreen.js` to use these validators INSTEAD of their inline logic. Keep messages consistent with current UX where they already exist. This wiring is explicitly authorized (minimal diffs only).
3. Rewrite ALL tests in `__tests__/LoginScreen.test.js` and `__tests__/SignupScreen.test.js` to target `utils/authValidators.js` with real assertions. DELETE any remaining `expect(true).toBe(true)` stubs. The hollow MapScreen.test.js is OUT OF SCOPE — leave it.
4. Test cases required (minimum):
   - validateEmail: valid, empty, missing @, spaces
   - validatePassword: boundary min-1/min/exact-min, empty
   - validatePasswordMatch: match, mismatch, empty confirm
   - mapFirebaseAuthError: each mapped code + unknown-code fallback

## Acceptance criteria
- Zero `expect(true)` occurrences in the two touched test files.
- Full `npx jest --ci` green with increased meaningful test count (≥ 12 new real assertions).
- Screens still behave identically for currently-valid inputs (manager will diff-review wiring).

## Allowed files
- `utils/authValidators.js` (new)
- `screens/LoginScreen.js` (validator wiring only)
- `screens/SignupScreen.js` (validator wiring only)
- `__tests__/authValidators.test.js` (new)
- `__tests__/LoginScreen.test.js`
- `__tests__/SignupScreen.test.js`

## Forbidden actions
- Installing/upgrading packages.
- Render-based testing attempts.
- Editing services/, contexts/, App.js, theme.
- Placeholder assertions of any kind.

## Required tests
- `npx jest --ci __tests__/authValidators.test.js __tests__/LoginScreen.test.js __tests__/SignupScreen.test.js`
- Full `npx jest --ci` green.

## Completion requirements
- Result file `.agents/results/TASK-005-FIX-01.md` including the final assertion count.
