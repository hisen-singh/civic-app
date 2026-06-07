import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebaseConfig';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const functionsInstance = getFunctions(app);

export const BackendService = {
    /**
     * Register the device's push notification token with the backend.
     * Should be called once after the user logs in.
     */
    registerPushToken: async () => {
        if (Platform.OS === 'web') {
            console.log('[BackendService] Push notifications not supported on web.');
            return;
        }

        try {
            // Request Expo push permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('[BackendService] Push notification permission denied.');
                return;
            }

            // Get the Expo push token (wraps FCM/APNs under the hood)
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const token = tokenData.data;

            // Send the token to the backend Cloud Function to store it
            const saveFcmToken = httpsCallable(functionsInstance, 'saveFcmToken');
            await saveFcmToken({ token });

            console.log('[BackendService] Push token registered successfully.');
        } catch (error) {
            console.error('[BackendService] Error registering push token:', error);
        }
    },

    /**
     * Fetch the pre-computed leaderboard from the backend.
     * Falls back to returning an empty array on error.
     */
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
