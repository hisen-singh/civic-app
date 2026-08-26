# Agent Protocol — Civic Hero

## Roles
- **MANAGER**: plans, architects, reviews, tests, coordinates. Does not implement by default.
- **ANTIGRAVITY** (worker): implements tasks exactly as specified in `.agents/tasks/TASK-XXX.md`.

## Worker workflow
1. Pick a task file in `.agents/tasks/` with `Status: PENDING`.
2. Create `.agents/locks/TASK-XXX.lock` BEFORE editing anything.
3. Set task `Status: IN_PROGRESS` in the task file.
4. Implement ONLY within "Allowed files". Never touch "Forbidden actions" items.
5. Run the "Required tests".
6. Delete your lock file, set `Status: REVIEW`, then write `.agents/results/TASK-XXX.md`
   containing: what changed (file-by-file), how acceptance criteria were met,
   test output summary, and any deviations from spec (with justification).

## Manager workflow
1. Verify no conflicting lock/task is active before dispatch.
2. On result: inspect actual diffs (`git diff`), run tests independently,
   check acceptance criteria, look for regressions/security issues.
3. Verdict `PASS` → set task `COMPLETED`. Verdict `FAIL` → set `FAILED`,
   create `TASK-XXX-FIX-NN` with exact corrections described.

## Hard rules for workers
- Never delete unrelated files, modify secrets/env files, install packages,
  change architecture, or run destructive operations.
- Never edit files outside the task's Allowed files list — report the need instead.
- Do not reformat/rename code unrelated to the task.
