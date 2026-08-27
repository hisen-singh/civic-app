TASK-016
Title: E2E + manual smoke + release prep
Priority: HIGH
Status: PENDING
Day: 4

## Objective

Prove the app works end-to-end and prepare the release build.

## Requirements

1. Update `.maestro/` flows if the profile navigation changed any flow
   (FollowList now opens UserProfile stack screen; add assertions accordingly).
2. Manual smoke checklist (run on dev client / emulator, record PASS/FAIL per
   item in the result file):
   - signup → verify email gate shown → login
   - report issue (photo optional) → appears in feed
   - vote + comment on an issue
   - solve join flow → status In Progress → author marks Solved
   - follow a user from leaderboard/profile → follower count updates
   - FollowList → tap user → UserProfile stack → back button → Profile tab
     still shows OWN profile with Settings/Logout
   - achievements screen lists badges for the test user
   - offline: airplane mode → report issue queued → reconnect → synced
3. Fix any small breakage found (bug-fix commits, one per finding, note them).
   If a finding is architectural, STOP and record it as BLOCKED item instead.
4. Run `npm run build:preview` (or note if EAS login is unavailable — then record
   the exact blocker for the human).

## Relevant files

- .maestro/*.yaml, minor fixes anywhere within reason

## Allowed changes

- Maestro flows, small bug fixes, no new features

## Forbidden changes

- Architecture, services interfaces, firestore.rules, dependencies

## Acceptance criteria

1. All smoke checklist items PASS or have recorded blockers.
2. Maestro flows updated to current navigation.
3. build:preview APK artifact produced (or blocker documented).

## Testing

The smoke checklist IS the testing. Full jest suite must stay green afterwards.
