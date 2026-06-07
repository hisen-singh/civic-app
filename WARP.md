# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Civic Hero is an impact-driven civic platform for reporting, solving, and visualizing local issues. The app uses a mobile-first Expo/React Native approach with planned backend services and shared UI components.

## Commands

### Development
- **Start app**: `npm start` or `expo start`
- **Android**: `npm run android` or `expo start --android`
- **iOS**: `npm run ios` or `expo start --ios`
- **Web**: `npm run web` or `expo start --web`

### Building (when ready)
- Expo build: `eas build` (after installing EAS CLI: `npm install -g eas-cli`)
- Local builds: Refer to [Expo documentation](https://docs.expo.dev/build/setup/)

### Testing & Quality (to be configured)
- Linting, type checking, and testing scripts should be added as features are built out

## Architecture

### High-Level Structure
```
civic-hero/
├── App.js / index.js          # Expo entry point (minimal placeholder)
├── apps/mobile/               # React Native (Expo) mobile app
├── packages/ui/               # Shared UI components & theming
├── server/                    # Node.js backend (Firebase/Supabase planned)
└── docs/                      # Design & product specs
```

### Technology Stack
- **Frontend**: React Native 0.81.5 with Expo 54.0.20
- **Styling**: React Native (no Tailwind setup yet; planned for later)
- **Backend**: Node.js with Firebase/Supabase (not yet implemented)
- **AI/ML**: OpenAI (NLP tagging), Vision models (planned)
- **Maps**: Mapbox or Google Maps (planned)
- **Package Manager**: npm (consider pnpm for monorepo if adding workspace packages)

### Current State
- Project is in **early bootstrap phase**
- Main app structure and navigation not yet implemented
- Planned features: onboarding, AI-curated feed, problem posting, gamification, impact mapping, leaderboards
- Design philosophy: Bright UI (warm blues, greens/oranges), card-based layout, micro-interactions

### Key Screens to Build
1. Splash / Onboarding
2. Home Feed (AI-curated, geo-based)
3. Post Problem (AI-assisted)
4. Solve (gamified tasks)
5. Profile (Civic Score, badges)
6. Impact Map (heat map visualization)
7. Leaderboard (rankings)
8. Notifications
9. Settings / AI Center

## Design System
- **Colors**: Warm blues (trust), greens/oranges (action/impact)
- **Typography**: Inter or Poppins (clarity), Nunito (friendly)
- **Icons**: Rounded, minimal outlines
- **Animation**: Micro-interactions on solve/vote/impact; smooth transitions

## Next Steps for Contributors
1. Set up folder structure in `apps/mobile/` with screens and navigation
2. Build shared UI components in `packages/ui/`
3. Implement backend endpoints in `server/`
4. Add linting, testing, and build scripts
5. Configure Tailwind if needed for web/responsive design
6. Set up AI integration endpoints for tagging and skill matching
