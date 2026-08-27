TASK-012
Title: AuthContext reacts to ID-token refresh (Audit #8)
Priority: HIGH
Status: PENDING
Day: 2

## Objective

Admin claims (custom claims) become stale for up to 1h because AuthContext never
re-reads the ID token after refresh. Make auth state react to token changes.

## Context

`contexts/AuthContext.js` subscribes with onAuthStateChanged only. Admin-only UI
(Analytics etc.) can show wrong access state after setAdminRole / claim changes
until the user re-logs in.

## Requirements

1. In AuthContext's subscription setup, ALSO register
   `auth.onIdTokenChanged(async (fbUser) => {...})`:
   - decode `fbUser` claims via `await fbUser.getIdTokenResult()` when user exists
   - update the context value with `isAdmin: !!idTokenResult.claims.admin`
   - expose `isAdmin` in the context value (check the existing shape first; if a
     similar field exists, reuse its name)
2. Do not introduce re-render loops: keep state updates shallow-compare or
   setState only when the admin flag actually changed.
3. No changes to AuthService public API.

## Relevant files

- contexts/AuthContext.js
- hooks/useAuth.js (only if the hook needs to expose the new field)

## Allowed changes

- contexts/AuthContext.js, hooks/useAuth.js

## Forbidden changes

- Login/logout flows; AuthService; persistence logic; App.js

## Acceptance criteria

1. Context value carries a live `isAdmin` flag derived from the current token.
2. No infinite re-render (setState only on value change).
3. jest 9/9 green; eslint 0 errors.

## Testing

1. `npx jest __tests__/AuthContext.test.js` — must pass; add ONE test mocking
   getIdTokenResult to return claims.admin=true and assert context exposes it,
   if the test harness allows in < 30 min effort; otherwise note skipped in result.
