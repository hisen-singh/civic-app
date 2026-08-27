TASK-015
Title: Targeted test coverage — SolveScreen, WatchArea, profile params
Priority: MEDIUM
Status: PENDING
Day: 3

## Objective

Close the highest-risk test gaps (Audit #14 subset) with REAL tests, not hollow ones.

## Requirements

1. Create `__tests__/SolveScreen.test.js`:
   - renders and shows issue data (mock IssueService/SolveScreen deps as in
     existing LoginScreen.test.js patterns — follow those, they are the house style)
   - rejects invalid join flow: attempting to solve an already-solved issue is blocked
2. Create `__tests__/WatchAreaScreen.test.js`:
   - radius validation: entering <100 or >5000 shows the validation error and
     does not call the service (client clamps exist — test the visible path)
   - valid radius calls WatchArea save path once
3. Create `__tests__/ProfileParams.test.js` (light):
   - ProfileScreen with route params {userId:'other-uid'} renders other user's
     display name from mocked Firestore and does NOT render Settings/Logout
   - ProfileScreen without params renders Settings + Logout
4. Mock firestore at module level like existing tests do (IssueService.test.js is
   the reference for db mocking).

## Relevant files

- **tests**/* (new files above); read existing tests first

## Allowed changes

- New test files + tiny test-only fixtures if needed

## Forbidden changes

- Production code (if a bug is discovered, STOP, write it in the result as a
  finding, do not fix it in this task)

## Acceptance criteria

1. All 3 new suites pass; suite count 9→12 minimum.
2. Every new test asserts real behavior (no snapshot-only tests).
3. Full suite green.

## Testing

`npx jest` full run; paste summary in result.
