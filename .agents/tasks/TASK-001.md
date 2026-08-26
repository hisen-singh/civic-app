# TASK-001
- **Task ID:** TASK-001
- **Title:** Add Achievements & Settings entry points + Followers/Following row to ProfileScreen
- **Priority:** HIGH
- **Status:** COMPLETED

## Manager Review
- Verdict: PASS
- Diff inspected: menu entries + social row match spec; navigation params correct (`userId: user?.uid`, `listType: "followers"`).
- Manager cleanup: removed unused `UserService` import inherited from prior partial edits.
- Independent verification: full Jest run 7/7 suites, 22/22 tests green.
- Committed as `4bb0155 feat(profile): entry points for Achievements/Settings/FollowList (TASK-001)`.


## Objective
Make the already-registered routes (`Achievements`, `Settings`, `FollowList` in App.js) reachable from ProfileScreen.

## Context
- Screens exist: `screens/AchievementsScreen.js`, `screens/SettingsScreen.js`, `screens/FollowListScreen.js`.
- Routes registered in `App.js` AppStack: `Achievements`, `Settings`, `FollowList`.
- `ProfileScreen.js` has a `settingsItems` array (~line 177) rendered as tappable rows, and a stats header (`statsRow`, ~line 290) inside a LinearGradient.
- `ProfileScreen.loadStats()` already reads `followerCount` / `followingCount` into `stats` from `users/{uid}`.
- Theme tokens come from `../theme` (Colors, Spacing, Radius). Icons: MaterialCommunityIcons. Rows use `AnimatedPressable`.

## Detailed requirements
1. Append two items to `settingsItems`:
   - "My Achievements" — desc "Badges, tiers & progress", icon `medal-outline`, iconBg `Colors.accentSurface`, iconColor `Colors.accent`, onPress → `navigation.navigate("Achievements")`.
   - "Settings" — desc "Account, notifications & support", icon `cog-outline`, iconBg `Colors.surfaceElevated`, iconColor `Colors.textSecondary`, onPress → `navigation.navigate("Settings")`.
2. Add a tappable social row directly BELOW the existing `statsRow` View (still inside the LinearGradient): text `{stats.followerCount} Followers · {stats.followingCount} Following`, styled with `Typography.caption`-like sizing and `Colors.accentLight`; onPress → `navigation.navigate("FollowList", { userId: user.uid, listType: "followers" })`.
3. Do not change any other screen or logic.

## Acceptance criteria
- Both new menu rows render in Settings section and navigate correctly.
- Social row renders under stats; tap opens FollowList with correct params.
- No changes outside `screens/ProfileScreen.js`.
- `npx jest --ci __tests__` passes (no new failures).

## Allowed files
- `screens/ProfileScreen.js`

## Forbidden actions
- Editing App.js, theme.js, any service, any other screen.
- Adding npm packages.

## Required tests
- `npx jest --ci` full run must remain green (22+ tests).

## Completion requirements
- Result file `.agents/results/TASK-001.md` per protocol README.
