# TASK-002
- **Task ID:** TASK-002
- **Title:** Remove dead-end 'UserProfile' navigation from FollowListScreen
- **Priority:** HIGH
- **Status:** COMPLETED

## Objective
Prevent a runtime "action not handled" error when tapping a user row in FollowListScreen, because no `UserProfile` route exists.

## Context
- `screens/FollowListScreen.js` line ~60: `onPress={() => navigation.navigate('UserProfile', { userId: item.id })}`.
- There is NO `UserProfileScreen` and no such route anywhere in App.js.
- A `UserProfileScreen` is planned for a future phase — this task only makes current behavior safe.

## Detailed requirements
1. Replace the onPress handler so it does nothing harmful today but keeps intent visible:
   - Keep the TouchableOpacity.
   - Replace the navigate call with a guarded call: only navigate if the route can be handled, otherwise log once via `console.warn('[FollowListScreen] UserProfile route not available yet')`. Simplest acceptable implementation: comment out the navigate with a `// TODO(phase-03): implement UserProfileScreen` note and set `disabled` behavior via `activeOpacity={1}` — OR keep navigation wrapped in try/catch. Choose the cleanest minimal option.
2. Row visual state must not change otherwise.

## Acceptance criteria
- Tapping a user row produces no red-screen/crash and no unhandled navigation action error.
- A TODO comment referencing the future UserProfileScreen remains.
- No changes outside `screens/FollowListScreen.js`.

## Allowed files
- `screens/FollowListScreen.js`

## Forbidden actions
- Creating a new UserProfileScreen.
- Editing App.js or services.

## Required tests
- `npx jest --ci` full run stays green.

## Completion requirements
- Result file `.agents/results/TASK-002.md` per protocol README.
