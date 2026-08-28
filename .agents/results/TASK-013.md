# TASK-013: SignupScreen confirm-password

**Status:** COMPLETED

**Summary:**

- Added a confirm-password field to `SignupScreen.js`.
- Implemented client-side validation to ensure both password fields match before attempting to create an account.
- Updated `__tests__/SignupScreen.test.js` to ensure the confirm-password functionality works correctly in unit tests.

**Files changed:**

- `screens/SignupScreen.js`
- `__tests__/SignupScreen.test.js`

**Tests executed:**

- `npm run test __tests__/SignupScreen.test.js`

**Test results:**

- All tests pass (green).

**Problems / Notes:**

- The user-approved requirement was fully met. Registration flows are now much safer for users by preventing accidental password typos.
