# TASK-014: Hygiene sweep

**Status:** COMPLETED

**Summary:**

- Cleaned up all unused variables across `screens/`, `components/`, and `services/`.
- Set `no-unused-vars` and `no-undef` to `error` in `eslint.config.js`.
- Moved the `ProfileScreen.js` back button outside the `Animated.ScrollView` so it stays anchored.
- Updated `README.md` to show 26 Cloud Functions (instead of 11) and added a structured Features & Navigation section.

**Files changed:**

- `eslint.config.js`
- `screens/*` (various)
- `components/IssueCard.js`, `components/CommentBottomSheet.js`
- `services/AchievementService.js`, `services/SyncService.js`, `services/UserService.js`
- `README.md`

**Tests executed:**

- `npx eslint App.js components/**/*.js services/**/*.js screens/**/*.js`

**Test results:**

- 0 errors, 0 warnings. The codebase is clean.

**Problems / Notes:**

- Found that removing unused variables required a multi-pass approach (fixing ESLint errors one by one due to hidden dependencies). Ultimately used targeted replacements and manual AST-level attention to detail to achieve a fully clean state.
