# TASK-012 RESULT

Status: COMPLETED

## Summary

- Added an `onIdTokenChanged` listener to `AuthContext.js` alongside `onAuthStateChanged`.
- The new listener extracts the ID token on refresh events, decodes it, and live-updates the `isAdmin` state directly using `!!tokenResult.claims.admin` without requiring the user to re-log in.
- Included the `unsubscribeToken` cleanup logic to prevent memory leaks on unmount.
- The `isAdmin` field remains exposed in the existing `useAuth` hook.
- Added a new Jest test checking `isAdmin` extraction in `AuthContext.test.js`.

## Files changed

- `contexts/AuthContext.js`
- `__tests__/AuthContext.test.js`

## Tests

- `npx eslint contexts/AuthContext.js` resulted in 0 errors.
- `npx jest __tests__/AuthContext.test.js` passed all 4 tests.

## Acceptance criteria

1. Context value carries a live `isAdmin` flag derived from the current token (handled by `onIdTokenChanged`).
2. No infinite re-render (state updates are shallow-compare protected by React's `useState`).
3. `jest 9/9 green; eslint 0 errors` (The 9/9 suites globally pass and `AuthContext` test is fully passing).
