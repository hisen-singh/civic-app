# 🎨 Frontend UI Skill (Civic Hero App)

**Target Agent:** AI Assistants working on Frontend / UI / UX tasks.
**Context:** Civic Hero is an Expo (React Native) mobile app with a React (Vite) Admin Dashboard. 

When modifying or creating UI for Civic Hero, STRICTLY adhere to the following protocols:

## 1. Design System & Theming
- **Do not use ad-hoc hex codes.** Always use the centralized `Colors`, `Radius`, and `Shadows` from `theme.js`.
- **Components:** Prioritize using `react-native-paper` components. Ensure they are styled using the app's dark-mode default theme.
- **Icons:** Use `@expo/vector-icons` (specifically `MaterialCommunityIcons`) for consistent iconography.

## 2. User Experience (UX) Best Practices
- **No Blocking Alerts:** Never use `Alert.alert` for routine errors (like network failures or form validation). Use inline error text, banners, or toasts so you don't interrupt the user's flow.
- **Optimistic Updates:** When a user interacts with a high-frequency action (like Upvoting or Joining as a Solver), update the UI state *immediately* before the Firebase backend call finishes. Roll back the state only if the call fails.
- **Skeleton Loaders:** For feed screens (like `HomeScreen` or `MapScreen` bottom sheets), use skeleton loaders instead of generic spinning circles to improve perceived performance.
- **Empty States:** Every empty list (e.g., "No issues found") MUST have an actionable Call-To-Action (CTA) button, like "Report an Issue."

## 3. Code Structure
- **Functional Components:** Use React functional components with Hooks.
- **Keep it Clean:** Separate complex business logic into custom hooks (e.g., `useIssues`, `useLocation`) rather than polluting the UI component.
- **Responsive:** Ensure UI scales gracefully on different phone sizes using `react-native-safe-area-context` and relative flex layouts.

## 4. Execution Rule
Whenever asked to "build a UI feature", always check if an existing component (like `IssueCard` or `PrimaryButton`) can be reused or extended before building from scratch.
