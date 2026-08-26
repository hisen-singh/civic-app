# TASK-007
- **Task ID:** TASK-007
- **Title:** Event-driven trust score updates (audit #9)
- **Priority:** MEDIUM
- **Status:** COMPLETED

## Objective
Reduce up-to-24h leaderboard staleness by updating trust/impact-relevant counters incrementally when events happen, instead of relying solely on the daily `recalculateTrustScores` cron.

## Context
- `functions/index.js` already has Firestore v1 triggers: `onIssueCreated`, `onIssueUpdated`, `onCommentAdded`, `onReactionAdded`, `onFollowCreated`, plus a daily `recalculateTrustScores` pubsub job.
- There is a `TRUST_SCORE` constant map (seen near line ~340: `TRUST_SCORE.JOINED_SOLVE`) used by an existing helper (search for its usage — likely `updateTrustScore(userId, delta)` or similar). READ THE FILE FIRST and reuse existing helpers/constants; do not invent a parallel system.
- The daily cron must REMAIN as the reconciliation/recalibration source of truth.

## Detailed requirements
1. Read `functions/index.js` end-to-end before editing.
2. Ensure every trust-affecting event increments/decrements the user's stored trust inputs incrementally at event time using existing patterns (`admin.firestore.FieldValue.increment`) inside the ALREADY-EXISING triggers:
   - issue reported (+author report counter)
   - issue solved (author + solver counters) — verify this already exists; only fill gaps
   - join/solve help (solver + author notification already exists)
   - follower gained (+target counter)
3. Do NOT restructure triggers, change notification behavior (TASK-004 just landed), or modify the cron's logic beyond ensuring it can reconcile from the incremented fields.
4. If a counter update already exists for an event, leave it — this task should end up small.

## Acceptance criteria
- `cd functions && node --check index.js` passes.
- Each listed event either already had incremental updates (documented in result) or gained them via minimal diff.
- No changes to client code, rules, or indexes.

## Allowed files
- `functions/index.js`

## Forbidden actions
- Editing notifications logic, cron schedule, firestore.rules, package.json.
- Adding npm dependencies.

## Required tests
- `cd functions && node --check index.js`
- Manager will diff-review each touched trigger against pre-change semantics.

## Completion requirements
- Result file `.agents/results/TASK-007.md` with a per-event table: event → counter updated → already-existed? (yes/no).
