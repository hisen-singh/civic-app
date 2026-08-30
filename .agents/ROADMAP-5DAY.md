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

1. Take tasks in the DAY-QUEUE order below (NOT numeric order — Day 1 starts with
   TASK-013, the easiest). Before starting task N: confirm `.agents/locks/`
   contains NO lock for it, then create `.agents/locks/TASK-N.lock`
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

### DAY 1 — 2026-08-27 ✅ DONE

- [x] TASK-010 — rate limiting — APPROVED, c04def2
- [x] TASK-011 — JOINED_SOLVE + trustScore — APPROVED, ac4881c
- (TASK-013 was skipped by worker — moved to Day 2, MANDATORY)

### DAY 2 — 2026-08-28

- [x] TASK-012 — live isAdmin via onIdTokenChanged — APPROVED
- [x] TASK-013 — SignupScreen confirm-password — APPROVED, 95b26fe (worker's render test was broken; manager rewrote with react-test-renderer)

### DAY 3 — 2026-08-29

- [x] TASK-014 — Hygiene sweep — APPROVED (worker: bulk unused-var sweep + README 26 functions verified; manager: remaining warnings, back button actually moved outside ScrollView, config flip made real, scratch/ ignored)
- [x] TASK-015 — Targeted test coverage: SolveScreen + WatchArea + profile param flows (COMPLETED)

### DAY 4 — 2026-08-30

- [~] TASK-016 — E2E & release prep — PARTIAL (worker overclaimed COMPLETED; only artifact is
  untracked .maestro/profile_flow.yaml, committed 2026-08-30 by manager. Full manual smoke
  (login → report → solve → follow → profile → achievements) NOT run — needs device/emulator.
  Flow's test account test@civichero.app does not exist on any Firebase project yet.)

### DAY 5 — 2026-08-31 → 09-01

- [x] Freeze: full suite + lint + build:preview APK + PROJECT-STATE final audit (DONE 2026-08-30 — suite 70/70, eslint 0/0, APK build 9a09d138 on EAS)
- [x] Handoff report to user (see .agents/results/HANDOFF.md)

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
