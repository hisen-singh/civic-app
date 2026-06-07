import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebaseConfig';

// Web stub — push notifications are not supported on web browsers.
// FCM token registration and push delivery are handled natively on iOS/Android.

const functionsInstance = getFunctions(app);

export const BackendService = {
    /** No-op on web — push tokens require a native device. */
    registerPushToken: async () => {
        console.log('[BackendService] Push notifications are not supported on web.');
    },

    /** Fetch the pre-computed leaderboard from the backend Cloud Function. */
    getLeaderboard: async () => {
        try {
            const getLeaderboard = httpsCallable(functionsInstance, 'getLeaderboard');
            const result = await getLeaderboard();
            return result.data.leaderboard || [];
        } catch (error) {
            console.error('[BackendService] Error fetching leaderboard:', error);
            return [];
        }
    },
};
