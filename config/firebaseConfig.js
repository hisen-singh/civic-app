import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCWFEouXZQHNYFZPCeqBE6q3VpokIWnJ4A",
    authDomain: "civic-d0574.firebaseapp.com",
    projectId: "civic-d0574",
    storageBucket: "civic-d0574.firebasestorage.app",
    messagingSenderId: "1045062367632",
    appId: "1:1045062367632:web:5cf44682d92d1bdcdc5b15",
    measurementId: "G-KJ8V6BMD86"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});
export const storage = getStorage(app);
// Analytics is optional for now, but good to have initialized if needed later
// const analytics = getAnalytics(app); 
