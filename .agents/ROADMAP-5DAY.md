# CIVIC HERO — 5-DAY SHIP WORKFLOW

Created: 2026-08-27 (MANAGER) · Deadline: 2026-09-01 · Branch: phase/02-get-your-eyes-back

## Mission

Ship the app in 5 days. Everything below is executable by the worker WITHOUT the
manager present. The manager reviews in batch daily and only intervenes on FAIL verdicts.

## DEFINITION OF DONE (Day 5)

- All tasks TASK-010..015 COMPLETED + reviewed APPROVED
- Full jest suite green (baseline 9/9 suites, 55/55 — may grow, never shrink)
- `npx eslint .` → 0 errors (warnings allowed until TASK-014 flips them)
- Pre-commit hook passes on every commit (never use --no-verify)
- Release APK built via `npm run build:preview`
- HUMAN checkpoints (below) either done or explicitly flagged to the user

## STANDING RULES FOR THE WORKER (autonomous mode)

1. Take tasks STRICTLY in numeric order. Before starting task N: confirm
   `.agents/locks/` contains NO lock, then create `.agents/locks/TASK-N.lock`
   containing `TASK-N`. Delete the lock when done.
2. Never touch files outside the task's Allowed list. Never modify `.agents/tasks/*`
   or `.agents/results/*` of OTHER tasks.
3. On finish: write `.agents/results/TASK-N.md` (Status / Summary / Files changed /
   Tests executed / Test results / Acceptance criteria / Problems / Notes), delete
   your lock, and update the "Live delegation status" line for task N in
   `.agents/state/PROJECT-STATE.md` (one line: task, status, one-line outcome).
4. Definition of finished code: `npx jest` green AND `npx eslint <changed files>` 0 errors.
5. BLOCKED > 30 minutes → write the result file with Status: BLOCKED + reason,
   delete your lock, move to the next task. Do not wait for the manager.
6. Commit style: conventional commits, one commit per task, mention task id.
7. NEVER: force push, deploy to Firebase, rotate keys, delete directories,
   modify firestore.rules or auth architecture, add dependencies (unless the task
   explicitly lists the exact package).

## TASK QUEUE (execute in this order)

### DAY 1 — 2026-08-27

- [ ] TASK-010 — Callable rate limiting (functions) · security
- [ ] TASK-011 — JOINED_SOLVE author award bug + client trustScore divergence · bugs

### DAY 2 — 2026-08-28

- [ ] TASK-012 — AuthContext reacts to ID-token refresh (admin claims) · auth
- [ ] TASK-013 — SignupScreen confirm-password field · product gap

### DAY 3 — 2026-08-29

- [ ] TASK-014 — Hygiene sweep: lint warnings → 0, flip no-unused-vars to error,
      back button fixed position, README refresh
- [ ] TASK-015 — Targeted test coverage: SolveScreen + WatchArea + profile param flows

### DAY 4 — 2026-08-30

- [ ] TASK-016 — E2E & release prep: update .maestro profile flow, full manual smoke
      (login → report → solve → follow → profile → achievements), fix what it finds

### DAY 5 — 2026-08-31 → 09-01

- [ ] Freeze: full suite + lint + build:preview APK + PROJECT-STATE final audit
- [ ] Handoff report to user (STATUS / WHAT WAS DONE / NEXT / BLOCKERS / RISKS)

## HUMAN CHECKPOINTS (worker: FLAG THESE, never do them)

| When    | Action                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any day | `firebase deploy --only firestore:rules,firestore:indexes,functions` (rules/indexes/functions changed in phase-02, UNDEPLOYED)                                 |
| Day 1   | Rotate + restrict Google Maps API key (committed: AIzaSyBL1UYEczdQMFDXPa3s6Wrsb5y_JUgAFtE) and `git rm --cached` .env.development/.env.staging/.env.production |
| Day 3   | Approve removal of dead code: server/, dist_check/, web-client/ (only dist+node_modules inside)                                                                |
| Day 5   | Decide Play Store submission                                                                                                                                   |

## FIX HISTORY (context — do not redo)

- TASK-009 + FIX-01: other-user profiles via UserProfile stack route — committed 5eaecdb.
  Root cause of hook failure was a missing `}` after `</>` in ProfileScreen (manager fixed).
- eslint/prettier/lint-staged installed as devDependencies (2026-08-27) — hook now works.
- Audit #13 (YouTube URLs): ALREADY DONE in TASK-003 (canonical sanitizer + tests). Ignore stale references.
