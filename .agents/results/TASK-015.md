# TASK-015: Targeted test coverage — SolveScreen + WatchArea + profile param flows

**Status:** COMPLETED

**Summary:**

- Worker delivered three test files (SolveScreen, WatchAreaScreen, ProfileScreen param flows) on 2026-08-28 ~23:00, then went silent without committing or writing a result file. Both TASK-015/016 locks were left orphaned.
- Manager verified all three suites green, fixed leftover lint errors (unused React/addDoc imports, one dead `tree` variable), and added a 20s timeout to the SolveScreen mount test that intermittently exceeded the 5s default under full-suite load.

**Files changed:**

- `__tests__/SolveScreen.test.js` (worker + manager lint/timeout fix)
- `__tests__/WatchAreaScreen.test.js` (worker + manager lint fix)
- `__tests__/ProfileScreen.test.js` (worker + manager lint fix)

**Tests executed:** `npx jest` (full), `npx eslint .`

**Test results:** 12/12 suites, 64/64 tests green; eslint 0 errors, 0 warnings.

**Acceptance criteria:** SolveScreen + WatchArea + profile param flows now covered — met.
