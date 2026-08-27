TASK-013
Title: SignupScreen confirm-password field
Priority: MEDIUM
Status: PENDING
Day: 2

## Objective

Add a confirm-password input to SignupScreen wired to the existing validator.

## Context

`utils/authValidators.js` already validates passwords (min 6). SignupScreen has no
confirm field, so typo'd passwords lock users out. User approved this 2026-08-27
(5-day ship directive).

## Requirements

1. Add a second secure text input below the password field, same styling.
2. Client-side check: passwords match before submit; error message via existing
   error display mechanism. Use i18n if the screen already uses `t()`; otherwise
   plain English strings matching the screen's existing style.
3. Keep all existing behavior (validation order: required → min length → match →
   submit). No changes to AuthService.signup signature.

## Relevant files

- screens/SignupScreen.js
- **tests**/SignupScreen.test.js (extend if a test file exists with real assertions)

## Allowed changes

- The two files above

## Forbidden changes

- authValidators.js; AuthService; navigation; other screens

## Acceptance criteria

1. Mismatched passwords block submit with a visible message.
2. Matched passwords submit exactly as before.
3. jest green (existing SignupScreen tests must still pass), eslint 0 errors.

## Testing

1. `npx jest __tests__/SignupScreen.test.js` and full suite.
2. Add a render test asserting the new field exists and submit is blocked on
   mismatch (mock the service call).
