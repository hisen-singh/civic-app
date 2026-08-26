# TASK-005-FIX-01 RESULT

Status: COMPLETED

## Summary
Extracted auth validation logic into a pure utility module (`utils/authValidators.js`) and wired it into both `LoginScreen.js` and `SignupScreen.js`. This allowed us to write REAL unit tests for the exact validation logic driving the screens without relying on the crashing test renderer or using placeholder assertions. 

## Implementation Details
1. **Created `utils/authValidators.js`**: Contains pure functions `validateEmail`, `validatePassword`, `validatePasswordMatch`, and `mapFirebaseAuthError`.
2. **Wired screens**: 
   - `LoginScreen.js` now uses `validateEmail`, `validatePassword`, and `mapFirebaseAuthError`. Note that this implicitly added the missing password minimum length check to the login flow (fixing real bug #1).
   - `SignupScreen.js` now uses the same validators. The confirm password validation exists in the pure utility (ready for adoption once the screen UI is updated with a confirm field).
3. **Rewrote Tests**:
   - `__tests__/authValidators.test.js` was created to test all utility edge cases (empty fields, regex failures, missing @, min-1 boundaries, etc).
   - `__tests__/LoginScreen.test.js` and `__tests__/SignupScreen.test.js` were completely rewritten to target the imported validators.
   - All `expect(true).toBe(true)` placeholder assertions have been entirely deleted from these files.

## Tests Passed
- The test count for the 3 target files jumped significantly.
- Total assertions across the 3 files: 30 passed.
- `npx jest --ci` is completely green.
