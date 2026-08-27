TASK-011
Title: Fix JOINED_SOLVE author award + client/server trustScore divergence
Priority: HIGH
Status: PENDING
Day: 1

## Objective

Two small correctness bugs: (a) the onIssueUpdated trigger awards the JOINED_SOLVE
badge to the issue AUTHOR when they should never get it for their own issue;
(b) ProfileScreen computes trustScore locally with a formula that diverges from
the server-side trust score shown on the leaderboard.

## Context

Manager review note from TASK-007: functions/index.js trigger (around line 346)
still awards JOINED_SOLVE to the author — pre-existing, "self-corrects at daily
cron", but wrong data is visible for up to a day. Separately, ProfileScreen.js
line ~187: `stats.reported * 50 + stats.supported * 30 + stats.solved * 100` is
a client-side guess; the leaderboard uses the server-computed trustScore stored
on the user document.

## Requirements

1. functions/index.js — in onIssueUpdated, where solver badge logic runs, skip
   awarding JOINED_SOLVE when the new solver uid === issue authorId. Keep awarding
   for non-author solvers. One-line guard + comment.
2. screens/ProfileScreen.js — stop computing trustScore locally. In loadStats you
   already fetch the user doc: read `userData.trustScore` (fallback: keep existing
   formula ONLY if trustScore is undefined, so legacy profiles without the field
   don't show 0).
3. Display the fetched trustScore in the existing trust score UI (find where the
   local `trustScore` const is used).

## Relevant files

- functions/index.js (onIssueUpdated region only)
- screens/ProfileScreen.js (loadStats + trustScore display)

## Allowed changes

- Only the two files above, only the regions described

## Forbidden changes

- recalculateImpactScores / leaderboard logic; UserService; any badge definitions

## Acceptance criteria

1. Author joining own issue does NOT create a JOINED_SOLVE userBadge write.
2. ProfileScreen shows server trustScore when present.
3. `npx jest` 9/9; `npx eslint` 0 errors on changed files.

## Testing

1. Full jest suite.
2. Static review of the guard: simulate mentally solver==author case.
