# CIVIC HERO — Handoff Report (2026-08-30, rev 2)

Deadline 2026-09-01 · Branch `phase/02-get-your-eyes-back`

## STATUS: Previous orange UI restored; rebuild in flight

- Tests: 12/12 suites, 70/70 green · eslint: 0 errors / 0 warnings
- **UI RESTORED (acf2c17):** user preferred the previous APK's look. Source =
  local `main` (commits e6cb5db..c9a0789, never pushed). Checked out main's
  whole UI layer (screens, components, theme w/ `accentBrand #FF4500`, CIVIC
  logo assets, 1024px icons, app.json w/ google-services.json, maestro flows)
  onto this branch. Our services/auth/security work kept (APIs superset-verified).
  Fixes applied on top of main's code: `alert()` → `Alert.alert` in
  CommentBottomSheet (RN crash), dead menu/delete code + unused imports removed
  (102 → 0 lint), confirm-password (TASK-013) re-ported into main's SignupScreen,
  env-driven firebaseConfig kept (EAS vars), Maps key reverted to previous
  build's `AIzaSyBWMX…` (app.json + EAS env var, both environments).
- Release APK: NEW BUILD LAUNCHED after acf2c17 (see EAS dashboard —
  expo.dev/accounts/l3nsingh/projects/civic-app/builds). Prior good build
  2a7fce30 is superseded (indigo UI + Map/Report/Settings crash).
- Crash fixes (9e252ad) — still relevant history: MapScreen/ReportIssueScreen/
  SettingsScreen shipped `React.useCallback/React.useEffect` with no React
  import (worker's lint sweep) → ErrorBoundary screen on those tabs. Fixed.

## KNOWN BEHAVIOR NOTES (from main's UI — intentional, matches old build)

- SolveScreen only lists issues inside the India bounding box (main's filter);
  issue authors named like "city …/open data…" are excluded.
- Login/Signup are a LoginOverlay modal (SIGN IN / JOIN THE FIGHT) rendered by
  MapScreen + ProfileScreen when logged out; standalone LoginScreen/SignupScreen
  have NO navigation route (kept for future reuse; Signup keeps confirm-password).
- ProfileScreen is always the self profile; other users → PublicProfileScreen.
- ErrorBoundary (ours) has a "View details" toggle — because Sentry DSN is
  empty, on-device error text is the only crash evidence; ask user to paste it.

## NEXT (for the next session)

1. User smoke-tests new APK: map tiles (Maps key `BWMX…` restriction must allow
   package com.civic.app + EAS keystore SHA-1 — was fine in previous build),
   - Report flow, Solve, comment sheets, share.
2. `npm run build:production` when smoke passes (Play-facing, versionCode bump).
3. Maestro flows (`profile_flow.yaml` etc.) reference old indigo-UI labels —
   need rewrite for main's UI before any E2E run.

## HUMAN CHECKPOINTS (still open)

- `firebase deploy --only firestore:rules,firestore:indexes,functions` — phase-02
  rules/indexes/functions UNDEPLOYED on all projects.
- Rotate + restrict the Google Maps key that ships in builds; `git rm --cached`
  the .env files (keys in history); google-services.json is now also tracked
  (standard practice — client config, not a secret — but note it).
- Delete `scratch/firebase_info_for_worker.md` after use (consolidates all keys).
- Decide Play Store submission. Local `main` (c9a0789) is 5 commits AHEAD of
  origin/main — push decision is the owner's.

## RISKS

- Env files tracked in git (keys in history) — remediation listed above.
- code-chunk-check branch is a separate lineage with related UI — do not merge
  casually; main was confirmed the true source of the previous build.
