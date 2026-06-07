import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    updateProfile, 
    sendEmailVerification
} from "firebase/auth";
import { auth } from '../config/firebaseConfig';

export const AuthService = {
    // Login — straightforward sign-in, no blocking gates
    login: async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    },

    // Signup — creates account, sets display name, sends verification email
    signup: async (name, email, password) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update display name
            await updateProfile(userCredential.user, { displayName: name });
            
            // Send verification email (non-blocking, best-effort)
            try {
                await sendEmailVerification(userCredential.user);
            } catch (e) {
                console.warn('[AuthService] Verification email failed:', e);
            }
            
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    },

    // Logout
    logout: async () => {
        try {
            await signOut(auth);
        } catch (error) {
            throw error;
        }
    },

    // Get Current User
    getCurrentUser: () => {
        return auth.currentUser;
    }
};
