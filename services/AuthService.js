import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile, 
    sendEmailVerification,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from '../config/firebaseConfig';

// Action code settings — tells Firebase where to redirect after email actions
const actionCodeSettings = {
    url: 'https://civic-d0574.firebaseapp.com', // Your Firebase authDomain
    handleCodeInApp: false, // Open in browser, not deep-link
};

export const AuthService = {
    // Login — straightforward sign-in, no blocking gates
    login: async (email, password) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    },

    // Signup — creates account, sets display name, sends verification email
    signup: async (name, email, password) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update display name
        await updateProfile(userCredential.user, { displayName: name });
        
        // Send verification email
        try {
            await sendEmailVerification(userCredential.user, actionCodeSettings);
            console.log('[AuthService] Verification email sent to:', email);
        } catch (e) {
            console.error('[AuthService] Verification email FAILED:', e.code, e.message);
            // Don't block signup, but log the real error
        }
        
        return userCredential.user;
    },

    // Resend verification email (for manual retry)
    resendVerificationEmail: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('No user signed in');
        if (user.emailVerified) throw new Error('Email already verified');
        await sendEmailVerification(user, actionCodeSettings);
        console.log('[AuthService] Verification email resent to:', user.email);
    },

    // Forgot password
    resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
        console.log('[AuthService] Password reset email sent to:', email);
    },

    // Logout
    logout: async () => {
        await signOut(auth);
    },

    // Get Current User
    getCurrentUser: () => {
        return auth.currentUser;
    }
};
