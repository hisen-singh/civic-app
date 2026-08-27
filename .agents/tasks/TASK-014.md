TASK-014
Title: Hygiene sweep — lint warnings to 0, fixed back button, README refresh
Priority: MEDIUM
Status: PENDING
Day: 3

## Objective

Three small cleanups so the codebase ships clean.

## Requirements

1. Lint: remove all current `no-unused-vars` warnings (8 across App.js,
   ProfileScreen.js, FollowListScreen.js as of 2026-08-27 — recheck with
   `npx eslint . --ext .js` for the full list). Delete unused imports/vars; for
   genuinely-needed-later cases remove anyway (git history keeps them).
   Then in eslint.config.js flip "no-unused-vars" from "warn" to "error" and
   REMOVE the rollout-mode comment (it referenced this task as TASK-010; the id
   changed — ignore that mismatch).
2. ProfileScreen.js back button: move it OUTSIDE the Animated.ScrollView so it
   stays fixed during scroll. Wrap the ScrollView in a <View style={{flex:1}}>
   and render the back button as an absolute sibling (keep identical styling and
   `insets.top + 8` positioning). Behavior must be unchanged otherwise.
3. README.md refresh: correct "11 functions" → actual count of exports in
   functions/index.js (count them, do not guess); test suite line → current
   suites/tests; add Achievements/Settings/FollowList/UserProfile to the
   feature/nav mentions where the structure section lists screens.

## Relevant files

- eslint.config.js, App.js, screens/ProfileScreen.js, screens/FollowListScreen.js,
  any other file with warnings, README.md

## Allowed changes

- The files above (minimal diffs)

## Forbidden changes

- Any runtime behavior change beyond the back-button position; theme.js; services

## Acceptance criteria

1. `npx eslint .` → 0 errors, 0 warnings (or only warnings provably from files
   outside screens/+App.js — list any in the result).
2. Back button visible on UserProfile immediately AND after scrolling to bottom.
3. README numbers verified against the code.

## Testing

1. Full jest suite green.
2. `npm run lint` equivalent (npx eslint .) clean.
