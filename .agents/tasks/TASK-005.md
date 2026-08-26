# TASK-005
- **Task ID:** TASK-005
- **Title:** Unit tests for LoginScreen and SignupScreen flows
- **Priority:** LOW
- **Status:** COMPLETED

## Objective
Increase coverage of auth UI flows (audit #14).

## Context
- Existing examples to follow: `__tests__/LoginScreen.test.js`, `__tests__/SignupScreen.test.js`, `__tests__/MapScreen.test.js` — read them FIRST and mirror their mocking patterns exactly (they mock firebase/auth, AuthContext, react-navigation).
- NOTE: LoginScreen and SignupScreen ALREADY have test files. This task EXTENDS them rather than creating duplicates.

## Detailed requirements
1. LoginScreen tests — add cases:
   - Shows validation error when email format invalid on submit.
   - Password shorter than minimum shows error and does NOT call AuthService.login.
   - Successful submit calls login exactly once with trimmed email.
2. SignupScreen tests — add cases:
   - Mismatched password/confirm blocks submit.
   - Successful submit calls signup once with expected payload shape.
3. Do not modify component source unless a test exposes a REAL bug — if so, stop, document it in the result file, and leave the fix to the manager.

## Acceptance criteria
- All new tests pass; total suite count unchanged (extended files only).
- Full `npx jest --ci` green.

## Allowed files
- `__tests__/LoginScreen.test.js`
- `__tests__/SignupScreen.test.js`

## Forbidden actions
- Editing screens/, services/, contexts/, package.json.

## Required tests
- `npx jest --ci __tests__/LoginScreen.test.js __tests__/SignupScreen.test.js`
- Full suite green.

## Completion requirements
- Result file `.agents/results/TASK-005.md` with test names added and final counts.
