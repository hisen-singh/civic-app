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
    }
};
