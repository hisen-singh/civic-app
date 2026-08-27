TASK-009
Title: Fix dead-end tap in FollowListScreen by navigating to user profile (Audit #2)
Priority: HIGH
Status: COMPLETED
Objective: Replace the non-functional user tap handler in FollowListScreen with navigation to ProfileScreen for the tapped user.
Context: FollowListScreen.js currently has a TODO in the renderUser onPress handler that does nothing. This causes a dead-end when tapping on a user in the followers/following list.
Detailed requirements:

- Modify ProfileScreen.js to accept an optional `userId` prop (string). If provided, use this userId to fetch user stats and user document; otherwise, fall back to the auth user's uid.
- In FollowListScreen.js, update the renderUser function's onPress handler to navigate to 'ProfileScreen' with params { userId: item.id }.
- Ensure that the navigation works and that ProfileScreen displays the correct stats for the tapped user.
- Do not modify any other screens or services unless necessary.
- Write unit tests for the new behavior if feasible, but not required.
  Allowed files:
- screens/ProfileScreen.js
- screens/FollowListScreen.js
- (optional) **tests**/ProfileScreen.test.js, **tests**/FollowListScreen.test.js
  Forbidden actions:
- Changing the auth context or UserService/IssueService interfaces unless absolutely necessary.
- Removing existing functionality.
- Changing the navigation structure in App.js.
  Completion requirements:
- The dead-end tap is resolved: tapping a user in FollowListScreen navigates to ProfileScreen showing that user's stats.
- The current user's profile still works when accessed via the tab bar (no userId param).
- No regression in existing tests (if any).
