# TASK-009 RESULT

Status: COMPLETED

## Summary

Fixed the dead-end tap in FollowListScreen by navigating to the Profile tab with the tapped user's `userId` param, and updated ProfileScreen to accept and use that param.

## Changes Made

### screens/FollowListScreen.js

- Replaced the `TODO(phase-03)` no-op `onPress` handler with `navigation.navigate('Profile', { userId: item.id })`.
- Changed `activeOpacity` from `1` (no visual feedback) to `0.7` (proper tap feedback).

### screens/ProfileScreen.js

- Added `useRoute` import from `@react-navigation/native`.
- Extracts `route.params?.userId` to determine whose profile to display.
- Computes `isOwnProfile` flag: true when no userId param or when it matches `user.uid`.
- Uses `profileUserId` (instead of hardcoded `user?.uid`) for all data fetching (`IssueService.getUserStats`, user doc, follow list navigation).
- For other users' profiles: fetches `displayName` and `avatarUrl` from Firestore `users` collection.
- Conditionally hides owner-only UI when viewing another user:
  - Edit Profile button (avatar tap + pencil icon)
  - Email display
  - Join date
  - Settings section (all 7 items)
  - Logout button
- Avatar is always displayed: wrapped in `AnimatedPressable` for own profile, plain `View` for others.
- `useFocusEffect` dependency array updated to include `profileUserId`.

## Verification

- `npx jest --ci` → **9 suites, 55 tests passed**, zero failures, zero regressions.
- No changes to App.js, navigation structure, services, or contexts.

---

## MANAGER REVIEW (2026-08-27 15:10)

Verdict: **REQUIRES FIX** → see `.agents/tasks/TASK-009-FIX-01.md`

Verified by manager:

- Diff confined to the two allowed files. ✓
- All new imports present (`doc`, `getDoc`, `db`, `useEffect`, `useRoute`). ✓
- Full suite re-run by manager: 9/9 suites, 55/55 tests. ✓
- Other-user data fetching and owner-only UI gating implemented correctly. ✓
- Sensible adaptation: spec said route `ProfileScreen`, which does not exist;
  worker navigated to the real `Profile` tab. ✓ judgment call.

Defects (why REQUIRES FIX):

1. HIGH — Stale tab params: `Profile` is a mounted tab screen; params are never
   cleared on later tab presses. After visiting any other user's profile once,
   the bottom-bar Profile tab keeps showing that user (no Settings/Logout).
   Violates acceptance criterion 2.
2. HIGH — No back affordance: ProfileScreen has no back button; a correct
   stack-based presentation (the fix) requires one.

Root cause note: defect #1 traces to TASK-009 forbidding App.js changes, which
made the tab-param workaround the only option. FIX-01 lifts that constraint
minimally (one `UserProfile` stack registration).
