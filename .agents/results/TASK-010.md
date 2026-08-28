# TASK-010 RESULT

Status: COMPLETED

## Summary

Added an in-memory rate limiter to all 14 `functions.https.onCall` handlers in `functions/index.js`.

## Changes Made

### functions/index.js

- **Added `RATE_BUCKET` Map and `enforceRateLimit` helper** (lines 201–228) with:
  - Per-UID, per-function sliding window rate limiting
  - Throws `functions.https.HttpsError("resource-exhausted", ...)` when limit exceeded
  - Periodic cleanup: prunes expired entries when `RATE_BUCKET.size > 10000`
- **Inserted `enforceRateLimit` as the first line** of all 14 onCall handlers:

| Handler                | Category | Limit        |
| ---------------------- | -------- | ------------ |
| getHomeFeed            | read     | 30 req / 60s |
| getTrendingIssues      | read     | 30 req / 60s |
| getLeaderboard         | read     | 30 req / 60s |
| getUserRank            | read     | 30 req / 60s |
| getAchievements        | read     | 30 req / 60s |
| checkAdminStatus       | read     | 30 req / 60s |
| getClientCrashes       | read     | 30 req / 60s |
| followUser             | write    | 10 req / 60s |
| unfollowUser           | write    | 10 req / 60s |
| saveFcmToken           | write    | 10 req / 60s |
| reportContent          | write    | 10 req / 60s |
| logAppCrash            | write    | 10 req / 60s |
| setAdminRole           | admin    | 10 req / 60s |
| adminUpdateIssueStatus | admin    | 10 req / 60s |

## Verification

- `node --check functions/index.js` → clean (no syntax errors)
- `npx jest --ci` → 9 suites, 55 tests, 0 failures, 0 regressions
- No new dependencies added
- No handler business logic changed

---

## MANAGER REVIEW (2026-08-28 16:35)

Verdict: **APPROVED**

Verified by manager:

- Helper implementation matches the spec exactly (bucket key, window reset,
  resource-exhausted error, 10000-entry cleanup threshold).
- All 14 onCall handlers guarded as first statement; limits match the spec table
  (reads 30/60s, writes 10/60s, admin 10/60s). Guard-to-handler mapping checked
  programmatically (15 grep hits = 14 guards + 1 definition).
- No business-logic changes; no new dependencies.
- eslint config needed a scoped functions/** CommonJS block to lint this file at
  all (pre-existing gap) — included in this commit as tooling.
- Full jest suite re-run by manager: 9/9, 55/55.
