# TASK-004
- **Task ID:** TASK-004
- **Title:** Implement notify_user helper in Cloud Functions
- **Priority:** MEDIUM
- **Status:** PENDING

## Objective
Implement the `notify_user` helper referenced in comments throughout `functions/index.js` and use it at existing notification creation sites.

## Context
- Audit #15: multiple comments reference `notify_user` but it does not exist.
- `functions/index.js` already contains a `createNotification(...)` helper (search for it first) used by e.g. the watch-area notification job (~line 204).
- Runtime: Firebase Functions v1 (`functions.https.onCall` style), Node 18. Firestore is the DB.
- Notifications collection docs shape (see firestore.rules): fields include `userId`, `read`, `createdAt`, plus issue-related fields used by `screens/NotificationsScreen.js` (inspect that file to match field names EXACTLY).

## Detailed requirements
1. Read `functions/index.js` fully and `screens/NotificationsScreen.js` before writing code.
2. Implement `async function notifyUser(db, admin, { userId, type, title, body, issueId })` (adapt signature to what call sites need):
   - Validates userId non-empty.
   - Writes one doc to `notifications` with `read: false`, server timestamp, and the fields NotificationsScreen expects.
   - Failures MUST be caught and logged (console.error), never throw into caller paths that would break the triggering operation.
3. Refactor EXISTING inline notification writes to use it where trivially equivalent — do NOT change notification semantics, doc shapes, or trigger timing.
4. If Expo push sending already exists elsewhere, leave it untouched.

## Acceptance criteria
- `cd functions && node --check index.js` passes.
- Grep shows no remaining dangling references to an undefined `notify_user` symbol (comments updated or helper implemented).
- Notification doc shape unchanged vs. current `createNotification` output (diff-verified by manager).

## Allowed files
- `functions/index.js`

## Forbidden actions
- Editing firestore.rules, package.json, deploying anything, adding npm deps.

## Required tests
- `cd functions && node --check index.js`
- Manager will additionally review every refactored call site against original behavior.

## Completion requirements
- Result file `.agents/results/TASK-004.md` listing each call site changed and why behavior is identical.
