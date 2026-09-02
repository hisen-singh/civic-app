# Remaining Work — Handoff (end of day, 2026-09-01)

Branch: `phase/02-get-your-eyes-back` · all changes **uncommitted** in working tree.

## Context: what was done today
1. Home screen rebuilt to reference-app layout: top search pill (opens Search screen) + CIVIC logo/name on the right + bell; feed header = sign-in banner → stories row (kept, with pts) → underline text tabs (FilterPills `variant="underline"`); "Report an Issue" button removed from feed (center + tab remains).
2. `IssueCard` rebuilt: full-bleed 16:9 media, title/description below media, ghost icon+count actions, Help Solve/Mark Fixed pills, urgency edge bar dropped. Bookmark + double-tap-upvote features preserved.
3. `SkeletonCard` matches new card shape.
4. Color migration: orange → teal → **final palette: 60-30-10** (60% Ink #08090F, 30% Slate/White, 10% Electric Blue #3B82F6, red #EF4444 reserved for critical/failed only). All `theme.js` tokens + hardcoded hexes converted; avatar ramps (HomeScreen, IssueCard) now 6-step blue tonal ramp; map markers/heatmap: Solved=deep blue `accentDark`, In Progress=white, Open=electric blue; ReportBottomSheet green→blue.
5. All touched files pass Babel parse. Zero orange/teal left.

## Remaining tasks (in order)

- [ ] **1. PublicProfileScreen avatar ramp** — `screens/PublicProfileScreen.js:15-26` still has the old 12-color rainbow array. Replace with the 6-step blue ramp used in HomeScreen/IssueCard: `["#172554","#1E3A8A","#1E40AF","#1D4ED8","#2563EB","#3B82F6"]` (keep the same hash function).

- [ ] **2. YouTube icon red** — `screens/ReportIssueScreen.js:598` uses `#FF0000` for the YouTube input icon. Decide: keep (YouTube brand) or switch to slate `#94A3B8` for palette purity. Trivial.

- [ ] **3. statusCriticalBg normalization** — `theme.js` `statusCriticalBg` is still `rgba(229, 57, 53, 0.20)` (legacy red) while `statusCritical` is now `#EF4444`. Change bg to `rgba(239, 68, 68, 0.20)` for exact consistency. Cosmetic.

- [ ] **4. Browser GUI visual test** (user asked for web-gui-tester skill) — app runs at `localhost:8081` (Expo web). Test plan:
  - P0: Home feed loads; tap search pill → Search screen; switch tabs (For You/Critical/Resolved/Nearby) with underline moving.
  - P1: upvote tap animates + turns blue; Help Solve → "Solving" outline state; bookmark toggles.
  - P3 visual: stories row rings (blue glow), full-width cards (no border, 16:9 media), title below media, no rainbow avatars, slate urgency chip contrast on dark bg, bottom bar center + blue. Screenshot evidence per test point.
  - Also check Map screen markers still distinguishable (deep blue vs electric blue vs white) on the actual map tiles.

- [ ] **5. Map marker readability check** — "In Progress" marker ring is now white `#F5F5F7`; verify it's visible against the map tile style (if the map uses a light style, white may vanish → fallback to slate `#94A3B8`).

- [ ] **6. Pre-existing bug: duplicate `searchIssues`** — `services/IssueService.js` lines 282 and 390 both define `searchIssues`; the second (100-doc fetch, 3 fields) silently overrides the first (cached, 5 fields). Deduplicate — keep the better one (first: cache + 5-field search), rename/remove the other.

- [ ] **7. Commit the day's work** — everything is uncommitted; suggest one commit for the home-screen redesign + one for the palette migration (`git add -p` helps since files overlap).

## Palette reference (keep for future work)
- Dominant 60%: `#08090F` (surface), `#12141D` (surfaceSubtle), `#181A25` (surfaceElevated)
- Secondary 30%: `#F5F5F7` (textPrimary), `#8F95A3` (textMuted), `rgba(255,255,255,0.06)` (border)
- Accent 10%: `#3B82F6` (accentBrand), `#60A5FA` (light), `#1D4ED8` (dark), `rgba(59,130,246,0.14)` (subtle)
- Reserved: `#EF4444` critical/failed ONLY
- Avatar ramp: `#172554 → #3B82F6`
- Rule: NO other hues anywhere (no teal/violet/pink/emerald/amber).
