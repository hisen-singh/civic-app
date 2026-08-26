import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { BADGES, getBadgeById } from '../data/badges';

/**
 * AchievementService — handles badge definitions, user badge state,
 * and progress toward unearned badges.
 *
 * Badges are awarded server-side via Cloud Functions (trust score triggers).
 * This client service fetches badge definitions and user badge progress.
 */
export const AchievementService = {
  /**
   * Get all badge definitions (static data).
   */
  getAllBadges: () => BADGES,

  /**
   * Get a single badge definition by ID.
   */
  getBadge: (badgeId) => getBadgeById(badgeId),

  /**
   * Get all badges for a user — their earned badges with award timestamps.
   * Returns array of { ...badgeDefinition, awardedAt, tier }
   */
  getUserBadges: async (userId) => {
    if (!userId) return [];
    try {
      const userBadgesRef = collection(db, 'userBadges', userId, 'badges');
      const snapshot = await getDocs(userBadgesRef);

      const earned = snapshot.docs.map(d => {
        const badgeId = d.id;
        const badgeDef = getBadgeById(badgeId);
        return {
          ...badgeDef,
          awardedAt: d.data().awardedAt,
          tier: d.data().tier || 0,
        };
      });

      return earned;
    } catch (error) {
      console.error('[AchievementService] Error fetching user badges:', error);
      return [];
    }
  },

  /**
   * Get badge progress for a user — all badges (earned and unearned)
   * with current progress toward the next tier.
   */
  getBadgeProgress: async (userId) => {
    if (!userId) return [];
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [];

      const user = userDoc.data();
      const earnedBadges = await AchievementService.getUserBadges(userId);
      const earnedIds = new Set(earnedBadges.map(b => b.id));

      // Compute current values for each criterion type
      const stats = {
        issuesReported: user.issueCount || 0,
        issuesSolved: user.solveCount || 0,
        followerCount: user.followerCount || 0,
        impactScore: user.impactScore || 0,
        viralIssues: user.viralIssues || 0,
        uniqueSolversHelped: user.uniqueSolversHelped || 0,
        transformations: user.transformations || 0,
        consecutiveMonths: user.consecutiveMonths || 0,
      };

      return BADGES.map(badge => {
        const earned = earnedBadges.find(b => b.id === badge.id);
        if (earned) {
          return {
            ...badge,
            earned: true,
            awardedAt: earned.awardedAt,
            tier: earned.tier,
            progress: 1, // 100%
            currentValue: stats[badge.criteria.type] || 0,
            nextTier: badge.tiers[earned.tier] || null,
          };
        }

        // Not earned — compute progress
        const threshold = badge.criteria.threshold || badge.tiers[0] || 1;
        const currentValue = stats[badge.criteria.type] || 0;
        const progress = Math.min(currentValue / threshold, 1);

        return {
          ...badge,
          earned: false,
          awardedAt: null,
          tier: 0,
          progress,
          currentValue,
          nextTier: threshold,
        };
      });
    } catch (error) {
      console.error('[AchievementService] Error computing badge progress:', error);
      return [];
    }
  },

  /**
   * Get recently earned badges (for notification/badge unlock UI).
   */
  getRecentBadges: async (userId, sinceDate) => {
    if (!userId) return [];
    const badges = await AchievementService.getUserBadges(userId);
    return badges.filter(b => {
      if (!b.awardedAt) return false;
      const awarded = new Date(b.awardedAt);
      return awarded >= new Date(sinceDate);
    });
  },
};
