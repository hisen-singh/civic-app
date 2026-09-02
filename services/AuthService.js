import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import * as Sentry from "@sentry/react-native";

// actionCodeSettings removed to prevent redirecting to Admin Dashboard
// on the Firebase Hosting domain.

export const AuthService = {
  // Login — straightforward sign-in, no blocking gates
  login: async (email, password) => {
    try {
      console.log("[AuthService] Attempting login on DB:", auth.app.options.projectId);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim(),
      );
      return userCredential.user;
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  },

  // Signup — creates account, sets display name, sends verification email
  signup: async (name, email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim(),
      );
      // Update display name
      await updateProfile(userCredential.user, { displayName: name });

      // Send verification email
      try {
        await sendEmailVerification(userCredential.user);
        console.log("[AuthService] Verification email sent to:", email);
      } catch (e) {
        console.error(
          "[AuthService] Verification email FAILED:",
          e.code,
          e.message,
        );
        Sentry.captureException(e);
        // Don't block signup, but log the real error
      }

      return userCredential.user;
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  },

  // Resend verification email (for manual retry)
  resendVerificationEmail: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user signed in");
    if (user.emailVerified) throw new Error("Email already verified");
    await sendEmailVerification(user);
    console.log("[AuthService] Verification email resent to:", user.email);
  },

  // Forgot password
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      console.log("[AuthService] Password reset email sent to:", email);
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  },

  // Logout
  logout: async () => {
    Sentry.setUser(null);
    await signOut(auth);
  },

  // Get Current User
  getCurrentUser: () => {
    return auth.currentUser;
  },
};
