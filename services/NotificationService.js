import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const NotificationService = {
    /**
     * Fetches all notifications for a specific user.
     */
    getUserNotifications: async (userId) => {
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION), 
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    },

    /**
     * Marks a notification as read in Firestore.
     */
    markAsRead: async (notificationId) => {
        try {
            await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
        } catch (error) {
            console.error("Error marking notification read:", error);
        }
    },

    /**
     * Listens to the count of unread notifications for a user.
     */
    listenUnreadCount: (userId, callback) => {
        if (!userId) {
            callback(0);
            return () => {};
        }
        
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where("userId", "==", userId),
            where("read", "==", false)
        );

        // We use onSnapshot to get real-time updates
        const { onSnapshot } = require("firebase/firestore");
        
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        }, (error) => {
            console.error("Error listening to unread notifications:", error);
            callback(0);
        });
    }
};
