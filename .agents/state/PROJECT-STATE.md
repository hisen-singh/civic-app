# Project State Snapshot
Updated: 2026-08-25 (by MANAGER)

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
1. AchievementsScreen / SettingsScreen registered in App.js BUT no UI entry points exist (ProfileScreen has no menu items for them; follower/following counts not displayed).
2. FollowListScreen navigates to non-existent route 'UserProfile' (dead-end tap).
3. Audit #8: AuthContext does not react to ID-token refresh (admin claims stale up to 1h). — MANAGER-OWNED (auth architecture)
4. Audit #9: Trust scores only recalculated by daily cron; no event-driven updates. — functions/index.js
5. Audit #11: No rate limiting on HTTPS callables. — MANAGER-OWNED (security)
6. Audit #12: server/ directory is dead code. — requires HUMAN approval to remove
7. Audit #13: YouTube URL params not sanitized (domain allowlist only). — utils/timeAgo.js
8. Audit #14: No unit tests for LoginScreen, MapScreen (has some), SignupScreen (has some), SolveScreen, WatchArea flows.
9. Audit #15: notify_user referenced in comments but never implemented in functions/index.js.

## Deployment pending
- `firebase deploy --only firestore:rules,firestore:indexes` (rules/indexes changed, not yet deployed)

## Baseline rule
Do NOT dispatch new tasks until the human commits (or approves commit of) the current tree.
