# Civic Hero — Product & Design Spec

## Design Philosophy (UI/UX Core)

- Mood: Bright but serious. Use warm blues (trust) + greens/oranges (action/impact).
- Layout Style: Card-based + vertical scroll, but problems are mapped locally (geo-based feed).
- Feel: Minimal, impact-driven, civic-hero tone.
- Font Pair: Inter or Poppins for clarity, Nunito for friendly look.
- Iconography: Use rounded icons, minimal outlines.
- Animation: Micro-interactions on “solve,” “vote,” and “impact.” Smooth map-to-feed transitions.

---

## Screen-by-Screen UI Plan

1. Splash / Onboarding
   - Logo Animation: civic icon morphs into people icons.
   - Slides:
     - “Report problems in your area.”
     - “Earn followers by solving them.”
     - “Build civic credit that matters.”
   - AI Personalization: Ask 3 quick preferences — location, interest (environment, transport, etc.), and skills — to auto-tailor the feed.

2. Home Feed (AI-Curated Civic Feed)
   - Layout:
     - Top: Search bar → “What’s happening near you?”
     - Filter Chips: Environment | Roads | Safety | Health | Others
     - Feed Card (each issue):
       - 📍 Problem title (with location tag)
       - Short description
       - Image/video evidence
       - Impact Meter (number of votes)
       - Buttons: Support 🤝 | Solve 💡 | Comment 💬
       - Small map snippet (AI auto-pins)
   - Unique Element: Problems fade (grayscale) when marked solved — creates visual impact over time.

3. Post Problem (AI-Assisted)
   - Floating “+” button (bottom center)
   - Options:
     - 📸 Upload photo/video
     - 🗺 Auto-detect location
     - ✍ Short description (AI can summarize issue title)
     - 🔖 Choose category (AI suggests one)
   - Button: “Report It” → Animated confirmation (“Your voice counts!”)
   - AI Feature: Suggests relevant authorities or volunteers nearby.

4. Solve Section (Gamified Tasks)
   - Two tabs:
     1. Nearby Problems
     2. Matched to Your Skills (AI)
   - Each card shows:
     - Problem title + reward points
     - Urgency bar (red/yellow/green)
     - “Claim to Solve” button → Locks for 24h
   - After submission → AI verifies image/proof → Problem status = Solved ✅

5. Profile
   - Header: Profile pic + “Civic Score” (like karma)
   - Tabs: Posts | Solved | Badges / Achievements 🏅 (e.g., “Water Warrior,” “Street Savior”)
   - Follower count = Social credibility
   - Button: “Verify via Authority” → optional badge (for serious solvers)

6. Impact Map (Unique View)
   - Heat-map view of issues in your city.
   - Tappable pins → open issue cards.
   - “Solved Areas” glow green.
   - “High-issue zones” glow red.

7. Leaderboard (Gamification Layer)
   - Weekly/Monthly rankings by: City / District / Global
   - Tabs: Individuals | Teams | NGOs
   - “Top Solvers” earn special profile borders (Valorant-rank vibes).

8. Notifications
   - Real-time alerts: someone supports your report, problem marked solved, nearby issue trending.

9. Settings / AI Center
   - Manage interests (AI tailors problems you see)
   - Civic Data dashboard (your impact, points, solved count)
   - Dark/Light Mode toggle
   - Privacy & location controls

---

## AI Integration Points

1. Auto Problem Tagging: Detect civic issue type via image/keywords
2. Skill Matching: Suggest problems you can realistically solve (based on past solutions)
3. Authority Routing: Suggest relevant local authority contacts
4. Fake Post Detection: Verify authenticity via image metadata + pattern detection
5. Smart Feed: Show impactful posts first, not just popular ones

---

## UX Flow Summary
Onboarding → Feed → Post Problem / Solve → Profile / Leaderboard → Impact Map → Engagement loop

---

## Tech/UI Framework Suggestions

- Frontend: React Native + Tailwind / Expo
- Backend: Node.js + Firebase / Supabase
- AI: OpenAI API (NLP tagging) + Vision model (image classification)
- Maps: Mapbox or Google Maps API
- Gamification: Firebase Firestore + Cloud Functions for point logic
