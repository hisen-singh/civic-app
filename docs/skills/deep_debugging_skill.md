# 🐛 Error Find & Deep Debug Skill (Civic Hero App)

**Target Agent:** AI Assistants tasked with fixing crashes, tracing bugs, or investigating unexpected behavior.
**Context:** Civic Hero is a full-stack Firebase/Expo app. Errors can span across the client (React Native), the backend (Cloud Functions), and security rules (Firestore).

When debugging a complex issue, STRICTLY follow this systematic approach:

## 1. Isolate the Layer
Before writing any code, determine exactly which layer is failing:
- **Client Side (Expo):** Is the app crashing on startup? Check `app.json` for missing `plugins` (native code linking).
- **Network / Rules:** Are reads/writes failing silently or throwing "Permission Denied"? Check `firestore.rules`. Remember that Firebase Security Rules fail by default if not explicitly matched.
- **Backend (Cloud Functions):** Is a background trigger not firing? Check the exact trigger path (e.g., `.document('issues/{issueId}')`).

## 2. Information Gathering (Logs)
DO NOT guess the error. Always retrieve logs first.
- **Cloud Functions:** Use `firebase functions:log --lines 50` to read recent backend crashes.
- **EAS Builds:** If a cloud build fails, use `eas build:view <build-id>` or check the Expo dashboard. Look specifically for Gradle/CocoaPods native errors.
- **Client Console:** Inspect local `console.error` logs if running via `expo start`.

## 3. Common Civic Hero Gotchas
- **Missing Environment Variables:** EAS Cloud builds do NOT automatically include your local `.env`. If `process.env.EXPO_PUBLIC_...` is missing during an EAS build, native plugins (like Sentry) will crash the Gradle build, or Firebase will fail to initialize.
- **Firestore Array Forgery:** When validating arrays (like `voters` or `solvers`) in rules, always check that the user wasn't *already* in the array before allowing an increment: `!resource.data.arrayName.hasAny([request.auth.uid])`.
- **Subcollections vs Arrays:** Be aware that `comments` were migrated to a subcollection (`issues/{issueId}/comments/{commentId}`). Any legacy code looking for an array (`issue.comments`) will fail.

## 4. Execution Rule
When proposing a fix, provide the exact file paths and explain *why* the bug occurred before replacing the code. Do not implement temporary bypasses for security rules unless explicitly requested for local testing, and always revert them.
