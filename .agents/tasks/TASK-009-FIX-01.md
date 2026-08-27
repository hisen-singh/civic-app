TASK-009-FIX-01
Title: Replace tab-param profile navigation with dedicated UserProfile stack route
Priority: HIGH
Status: COMPLETED
Parent: TASK-009 (manager review verdict: REQUIRES FIX)

## Objective

Stop passing route params to the `Profile` tab. Present another user's profile as a
proper stack screen (`UserProfile`) with a working back button, so the bottom-bar
Profile tab always shows the authenticated user's own profile.

## Context

TASK-009 navigated from FollowListScreen via `navigation.navigate('Profile', { userId })`.
`Profile` is a bottom-tab screen that stays mounted, and React Navigation does not
clear params when the tab is pressed again from the tab bar. Consequence: after a
user visits ANY other user's profile once, every later tap on the Profile tab shows
that other user's profile (with Settings/Logout hidden). This violates TASK-009
acceptance criterion 2 ("current user's profile still works when accessed via the
tab bar").

The original TASK-009 forbade App.js changes, which forced this workaround. The
manager now explicitly authorizes ONE minimal App.js addition (below). Take it —
do not invent alternatives.

## Requirements (exact)

1. `App.js` — in `AppStack`, register exactly one new screen (after the
   `FollowList` screen registration):

   ```jsx
   <Stack.Screen name="UserProfile" component={ProfileScreen} />
   ```

   `ProfileScreen` is already imported in App.js. Change NOTHING else in App.js.

2. `screens/FollowListScreen.js` — in `renderUser` onPress, change the target to:

   ```js
   navigation.navigate("UserProfile", { userId: item.id });
   ```

3. `screens/ProfileScreen.js` — add a back affordance for stack presentation:
   - Add `const isStackProfile = route.name === "UserProfile";`
   - When `isStackProfile` is true, render a top-left back control above the
     header gradient: a circular surface button (consistent with existing icon
     button styles in this screen) with `chevron-left` from
     MaterialCommunityIcons, `onPress={() => navigation.goBack()}`.
   - Pad it by the safe-area top inset (import `useSafeAreaInsets` from
     `react-native-safe-area-context`; this screen currently has no top-inset
     handling).
   - Render it regardless of `isOwnProfile` — tapping your OWN entry in a follow
     list must also be escapable.
   - Do NOT render it when presented as the tab (`route.name === "Profile"`).
   - Keep all existing TASK-009 behavior (profileUserId / isOwnProfile handling,
     hidden owner-only UI) unchanged.

## Allowed changes

- `App.js` (the single line specified above)
- `screens/FollowListScreen.js` (the navigate target only)
- `screens/ProfileScreen.js` (back button + safe-area import)
- Optional: `__tests__/ProfileScreen.test.js`, `__tests__/FollowListScreen.test.js`

## Forbidden changes

- Any other modification to App.js (no route renames, no MainTabs changes, no import changes)
- Services, contexts, firestore rules, navigation structure beyond the one registration
- Refactors or formatting sweeps beyond the files/lines above

## Acceptance criteria

1. Tapping a user in FollowList opens a `UserProfile` stack screen showing that
   user's stats; the back button returns to the follow list.
2. Tapping your OWN entry in a follow list opens your profile on the stack, with
   the back button visible and functional.
3. The bottom-bar Profile tab NEVER shows another user's profile — including
   immediately after visiting one via FollowList — and always shows Settings and
   Logout for the authenticated user.
4. Full jest suite passes with zero regressions (baseline: 9 suites / 55 tests).

## Testing

1. `npx jest` — must remain 9/9 suites, 55/55 tests.
2. Manual (emulator / dev client):
   - Profile tab → follower count → tap a follower → verify their stats + back works.
   - After the above: Home tab → Profile tab → verify OWN profile (Settings + Logout visible).
   - Tap your own row in the follower list → own profile on stack + back works.
3. Commit via the normal pre-commit hook (lint-staged must pass).
