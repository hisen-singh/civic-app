# Civic Hero — Community Reform Platform

Civic Hero is a mobile-first community platform that empowers citizens to report, track, and resolve local civic issues (potholes, sanitation, infrastructure, safety, and more). Built with a high-performance architecture, it allows communities to take real-world action safely and efficiently.

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native 0.81 + Expo SDK 54 |
| **Admin Dashboard** | React + Vite |
| **Backend** | Firebase (Auth, Firestore, Cloud Functions, Storage) |
| **Push Notifications** | Expo Push API |
| **Navigation** | React Navigation (Bottom Tabs + Stack) |
| **Maps** | `react-native-maps` (Google Maps API) |
| **i18n** | `i18next` + `react-i18next` (English, Hindi) |
| **Crash Monitoring** | Sentry |
| **Testing** | Jest + React Native Testing Library |
| **CI/CD** | GitHub Actions, EAS Build |
| **E2E Testing** | Maestro |

## 📁 Project Structure

```
civic-hero/
├── App.js                     # Entry point — navigation, auth guard, splash
├── screens/                   # All app screens (Home, Map, Solve, Profile, etc.)
├── services/                  # Business logic singletons
│   ├── AuthService.js         # Firebase login, signup, password reset
│   ├── IssueService.js        # Issue CRUD, caching, real-time subscriptions
│   ├── BackendService.js      # Push token registration, leaderboard
│   └── NotificationService.js # In-app notification queries
├── contexts/                  # React Contexts (AuthContext)
├── components/                # Reusable UI (IssueCard, ErrorBoundary, etc.)
├── config/                    # Firebase config, i18n setup
├── hooks/                     # Custom hooks (useAuth, useIssues)
├── functions/                 # Firebase Cloud Functions (11 functions)
├── admin-dashboard/           # Vite-based React admin panel
├── data/                      # Static data (issue categories)
├── locales/                   # i18n translation files (en, hi)
├── utils/                     # Utility functions (urgency detection)
├── assets/                    # Icons, splash screens
├── __tests__/                 # Jest unit tests (6 suites, 20 tests)
├── .maestro/                  # E2E test flows
├── .github/workflows/         # CI pipeline (test.yml)
├── firestore.rules            # Firestore security rules
└── firestore.indexes.json     # Composite index definitions
```

## 🏗️ Architecture

### Service-Oriented Frontend
- **`/screens`** — Lightweight UI screens that handle interactions only
- **`/services`** — Pure logic singletons with in-memory caching and request deduplication
- **`/contexts`** — Global state (AuthContext provides resilient auth with an 8-second safety timeout)
- **`/components`** — Reusable UI elements (IssueCard, FilterPills, GradientButton, etc.)

### Firebase Cloud Functions (11 deployed)
| Function | Trigger | Purpose |
|---|---|---|
| `onIssueCreated` | Firestore onCreate | Notify users with nearby Watch Areas |
| `onIssueUpdated` | Firestore onUpdate | Notify on status changes & new solvers |
| `onCommentAdded` | Firestore onUpdate | Notify issue author of new comments |
| `recalculateTrustScores` | Scheduled (daily) | Recompute user trust scores & leaderboard ranks |
| `archiveOldIssues` | Scheduled (weekly) | Move solved issues older than 30 days to archive |
| `cleanupNotifications` | Scheduled (daily) | Delete read notifications older than 7 days |
| `saveFcmToken` | HTTPS callable | Store Expo push token for a user |
| `getLeaderboard` | HTTPS callable | Return top 20 users by trust score |
| `checkAdminStatus` | HTTPS callable | Check if calling user has admin claim |
| `setAdminRole` | HTTPS callable | Grant admin role (admin-only) |
| `adminUpdateIssueStatus` | HTTPS callable | Change issue status (admin-only) |

### Admin Dashboard
A separate Vite + React web app in `/admin-dashboard` for triaging issues, viewing analytics, and managing users. Deployed to Firebase Hosting.

## 🔐 Security

- **Firestore Rules** enforce field-level validation: votes can only increment by 1, voters/solvers can only append the current user's UID, and status transitions are restricted
- **Firebase Auth** with email verification required before app access
- **Admin role** managed via Firebase custom claims
- **Sensitive config** (Sentry DSN) loaded from environment variables

## 🎬 Getting Started

### Prerequisites
- Node.js 20+
- npm
- Expo CLI (`npx expo`)
- Firebase CLI (`npm install -g firebase-tools`)

### Setup
```bash
# Clone the repo
git clone https://github.com/hisen-singh/civic-app.git
cd civic-app

# Install dependencies
npm install

# Start the Expo dev server
npm start
```

### Running on Devices
```bash
npm run android    # Android emulator or device
npm run ios        # iOS simulator (macOS only)
npm run web        # Web browser
```

### Admin Dashboard
```bash
npm run admin:dev      # Start dev server (localhost:5173)
npm run admin:build    # Production build
npm run admin:deploy   # Build + deploy to Firebase Hosting
```

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests (requires Maestro CLI)
npm run test:e2e
```

**Test Suites:** AuthContext, AuthService, IssueService, LoginScreen, MapScreen, SignupScreen
**CI:** GitHub Actions runs tests + lint + bundle check on every push to `main` and on PRs.

## 🛠️ Build & Deployment

### Mobile (EAS Build)
```bash
# Preview APK (direct install)
npm run build:preview

# Production AAB (Google Play Store)
npm run build:production
```

Pre-build validation (`scripts/pre-build-check.js`) runs the full test suite and a bundle check before any cloud build.

### Firebase
```bash
# Deploy rules, indexes, and functions
firebase deploy --only firestore:indexes,firestore:rules,functions

# Deploy admin dashboard
npm run admin:deploy
```

> **Note:** Cloud Functions require the Firebase Blaze (pay-as-you-go) plan.

## 🌐 Internationalization

The app supports English and Hindi via `i18next`. Translation files are in `/locales`. Add new languages by creating a new JSON file and registering it in `config/i18n.js`.

## 📄 License

[0BSD](LICENSE)
