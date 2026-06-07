# Civic Hero

Bright, impact-driven civic platform to report, solve, and visualize local issues.

## Design Philosophy (UI/UX Core)
- Mood: Bright but serious — warm blues (trust) with greens/oranges (action/impact)
- Layout: Card-based + vertical scroll, problems mapped locally (geo-based feed)
- Feel: Minimal, impact-driven, civic-hero tone
- Fonts: Inter or Poppins (clarity), Nunito (friendly)
- Icons: Rounded, minimal outlines
- Animation: Micro-interactions on "solve," "vote," "impact"; smooth map-to-feed transitions

## Screens Overview
1. Splash / Onboarding: Logo morph + 3-preference AI personalization (location, interests, skills)
2. Home Feed: AI-curated civic feed with search, filter chips, issue cards, map snippets; solved items fade
3. Post Problem: AI-assisted capture, auto-location, auto-tagging, authority suggestions
4. Solve: Gamified tasks, urgency, claim-to-solve flow, AI verification upon submission
5. Profile: Civic Score, posts, solved, badges, followers, optional authority verification
6. Impact Map: Heat map with tappable pins; solved areas glow green, high-issue zones glow red
7. Leaderboard: Weekly/monthly rankings by city/district/global; individuals/teams/NGOs
8. Notifications: Real-time alerts for support, solve status, trending nearby issues
9. Settings / AI Center: Interests, civic data dashboard, dark/light, privacy & location

## AI Integration
- Auto Problem Tagging (image/keyword)
- Skill Matching (past solutions)
- Authority Routing (relevant contacts)
- Fake Post Detection (metadata + patterns)
- Smart Feed (impactful-first)

## Tech Stack (proposed)
- Frontend: React Native (Expo) + Tailwind
- Backend: Node.js + Firebase/Supabase
- AI: OpenAI (NLP tagging) + Vision model
- Maps: Mapbox or Google Maps
- Gamification: Firestore + Cloud Functions

## Monorepo structure (initial)
- apps/mobile — React Native (Expo)
- server — Node.js backend
- packages/ui — shared UI components
- docs — design and product specs

## Getting Started
- Pending: tooling and scripts to be added.
