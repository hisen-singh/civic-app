import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebaseConfig';

/**
 * LeaderboardService — fetches ranked user lists from Firestore
 * or via Cloud Functions for server-side aggregation.
 */
export const LeaderboardService = {
  /**
   * Get the main leaderboard (all-time, global).
   */
  getLeaderboard: async (options = {}) => {
    const { period = 'all_time', city = null, category = null, pageSize = 20 } = options;
    try {
      const getLeaderboardCallable = httpsCallable(functions, 'getLeaderboard');
      const result = await getLeaderboardCallable({ period, city, category, pageSize });
      return result.data.leaderboard || [];
    } catch (error) {
      console.error('[LeaderboardService] Error fetching leaderboard:', error);
      // Fallback: query Firestore leaderboard collection directly
      return LeaderboardService.getLeaderboardFromFirestore({ period, city, pageSize });
    }
  },

  /**
   * Fallback: query leaderboard/{period}/entries directly.
   */
  getLeaderboardFromFirestore: async ({ period = 'all_time', city = null, pageSize = 20 } = {}) => {
    try {
      const collectionPath = city
        ? `leaderboard/city:${city}/entries`
        : `leaderboard/${period}/entries`;

      const q = query(
        collection(db, collectionPath),
        orderBy('rank', 'asc'),
        limit(pageSize),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('[LeaderboardService] Fallback query failed:', error);
      return [];
    }
  },

  /**
   * Get the current user's rank across different leaderboards.
   */
  getUserRanks: async (userId) => {
    if (!userId) return null;
    try {
      const getUserRankCallable = httpsCallable(functions, 'getUserRank');
      const result = await getUserRankCallable({});
      return result.data.ranks || {};
    } catch (error) {
      console.error('[LeaderboardService] Error fetching user ranks:', error);
      return null;
    }
  },

  /**
   * Get top leaders by category (e.g., most solves in "Pothole" category).
   */
  getCategoryLeaderboard: async (category, pageSize = 20) => {
    try {
      const getLeaderboardCallable = httpsCallable(functions, 'getLeaderboard');
      const result = await getLeaderboardCallable({ category, pageSize });
      return result.data.leaderboard || [];
    } catch (error) {
      console.error('[LeaderboardService] Error fetching category leaderboard:', error);
      return [];
    }
  },
};
