import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../config/firebaseConfig";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

const functionsInstance = getFunctions(app);

export const BackendService = {
  /**
   * Register the device's push notification token with the backend.
   * Should be called once after the user logs in.
   */
  registerPushToken: async () => {
    if (Platform.OS === "web") {
      console.info("[BackendService] Push notifications not supported on web.");
      return;
    }

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF4500",
        });
      }

      // Request Expo push permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.info("[BackendService] Push notification permission denied.");
        return;
      }

      // Get the Expo push token (wraps FCM/APNs under the hood)
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      const token = tokenData.data;

      // Send the token to the backend Cloud Function to store it
      const saveFcmToken = httpsCallable(functionsInstance, "saveFcmToken");
      await saveFcmToken({ token });

      console.info("[BackendService] Push token registered successfully.");
    } catch (error) {
      console.warn("[BackendService] Error registering push token:", error);
    }
  },

  /**
   * Fetch the pre-computed leaderboard from the backend.
   * Falls back to returning an empty array on error.
   */
  getLeaderboard: async () => {
    try {
      const getLeaderboard = httpsCallable(functionsInstance, "getLeaderboard");
      const result = await getLeaderboard();
      return result.data.leaderboard || [];
    } catch (error) {
      console.error("[BackendService] Error fetching leaderboard:", error);
      return [];
    }
  },
};
