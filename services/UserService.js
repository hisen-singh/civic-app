import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebaseConfig";

const USERS_COLLECTION = "users";

/**
 * UserService — handles user profiles, follow/unfollow, and user search.
 * All follow/suggest actions go through Cloud Functions to maintain
 * follower/following counts and trigger notifications atomically.
 */
export const UserService = {
  /**
   * Get a user's public profile document.
   */
  getUserProfile: async (userId) => {
    if (!userId) return null;
    try {
      const docRef = doc(db, USERS_COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("[UserService] Error fetching user profile:", error);
      return null;
    }
  },

  /**
   * Get a user's public profile by username.
   */
  getUserByUsername: async (username) => {
    if (!username) return null;
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where("usernameLower", "==", username.toLowerCase()),
        limit(1),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() };
      }
      return null;
    } catch (error) {
      console.error("[UserService] Error fetching user by username:", error);
      return null;
    }
  },

  /**
   * Update the current user's profile.
   * Only allows writing to non-computed fields.
   */
  updateProfile: async (userId, data) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      const updates = {};
      if (data.displayName !== undefined)
        updates.displayName = data.displayName;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.city !== undefined) updates.city = data.city;
      if (data.interests !== undefined) updates.interests = data.interests;
      if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
      if (data.username !== undefined) updates.username = data.username;
      if (data.username !== undefined)
        updates.usernameLower = data.username.toLowerCase();

      updates.updatedAt = new Date().toISOString();

      const docRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(docRef, updates);
      return { success: true };
    } catch (error) {
      console.error("[UserService] Error updating profile:", error);
      throw error;
    }
  },

  /**
   * Create or ensure a user document exists after Firebase Auth signup.
   * Called from AuthContext after signup, or lazily on first profile read.
   */
  ensureUserDocument: async (userId, profileData) => {
    try {
      const docRef = doc(db, USERS_COLLECTION, userId);
      const existing = await getDoc(docRef);

      if (!existing.exists()) {
        // Create new user document
        const newUser = {
          displayName: profileData.displayName || "Civic User",
          username: profileData.username || `user${userId.slice(0, 8)}`,
          usernameLower: (
            profileData.username || `user${userId.slice(0, 8)}`
          ).toLowerCase(),
          avatarUrl: null,
          bio: "",
          city: profileData.city || "",
          interests: profileData.interests || [],
          createdAt: new Date().toISOString(),
          followerCount: 0,
          followingCount: 0,
          issueCount: 0,
          solveCount: 0,
          impactScore: 0,
          rank: 0,
          badges: [],
          isAdmin: false,
          isVerified: false,
          // Social counts for badges
          issuesReported: 0,
          issuesSolved: 0,
          viralIssues: 0,
          uniqueSolversHelped: 0,
          transformations: 0,
        };
        await setDoc(docRef, newUser);
        return { id: userId, ...newUser };
      }
      return { id: existing.id, ...existing.data() };
    } catch (error) {
      console.error("[UserService] Error ensuring user document:", error);
      throw error;
    }
  },

  /**
   * Follow a user (via Cloud Function for atomic count updates).
   */
  followUser: async (targetUid) => {
    if (!targetUid) throw new Error("Target user ID required");
    try {
      const followUser = httpsCallable(functions, "followUser");
      const result = await followUser({ targetUid });
      return result.data;
    } catch (error) {
      console.error("[UserService] Error following user:", error);
      throw error;
    }
  },

  /**
   * Unfollow a user.
   */
  unfollowUser: async (targetUid) => {
    if (!targetUid) throw new Error("Target user ID required");
    try {
      const unfollowUser = httpsCallable(functions, "unfollowUser");
      const result = await unfollowUser({ targetUid });
      return result.data;
    } catch (error) {
      console.error("[UserService] Error unfollowing user:", error);
      throw error;
    }
  },

  /**
   * Get a paginated list of a user's followers.
   * Returns follower user objects (public info only).
   */
  getFollowers: async (userId, pageSize = 20, lastDoc = null) => {
    if (!userId) return { users: [], lastDoc: null, hasMore: false };
    try {
      const followersRef = collection(
        db,
        USERS_COLLECTION,
        userId,
        "followers",
      );
      let q;
      if (lastDoc) {
        q = query(
          followersRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize),
        );
      } else {
        q = query(followersRef, orderBy("createdAt", "desc"), limit(pageSize));
      }
      const snapshot = await getDocs(q);

      // Fetch each follower's public profile
      const userIds = snapshot.docs.map((d) => d.id);
      const users = [];
      for (const uid of userIds) {
        const profile = await UserService.getUserProfile(uid);
        if (profile) users.push(profile);
      }

      return {
        users,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("[UserService] Error fetching followers:", error);
      return { users: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Get a paginated list of users a person is following.
   */
  getFollowing: async (userId, pageSize = 20, lastDoc = null) => {
    if (!userId) return { users: [], lastDoc: null, hasMore: false };
    try {
      const followingRef = collection(
        db,
        USERS_COLLECTION,
        userId,
        "following",
      );
      let q;
      if (lastDoc) {
        q = query(
          followingRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize),
        );
      } else {
        q = query(followingRef, orderBy("createdAt", "desc"), limit(pageSize));
      }
      const snapshot = await getDocs(q);

      const userIds = snapshot.docs.map((d) => d.id);
      const users = [];
      for (const uid of userIds) {
        const profile = await UserService.getUserProfile(uid);
        if (profile) users.push(profile);
      }

      return {
        users,
        lastDoc:
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("[UserService] Error fetching following:", error);
      return { users: [], lastDoc: null, hasMore: false };
    }
  },

  /**
   * Check if the current user follows another user.
   * Checks by trying to read the followers subcollection doc.
   */
  isFollowing: async (currentUserId, targetUserId) => {
    if (!currentUserId || !targetUserId) return false;
    try {
      const docRef = doc(
        db,
        USERS_COLLECTION,
        targetUserId,
        "followers",
        currentUserId,
      );
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (error) {
      return false;
    }
  },

  /**
   * Search users by display name or username (client-side filter).
   * For production, replace with Algolia or server-side query.
   */
  searchUsers: async (query, pageSize = 20) => {
    if (!query || query.length < 2) return [];
    try {
      // Firestore can't do startsWith, so we fetch recent users and filter client-side.
      // Replace with Algolia for production scale.
      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy("displayName"),
        limit(pageSize * 3), // over-fetch to account for filtering
      );
      const snapshot = await getDocs(q);
      const lowerQuery = query.toLowerCase();
      return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (u) =>
            (u.displayName || "").toLowerCase().includes(lowerQuery) ||
            (u.username || "").toLowerCase().includes(lowerQuery) ||
            (u.city || "").toLowerCase().includes(lowerQuery),
        )
        .slice(0, pageSize);
    } catch (error) {
      console.error("[UserService] Error searching users:", error);
      return [];
    }
  },

  /**
   * Get suggested users to follow (people with high impact scores in same city
   * or top trending users, excluding already-followed).
   * Returns array of user profiles.
   */
  getSuggestedUsers: async (currentUserId, city, pageSize = 10) => {
    if (!currentUserId) return [];
    try {
      let q;
      if (city) {
        q = query(
          collection(db, USERS_COLLECTION),
          where("city", "==", city),
          orderBy("impactScore", "desc"),
          limit(pageSize * 2),
        );
      } else {
        q = query(
          collection(db, USERS_COLLECTION),
          orderBy("impactScore", "desc"),
          limit(pageSize * 2),
        );
      }
      const snapshot = await getDocs(q);

      // Fetch who's already followed
      const followingRef = collection(
        db,
        USERS_COLLECTION,
        currentUserId,
        "following",
      );
      const followingSnap = await getDocs(followingRef);
      const followingIds = new Set(followingSnap.docs.map((d) => d.id));

      const suggestions = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== currentUserId && !followingIds.has(u.id))
        .slice(0, pageSize);

      return suggestions;
    } catch (error) {
      console.error("[UserService] Error getting suggestions:", error);
      return [];
    }
  },
};
