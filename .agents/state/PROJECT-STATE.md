# Project State Snapshot

Updated: 2026-08-27 (by MANAGER)

## Branch

`phase/02-get-your-eyes-back`

## Uncommitted work (verified, tests green 7/7 suites / 22 tests)

Gamification/social phase backend + screens:

- NEW: data/badges.js, services/{AchievementService,FeedService,LeaderboardService,UserService}.js
- NEW: screens/{AchievementsScreen,SettingsScreen,FollowListScreen}.js
- MODIFIED: firestore.rules, firestore.indexes.json, functions/index.js (Cloud Functions: followUser, unfollowUser, getHomeFeed, getTrendingIssues, getLeaderboard, getUserRank, getAchievements, saveFcmToken, admin/report/crash callables)
- Audit fixes #2–#7 applied: getAllIssues limit(50), composite index solvers+status, SyncService.initNetworkSync (wired in App.js), in-place cache patching for mutations, anonymous-issue rules hardening, watchArea radius validation (100m–5km) + client clamps.
- Jest config fixed (@sentry/react-native transformIgnorePatterns); IssueService.test.js updated for new cache behavior.

## Known gaps / open audit items

1. ~~AchievementsScreen / SettingsScreen registered but no UI entry points~~ RESOLVED by TASK-001 (settings menu items) — follower/following counts ARE displayed via FollowList row (landed with phase-02 baseline).
2. ~~FollowListScreen navigates to non-existent route 'UserProfile'~~ RESOLVED by TASK-009 + FIX-01 (dedicated UserProfile stack route; committed 5eaecdb).
3. Audit #8: AuthContext does not react to ID-token refresh (admin claims stale up to 1h) → TASK-012 (Day 2).
4. Audit #9: Trust scores only recalculated by daily cron; partially mitigated by TASK-007 incremental counters. Backlog.
5. Audit #11: No rate limiting on HTTPS callables → TASK-010 (Day 1).
6. Audit #12: server/ directory is dead code — requires HUMAN approval to remove.
7. Audit #14: No unit tests for SolveScreen, WatchArea, profile param flows → TASK-015 (Day 3).
8. ~~Audit #13: YouTube URL params not sanitized~~ RESOLVED by TASK-003 (canonical sanitizer + tests). Stale reference removed.
9. ~~Audit #15: notify_user never implemented~~ RESOLVED by TASK-004 (notifyUser helper, commit df099a7). Stale reference removed.
10. SignupScreen confirm-password field → TASK-013 (Day 2, user-approved 2026-08-27).

## Tooling note (2026-08-27)

- eslint + prettier + lint-staged installed as devDependencies; husky pre-commit hook verified working (commit 5eaecdb).
- Worker note: JSX conditional blocks must be properly brace-closed — TASK-009's `</>` was missing its closing `}` and jest/babel masked it; eslint catches it. Always run eslint before marking COMPLETED.

## Deployment pending

- `firebase deploy --only firestore:rules,firestore:indexes` (rules/indexes changed, not yet deployed)

## Baseline rule

Baseline committed at `6348437` (+ style commit `d1794ac`, TASK-001 commit `4bb0155`).

## Live delegation status

- TASK-001..004: COMPLETED (PASS) — commits 4bb0155 / 2c6f698 / e3dffc2 / df099a7
- TASK-005: FAILED → regenerated as TASK-005-FIX-01 (see below)
- TASK-005-FIX-01: COMPLETED (PASS) — extracted pure validators, real tests; suite 9/55 green (a3c0d98)
- TASK-006: COMPLETED (PASS, verified 7042061)
- TASK-007: COMPLETED (PASS) — incremental trust counters + solver-side JOINED_SOLVE (a3c0d98)
- TASK-008: COMPLETED (PASS) — eslint.config.js created and lint config working
- TASK-009: COMPLETED → REQUIRES FIX (stale tab params) → FIX-01 delivered 15:23, MANAGER REVIEW: **APPROVED** (tests 9/9, 55/55 verified) — UserProfile stack route + back button; **COMMITTED 5eaecdb**
- TASK-010 (callable rate limiting): COMPLETED, MANAGER REVIEW: **APPROVED** — **COMMITTED c04def2** (+scoped functions/** CommonJS lint block)
- TASK-011 (JOINED_SOLVE author guard + server trustScore): COMPLETED, MANAGER REVIEW: **APPROVED** — worker stalled 21:16→16:30 (lock orphaned), manager completed ProfileScreen half, worker returned and verified; joint implementation APPROVED
- NEXT (MANDATORY ORDER): TASK-013 (confirm-password — worker skipped it, do it FIRST) → TASK-012 → TASK-014 → TASK-015 → TASK-016
- 5-DAY SHIP MODE active (user directive 2026-08-27): see `.agents/ROADMAP-5DAY.md` — Deadline 2026-09-01.
- Optional follow-up nit: ProfileScreen back button scrolls with content (inside ScrollView) — move outside ScrollView if desired → folded into TASK-014
- ~~Reviewer note (TASK-007): trigger still awards JOINED_SOLVE to author~~ RESOLVED by TASK-011.

## Product bugs found (awaiting human/product decision)

1. LoginScreen has NO minimum password length validation — FIXED implicitly by TASK-005-FIX-01 (validatePassword min-6 wired in)
2. SignupScreen has NO confirm-password field — validator exists; UI field pending product decision
3. Pre-existing hollow test files exist beyond LoginScreen/SignupScreen (e.g., MapScreen.test.js) — systemic, low priority

## Deploy pending (human)

- firebase deploy --only firestore:rules,firestore:indexes,functions

## Hygiene backlog (pre-existing, low priority)

- screens/FollowListScreen.js: unused `isOwnProfile`, unused `t`, mid-file `import { Animated }`
