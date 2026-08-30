# CIVIC HERO — Handoff Report (2026-08-30)

Deadline 2026-09-01 · Branch `phase/02-get-your-eyes-back`

## STATUS: Ship-ready pending human checkpoints

- Tests: 12/12 suites, 70/70 green · eslint: 0 errors / 0 warnings (`no-unused-vars` at error)
- Release APK (preview profile): **BUILT** — EAS build `9a09d138-3334-4004-a957-ff928404991d`
  https://expo.dev/accounts/l3nsingh/projects/civic-app/builds/9a09d138-3334-4004-a957-ff928404991d
  ⚠ preview profile uses APP_ENV=staging → this APK talks to project `civic-b72a8`.
  Store-facing build = `npm run build:production` (project `civic-d0574`).

## WHAT WAS DONE (this 5-day cycle)

- TASK-010..015: rate limiting, JOINED_SOLVE/trust fixes, live isAdmin, confirm-password,
  lint hygiene (0/0 + error everywhere), fixed profile back button, README refresh,
  targeted test coverage. All reviewed; several required manager completion after
  worker overclaims (see PROJECT-STATE "Live delegation status").
- Manager 2026-08-28/30: root-caused web auth failure (Email/Password provider was
  disabled on dev+staging; user enabled it on all 3 projects). Fixed auth error mapping
  (auth/configuration-not-found etc.) and made email-action continue URL env-driven
  (0ae1602, 223b904). Verified via Identity Toolkit probes: sign-in + password reset
  live on dev/staging/prod. Dev project has 0 users (web testing requires signup there);
  prod has 14.
- First EAS Android build: cloud keystore created, versionCode initialized to 1.

## NEXT (for the next session)

1. Full manual smoke on the preview APK (login → report → solve → follow → profile →
   achievements) — Maestro flow `.maestro/profile_flow.yaml` needs a real account on
   STAGING (`civic-b72a8`) — create one; `test@civichero.app` exists on no project.
2. `npm run build:production` when smoke passes (Play-facing, versionCode bump).
3. Maestro flow hardening: assertions use raw English strings — will break with i18n.

## HUMAN CHECKPOINTS (still open)

- `firebase deploy --only firestore:rules,firestore:indexes,functions` — phase-02
  rules/indexes/functions UNDEPLOYED on all projects.
- Rotate + restrict Google Maps API key (`AIzaSyBL1…`, committed + in git history);
  `git rm --cached .env.development/.env.staging/.env.production` (keys in history).
- Delete `scratch/firebase_info_for_worker.md` after use (consolidates all keys).
- Decide Play Store submission.

## RISKS

- Env files tracked in git (keys in history) — remediation listed above.
- Staging/prod parity: 0 users on staging; smoke must create data.
- `server/`, `dist_check/`, `web-client/` dead code — removal approved? (Day-3 checkpoint)
