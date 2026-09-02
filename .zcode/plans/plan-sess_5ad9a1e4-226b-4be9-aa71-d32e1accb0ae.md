Two workstreams on branch `phase/02-get-your-eyes-back`: (A) make sign-in work reliably, (B) full premium UI pass — "dark + orange glow", all key screens. Then rebuild the APK.

## A. Fix sign-in (root-cause audit done)

Code audit result: `AuthService.login` (services/AuthService.js:24) is a clean passthrough — no verification gate; `AuthContext` sets `user` via `onAuthStateChanged` correctly; the APK's bundle was verified to contain prod Firebase config. The overlay itself is where it breaks for the user. Identified concrete failure points, all fixed:

1. **components/LoginOverlay.js — error mapping gap**: it only maps `auth/wrong-password`/`auth/user-not-found`; Firebase v12 returns **`auth/invalid-credential`** for bad credentials → user sees raw `Firebase: Error (auth/invalid-credential).` Fix: use the existing, tested `mapFirebaseAuthError(err.code)` from utils/authValidators.js (already maps invalid-credential, network, configuration-not-found…), fallback to `err.message`. Add a small `code: auth/xxx` detail line under the error banner so any future failure is diagnosable from a screenshot.
2. **Keyboard can hide AUTHORIZE**: modal is fixed-height content with `KeyboardAvoidingView behavior="height"` on Android. Fix: wrap body in `ScrollView keyboardShouldPersistTaps="handled"`, behavior `padding` (iOS) / `undefined` + `android:windowSoftInputMode` default resize.
3. **No password eye toggle** → typo-driven failures. Add secureTextEntry toggle.
4. **No sign-in entry on the Feed tab** (first screen a signed-out user sees). Add a sign-in chip to HomeScreen's header (signed-out only) + render `LoginOverlay` there, same as Map/Profile do.
5. Apply the same mapper to the signup path (JOIN THE FIGHT).
6. During implementation: one REST probe of prod Identity Toolkit to confirm the Email/Password provider is still enabled (rules out console-side causes), and re-check the built bundle for prod config before delivering.

## B. Premium pass — dark + orange glow (all key screens)

Keep the orange identity; deepen and refine everything else. One consistent pass through theme tokens first, then screens.

**Design tokens (theme.js)**: layered dark backgrounds (`#08090F` base + 3 surface levels), keep `accentBrand #FF4500` + new gradient pair (`#FF6A00→#FF4500`) and `accentGlow rgba(255,69,0,.25)`; radius system 10/14/18/24; new shadow presets (soft card, accent glow); extend `Gradients` (cta, headerFade, hero).

**Typography**: add **Space Grotesk (display) + Inter (body)** via `expo-google-fonts` packages + existing `Font.useFonts` fail-safe in App.js (same pattern as icons today).

**Screens/components**:
- **Tab bar (App.js)**: translucent surface + hairline top border, pill active indicator with orange glow; center + button becomes gradient circle with glow shadow.
- **LoginOverlay**: frosted glass modal (rounded 24, layered surface), CIVIC logo mark, gradient AUTHORIZE button with glow, focus-state inputs, error banner with the code line from A1.
- **IssueCard.js**: rounded 18 layered card, hairline border, urgency glow edge bar, softer badge pills, animated vote/comment chips.
- **HomeScreen.js**: gradient header fade, story rings with orange gradient, glowing active category pills, polished skeletons (SkeletonCard stays).
- **ProfileScreen.js**: gradient hero header, stat cards with icon + accent glow, refined rows.
- **SolveScreen.js**: XP/streak stat chips with gradients + glow, refined reward banner.
- **ReportIssueScreen.js**: gradient submit, refined section headers/chips.
- **LeaderboardScreen.js**: top-3 podium treatment with gradients.
- **Micro-interactions**: apply existing `AnimatedPressable` + `expo-haptics` consistently on primary actions.

**Robustness** (the "robust" ask): wrap each tab screen in a nested `ErrorBoundary` so one screen crashing shows a recoverable error card instead of blanking the whole app (top-level boundary stays as last resort). This is the class of bug that hit Map/+ yesterday.

## Verification & delivery
- eslint 0/0, full jest suite green (update style/text-assertion tests if any labels change; none currently assert overlay strings).
- EAS preview rebuild; inspect the new bundle for: prod Firebase config, new font names present, `Forgot password?`, then clean scratch artifacts and hand over the APK link with a test checklist (sign-in, forgot-password, map, + report, feed).

Commits: one for sign-in fixes, one for design tokens+fonts, one for the screen passes, one docs/handoff update.