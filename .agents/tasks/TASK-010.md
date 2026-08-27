TASK-010
Title: Rate-limit HTTPS callables (Audit #11)
Priority: HIGH
Status: PENDING
Day: 1 (see .agents/ROADMAP-5DAY.md for queue + standing rules)

## Objective

Prevent callable abuse by adding a lightweight in-memory rate limiter to all
`functions.https.onCall` handlers in `functions/index.js`.

## Context

Every callable (getHomeFeed, getLeaderboard, followUser, reportContent, etc.) is
currently unthrottled. With no App Check, a script can hammer them freely.

## Requirements

1. Add ONE helper near the top of functions/index.js:

   ```js
   const RATE_BUCKET = new Map(); // uid -> { count, resetAt }
   function enforceRateLimit(context, name, limit, windowMs) {
     if (!context?.auth?.uid) return; // unauthenticated throws elsewhere
     const now = Date.now();
     const key = `${name}:${context.auth.uid}`;
     const b = RATE_BUCKET.get(key);
     if (!b || now > b.resetAt) {
       RATE_BUCKET.set(key, { count: 1, resetAt: now + windowMs });
       return;
     }
     b.count += 1;
     if (b.count > limit) {
       throw new functions.https.HttpsError(
         "resource-exhausted",
         `Rate limit exceeded for ${name}`,
       );
     }
   }
   ```

2. Call it as the FIRST line of every onCall handler with sensible defaults:
   - reads (getHomeFeed, getTrendingIssues, getLeaderboard, getUserRank,
     getAchievements, checkAdminStatus, getClientCrashes): 30 req / 60s
   - writes (followUser, unfollowUser, saveFcmToken, reportContent, logAppCrash):
     10 req / 60s
   - admin ops (setAdminRole, adminUpdateIssueStatus): 10 req / 60s
3. Add a periodic cleanup so the Map does not grow unboundedly: inside
   `enforceRateLimit`, when a new bucket is created, if `RATE_BUCKET.size > 10000`,
   delete expired entries in a simple loop before inserting.
4. No new dependencies. No changes to handler business logic.

## Relevant files

- functions/index.js (only)

## Allowed changes

- functions/index.js — helper + one call per handler

## Forbidden changes

- Any other file; new dependencies; changing response payloads; Firestore triggers/schedules

## Acceptance criteria

- Every `exports.* = functions.https.onCall` handler calls enforceRateLimit first.
- `node -e "require('./functions/index.js')"` does not throw on load (syntax check only).
- ESLint on the file: 0 errors.

## Testing

1. `npx eslint functions/index.js`
2. `node --check functions/index.js`
3. Full jest suite still 9/9 (functions are not unit-tested yet; ensure no import chain breaks)
