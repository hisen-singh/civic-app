/**
 * Civic — Achievement Badge Definitions
 * 12 badges with tiers, criteria, and icons.
 */

export const BADGES = [
  {
    id: "first_report",
    name: "First Report",
    description: "Reported your first civic issue",
    icon: "flag-outline",
    category: "reporting",
    color: "#6366F1",
    bg: "rgba(99, 102, 241, 0.15)",
    tiers: [1],
    criteria: { type: "issues_reported", threshold: 1 },
  },
  {
    id: "problem_solver",
    name: "Problem Solver",
    description: "Got your first issue marked as Solved",
    icon: "check-circle-outline",
    category: "solving",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
    tiers: [1, 5, 10],
    criteria: { type: "issues_solved", threshold: 1 },
  },
  {
    id: "community_hero",
    name: "Community Hero",
    description: "10 issues solved by the community",
    icon: "shield-star-outline",
    category: "solving",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.15)",
    tiers: [10, 50, 100],
    criteria: { type: "issues_solved", threshold: 10 },
  },
  {
    id: "viral_voice",
    name: "Viral Voice",
    description: "An issue you reported reached 50+ votes",
    icon: "trend-up",
    category: "virality",
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.15)",
    tiers: [1],
    criteria: { type: "viral_issues", threshold: 1 },
  },
  {
    id: "follower",
    name: "Follower",
    description: "People are starting to follow you",
    icon: "account-multiple-outline",
    category: "social",
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.15)",
    tiers: [10, 50, 100],
    criteria: { type: "follower_count", threshold: 10 },
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "You have 100 followers — a real voice in your community",
    icon: "megaphone-outline",
    category: "social",
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.15)",
    tiers: [100, 500, 1000],
    criteria: { type: "follower_count", threshold: 100 },
  },
  {
    id: "city_leader",
    name: "Voice of the City",
    description: "Rank #1 in your city leaderboard",
    icon: "map-marker-star-outline",
    category: "ranking",
    color: "#F97316",
    bg: "rgba(249, 115, 22, 0.15)",
    tiers: [1],
    criteria: { type: "city_rank", threshold: 1 },
  },
  {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Joined Civic during its beta period",
    icon: "rocket-launch-outline",
    category: "special",
    color: "#EC4899",
    bg: "rgba(236, 72, 153, 0.15)",
    tiers: [1],
    criteria: { type: "account_age", threshold: null }, // date-based, set in user profile
    deadline: "2026-06-01", // Must join before this date
  },
  {
    id: "helping_hand",
    name: "Helping Hand",
    description: "Helped 5 different users solve their issues",
    icon: "hand-heart-outline",
    category: "helping",
    color: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.15)",
    tiers: [5, 25, 50],
    criteria: { type: "unique_solvers_helped", threshold: 5 },
  },
  {
    id: "consistent_reporter",
    name: "Consistent Reporter",
    description: "Reported at least 1 issue per month for 3 consecutive months",
    icon: "calendar-check-outline",
    category: "reporting",
    color: "#84CC16",
    bg: "rgba(132, 204, 22, 0.15)",
    tiers: [3, 6, 12],
    criteria: { type: "consecutive_months", threshold: 3 },
  },
  {
    id: "transformation_agent",
    name: "Transformation Agent",
    description: "Submitted before & after photos on 5 solved issues",
    icon: "image-filter-drama-outline",
    category: "documentation",
    color: "#A855F7",
    bg: "rgba(168, 85, 247, 0.15)",
    tiers: [5, 15, 30],
    criteria: { type: "transformations", threshold: 5 },
  },
  {
    id: "impact_maker",
    name: "Impact Maker",
    description: "Reached 1000 impact points",
    icon: "lightning-bolt-outline",
    category: "impact",
    color: "#FBBF24",
    bg: "rgba(251, 191, 36, 0.15)",
    tiers: [1000, 5000, 10000],
    criteria: { type: "impact_score", threshold: 1000 },
  },
];

/** Get badge by ID */
export const getBadgeById = (id) => BADGES.find((b) => b.id === id) || null;

/** Get all badges in a category */
export const getBadgesByCategory = (category) =>
  BADGES.filter((b) => b.category === category);

/** Get tier label for a badge at a given tier index */
export const getTierLabel = (badge, tierIndex) => {
  if (badge.tiers.length === 1) return "";
  const labels = ["", "Bronze", "Silver", "Gold"];
  return labels[tierIndex] || `Tier ${tierIndex}`;
};

/** Map tier index to point value for tiered badges */
export const getTierThreshold = (badge, tierIndex) => {
  return badge.tiers[tierIndex] || badge.tiers[0];
};
