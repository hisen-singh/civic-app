# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Civic Hero is a mobile-first civic platform for reporting, solving, and visualizing local community issues. Built with React Native (Expo SDK 54) and Firebase.

## Commands

### Development
- **Start app**: `npm start` or `npx expo start`
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`
- **Admin dashboard**: `npm run admin:dev`

### Testing
- **Unit tests**: `npm test`
- **Tests with coverage**: `npm test -- --coverage`
- **E2E tests**: `npm run test:e2e` (requires Maestro CLI)
- **CI pipeline**: GitHub Actions runs on push to `main` and PRs

### Building
- **Preview APK**: `npm run build:preview`
- **Production AAB**: `npm run build:production`
- **Admin dashboard build**: `npm run admin:build`

### Deploying
- **Firebase (rules, indexes, functions)**: `firebase deploy --only firestore:indexes,firestore:rules,functions`
- **Admin dashboard to hosting**: `npm run admin:deploy`

## Architecture

### Project Structure
```
civic-hero/
├── App.js                     # Entry point (navigation, auth, splash)
├── screens/                   # All app screens
├── services/                  # Business logic (AuthService, IssueService, etc.)
├── contexts/                  # React Contexts (AuthContext)
├── components/                # Reusable UI components
├── config/                    # Firebase config, i18n
├── hooks/                     # Custom hooks (useAuth, useIssues)
├── functions/                 # Firebase Cloud Functions (Node.js 18)
├── admin-dashboard/           # Vite + React admin panel
├── data/                      # Static data (categories)
├── locales/                   # i18n translations (en, hi)
├── utils/                     # Utility functions
├── __tests__/                 # Jest unit tests
├── .maestro/                  # E2E test flows
└── .github/workflows/         # CI (test.yml)
```

### Technology Stack
- **Mobile**: React Native 0.81.5 with Expo SDK 54
- **Admin**: React + Vite
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Push Notifications**: Expo Push API
- **Maps**: react-native-maps (Google Maps)
- **i18n**: i18next (English, Hindi)
- **Testing**: Jest, React Native Testing Library, Maestro (E2E)
- **CI/CD**: GitHub Actions, EAS Build
- **Crash Monitoring**: Sentry

### Key Patterns
- **Service-oriented**: UI screens are lightweight; all logic lives in `/services`
- **Caching**: `IssueService` uses in-memory caching with TTL and request deduplication
- **Auth resilience**: `AuthContext` has an 8-second safety timeout to prevent infinite loading
- **Real-time**: Firestore `onSnapshot` listeners for live issue feed updates
- **Firestore rules**: Field-level validation (votes, voters, solvers, status transitions)
- **Batched writes**: Cloud Functions chunk batch operations to stay under the 500-write limit

## Design System
- **Theme**: Dark mode (`theme.js`) with accent gradients
- **Colors**: Deep dark backgrounds, slate text, indigo/purple accents, green success states
- **Components**: GradientButton, FilterPills, AnimatedPressable, BeforeAfterCard
- **Icons**: MaterialCommunityIcons (rounded, minimal)

## Environment Variables
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry DSN for crash reporting
