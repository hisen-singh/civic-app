import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebaseConfig";

/**
 * FeedService — handles the social feed and trending issues.
 *
 * The feed uses a hybrid fan-out model:
 * - When you create/solve an issue, a Cloud Function writes to YOUR feed
 * - For followers, a scheduled or on-demand function aggregates trending items
 * - On app open, the client fetches from both: own feed + trending issues
 *
 * For simplicity, we fetch from the issues collection with filters
 * and sort by createdAt / trendingScore. In v2, migrate to the
 * dedicated userFeed/{uid}/timeline subcollection populated by functions.
 */
export const FeedService = {
  /**
   * Get the home feed: a mix of:
   * 1. Issues from users you follow (fetched via issue authorId in)
   * 2. Trending issues in your city
   * 3. Recent viral issues
   *
   * For v1, we return a unified feed sorted by trendingScore + recency.
   */
  getHomeFeed: async (options = {}) => {
    const { city, pageSize = 20, lastDoc = null } = options;
    try {
      const feedCallable = httpsCallable(functions, "getHomeFeed");
      const result = await feedCallable({ city, pageSize });
      return result.data;
    } catch (error) {
      console.error("[FeedService] Error fetching home feed:", error);
      // Fallback: return trending issues
      return FeedService.getTrendingIssues({ city, pageSize, lastDoc });
    }
  },

  /**
   * Get trending issues — sorted by trendingScore descending.
   * Filterable by city and/or category.
   */
  getTrendingIssues: async (options = {}) => {
    const { city, category, pageSize = 20, lastDoc = null } = options;
    try {
      const trendingCallable = httpsCallable(functions, "getTrendingIssues");
      const result = await trendingCallable({ city, category, pageSize });
      return result.data.issues || [];
    } catch (error) {
      console.error("[FeedService] Error fetching trending:", error);
      // Fallback: query Firestore directly
      let q;
      const constraints = [
        orderBy("trendingScore", "desc"),
        orderBy("createdAt", "desc"),
        limit(pageSize),
      ];
      if (lastDoc) constraints.splice(2, 0, startAfter(lastDoc));
      q = query(collection(db, "issues"), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  },

  /**
   * Get issues from users you follow.
   * Returns recent issues from followed users, sorted by createdAt desc.
   */
  getFollowingFeed: async (userId, pageSize = 20, lastDoc = null) => {
    if (!userId) return { issues: [], lastDoc: null, hasMore: false };
    try {
      // Get list of users being followed
      const followingRef = collection(db, "users", userId, "following");
      const followingSnap = await getDocs(followingRef);
      const followedIds = followingSnap.docs.map((d) => d.id);

      if (followedIds.length === 0) {
        return { issues: [], lastDoc: null, hasMore: false };
      }

      // For now, fetch all recent issues and filter client-side.
      // In production, use the userFeed subcollection populated by functions.
      let q;
      const constraints = [
        orderBy("createdAt", "desc"),
        limit(pageSize * 2), // over-fetch
      ];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));
      q = query(collection(db, "issues"), ...constraints);
      const snapshot = await getDocs(q);

      const issues = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((issue) => followedIds.includes(issue.authorId))
        .slice(0, pageSize);

      return {
        issues,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize * 2,
      };
    } catch (error) {
      console.error("[FeedService] Error fetching following feed:", error);
      return { issues: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Get viral issues — issues that hit the viral threshold.
   */
  getViralIssues: async (pageSize = 20, lastDoc = null) => {
    try {
      let q;
      const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));
      q = query(
        collection(db, "issues"),
        orderBy("createdAt", "desc"),
        ...constraints,
      );
      const snapshot = await getDocs(q);

      const viralIssues = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((issue) => issue.isViral === true)
        .slice(0, pageSize);

      return {
        issues: viralIssues,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("[FeedService] Error fetching viral issues:", error);
      return { issues: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Get issues in a specific city.
   */
  getIssuesByCity: async (city, pageSize = 20, lastDoc = null) => {
    if (!city) return { issues: [], lastDoc: null, hasMore: false };
    try {
      let q;
      const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));
      q = query(collection(db, "issues"), ...constraints);
      const snapshot = await getDocs(q);

      const issues = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (issue) => (issue.city || "").toLowerCase() === city.toLowerCase(),
        )
        .slice(0, pageSize);

      return {
        issues,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("[FeedService] Error fetching issues by city:", error);
      return { issues: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Get a user's personal activity feed (their own issues).
   */
  getUserActivityFeed: async (userId, pageSize = 20, lastDoc = null) => {
    if (!userId) return { issues: [], lastDoc: null, hasMore: false };
    try {
      let q;
      const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));
      q = query(collection(db, "issues"), ...constraints);
      const snapshot = await getDocs(q);

      const issues = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((issue) => issue.authorId === userId)
        .slice(0, pageSize);

      return {
        issues,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("[FeedService] Error fetching user activity:", error);
      return { issues: [], lastDoc: null, hasMore: false };
    }
  },
};
