# CIVIC — Premium Aesthetic Roadmap ("Editorial Ink")

**Goal:** transform the app from "developer dark mode" to a premium, standalone-quality product using the Editorial Ink direction (Linear/Notion-dark calm) while keeping the full-bleed media feed you chose.

**Design constitution (applies to every task):**
- 90% neutral ink surfaces, accent blue `#3B82F6` ≤10% of pixels, red only for critical/failed
- Space Grotesk = display/titles only (600 max), Inter = everything else; no 800/900 weights; ALL-CAPS only on 11px micro-labels
- One radius scale: 10 / 14 / 18; hairline borders `rgba(255,255,255,0.08)`; soft shadows only, zero glows, zero button gradients
- No raw data visible: no `[BRACKETS]`, no zero-counts shouting, no seed-test artifacts

---

## Phase 0 — Foundation tokens (`theme.js`) · *~30 min, zero visual risk*
| # | Task |
|---|------|
| 0.1 | Surface ladder: bg `#090A10`, surface `#101218`, elevated `#151824`, hover `#1A1E2A` |
| 0.2 | Borders visible: `border` → 8% white, `borderSubtle` → 5%, delete 6%-white leftovers |
| 0.3 | Type tokens: add `type: {display, title, body, meta, micro}` objects w/ font family + weight + tracking, referencing existing `theme.font` |
| 0.4 | Shadows: replace `glow`/`accentGlow` with soft ambient `0.25/14`; keep `card`, `soft` |
| 0.5 | `statusCriticalBg` → `rgba(239,68,68,0.20)` (normalization from remaining-work #3) |
**Acceptance:** app still renders, everything shifts one calm step — no layout breaks.

## Phase 1 — Feed experience (highest visibility) · *~2-3 hrs*
| # | Task | File |
|---|------|------|
| 1.1 | **IssueCard editorial rebuild**: badges off media; meta line (urgency dot, category pill "Roads", status micro-label); title Space Grotesk 17/600 (no brackets); desc Inter 13/400; 24px avatar author row; borderless actions 18px + tabular counts; Help Solve = quiet accent-tint pill; frosted smaller play button; hairline between posts | `components/IssueCard.js` |
| 1.2 | Header: solid surface + hairline bottom; refined search pill; "CIVIC" wordmark 15/600; bell = plain icon, box border removed | `screens/HomeScreen.js` |
| 1.3 | Stories row: glow/shadows off, 1.5px accent ring (active only), 11/500 labels | `screens/HomeScreen.js` |
| 1.4 | Underline tabs: active 600 + 2px rounded accent bar; pill variant → hairline + surface | `components/ui/FilterPills.js` |
| 1.5 | Skeleton matches new card | `components/ui/SkeletonCard.js` |
**Acceptance:** feed screenshot shows one loud element per card (media), everything else whispers; no pill-on-pill stacking; zero brackets/caps-shouting.

## Phase 2 — App chrome · *~1-2 hrs*
| # | Task | File |
|---|------|------|
| 2.1 | Tab bar: normal-case 10/500 labels, no square focus tile (color-only active state), hairline top, flat accent center + (no gradient/glow) | `App.js` |
| 2.2 | GradientButton default → flat accent fill (kills gradients everywhere it's used) | `components/ui/GradientButton.js` |
| 2.3 | LoginOverlay: hairline card, quiet inputs, flat CTA | `components/LoginOverlay.js` |
| 2.4 | ShareModal / BottomSheet / ReportBottomSheet: hairlines + type tokens pass | `components/*.js` |
**Acceptance:** chrome reads as one product; nothing glows.

## Phase 3 — Secondary screens consistency · *~2-3 hrs*
3.1 MapScreen — markers: Open = accent, In Progress = slate `#94A3B8` (replaces white, fixes visibility risk from remaining-work #5), Solved = deep blue; sheet styles tokenized
3.2 PublicProfileScreen — rainbow avatar array → 6-step blue ramp (remaining-work #1)
3.3 SolveScreen / ProfileScreen / WatchAreaScreen — caps/weights/radius audit to constitution
3.4 ReportIssueScreen — YT icon decision (remaining-work #2: slate `#94A3B8` recommended), inputs hairline
3.5 SearchScreen + Notifications + Leaderboard — same audit
**Acceptance:** random screen screenshot passes the same eye test as the feed.

## Phase 4 — Data & detail polish · *~1-2 hrs*
4.1 Hide zero-count action numbers (render icon only until count > 0)
4.2 Notification dot: only when unread > 0 (logic hook)
4.3 Seed/demo data cleanup for screenshots (real names, past dates, real categories)
4.4 **Bug:** dedupe `IssueService.searchIssues` (lines 282/390 — keep cached 5-field version)
4.5 Logo: `assets/logo.jpg` (orange photo) → monochrome CIVIC wordmark mark to match blue system

## Phase 5 — Verification & QA · *~1 hr*
5.1 Babel parse all touched files + grep audits: no `#FF4500|#14B8A6|glow|bracket-tags`, palette-only hexes
5.2 Browser GUI test on dev server (web-gui-tester): P0 feed + tabs + search; P1 vote/save/solve states; P3 visual screenshots per test point into `gui-test-screenshots/`
5.3 Commit plan: one commit per phase, message convention as in history (`feat(ui): …`)

**Dependency order:** 0 → 1 → 2 → 3 → 4 → 5 (phases 2 and 3 can swap; 4 independent of 2-3).

---

## Editorial Ink — premium restyle (full-bleed cards kept)

**Design system (theme.js):**
- **Surface ladder refined**: bg `#090A10`, surface `#101218`, elevated `#151824`; borders raised to visible hairlines `rgba(255,255,255,0.08/0.05)`
- **Typography enforced**: Space Grotesk (display/titles, weight 600, tracking -0.2) + Inter (body 400/500, meta 12-13). Kill weight-800/900 shouting and most ALL-CAPS; caps only on 11px/0.5-tracking micro-labels
- **Radius scale**: 10/14/18 applied consistently
- **Shadows**: soft ambient (0.25/14) — all glow shadows deleted; gradients killed on buttons (flat accent)

## 1. `components/IssueCard.js` — editorial full-bleed card
- Media: 16:9 edge-to-edge, **no overlaid chips** (badges move below — clean media = premium); play button smaller + frosted
- Content block (padded 16, sits on surface):
  - Meta line first: urgency dot (red only if critical, else slate) + category chip ("Roads", quiet surface pill) + status as minimal text label — no shouty pills
  - Title: Space Grotesk 17/600, no `[BRACKET]` tags anywhere
  - Description: Inter 13/400 slate, 2 lines
  - Author row: 24px avatar, name 13/500, "· 2h · Location" muted single line
  - Actions: borderless quiet icons 18px + tabular counts, slate → accent when active; **Help Solve** = accent-tinted quiet pill (`rgba(59,130,246,0.12)` bg, accent text) instead of loud fill
- Posts separated by hairline rules + spacing (editorial rhythm)

## 2. `screens/HomeScreen.js`
- Header: solid surface + 1px hairline bottom (replaces gradient fade); search pill refined (surface fill, hairline, Inter 14 placeholder); "CIVIC" wordmark Space Grotesk 15/600 tracking 0.5; bell = plain icon, no square box border
- Stories row: glow ring + shadows removed (thin 1.5px accent ring on active only), labels 11/500, quieter
- Underline tabs refined: active 600 + 2px rounded accent indicator, inactive slate 400

## 3. `App.js` — tab bar
- Uppercase labels → normal case 10/500; square focused tile → plain icon, accent color when active; center + = flat accent circle (no gradient/glow); bar with hairline top border

## 4. Supporting components
- `FilterPills.js`: underline variant polish; pill variant gets hairline + surface
- `SkeletonCard.js`: match new card structure
- `GradientButton.js`: default becomes flat accent fill (kills gradients app-wide where used)

## Not changing
Navigation structure, data logic, services, Firebase, remaining-work.md items (PublicProfile ramp, searchIssues dedup stay queued).

## Verification
Babel syntax-parse all edited files; grep audit for glow/gradient leftovers; visual screenshot pass on your running dev server at localhost:8081.
