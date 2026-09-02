import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import IssueCard from "../components/IssueCard";
import FilterPills from "../components/ui/FilterPills";
import AnimatedPressable from "../components/ui/AnimatedPressable";
import { IssueService } from "../services/IssueService";
import { useAuth } from "../contexts/AuthContext";
import { Spacing, theme } from "../theme";

const DIFFICULTY_MAP = {
  critical: {
    label: "Hard",
    color: theme.colors.accentBrand,
    xp: 200,
    icon: "fire",
  },
  high: {
    label: "Hard",
    color: theme.colors.accentBrand,
    xp: 150,
    icon: "alert-circle",
  },
  medium: {
    label: "Medium",
    color: theme.colors.textPrimary,
    xp: 100,
    icon: "alert",
  },
  low: {
    label: "Easy",
    color: theme.colors.textMuted,
    xp: 50,
    icon: "check-circle",
  },
};

const CATEGORY_FILTERS = [
  { id: "All", label: "All Tasks", icon: "view-grid-outline" },
  { id: "Nearby", label: "Nearby", icon: "map-marker-radius-outline" },
  { id: "Easy", label: "Easy Wins", icon: "lightning-bolt" },
  { id: "Critical", label: "Urgent", icon: "alert-octagon-outline" },
];

export default function SolveScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [solvedCount, setSolvedCount] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(statsSlide, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(headerScale, {
          toValue: 1,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const fetchIssues = async (isRefresh = false) => {
    try {
      const allIssuesRaw = await IssueService.getAllIssues(isRefresh);
      const allIssues = allIssuesRaw.filter((issue) => {
        let isIndia = false;
        if (issue.latitude && issue.longitude) {
          if (
            issue.latitude >= 8.0 &&
            issue.latitude <= 38.0 &&
            issue.longitude >= 68.0 &&
            issue.longitude <= 98.0
          ) {
            isIndia = true;
          }
        } else if (issue.location) {
          const locLower = issue.location.toLowerCase();
          const isUS =
            locLower.includes("ave") ||
            locLower.includes("st") ||
            locLower.includes("chicago") ||
            locLower.includes("il");
          if (!isUS) {
            isIndia = true;
          }
        }

        const authorName = issue.authorName || "";
        if (
          authorName.toLowerCase().includes("city") ||
          authorName.toLowerCase().includes("open data")
        ) {
          isIndia = false;
        }
        return isIndia;
      });
      const uid = user?.uid;

      // Issues available to solve: not authored by user, not solved/failed
      const solveable = allIssues.filter(
        (i) =>
          i.authorId !== uid && i.status !== "Solved" && i.status !== "Failed",
      );

      // Compute user's solve stats
      const mySolves = allIssues.filter(
        (i) => (i.solvers || []).includes(uid) && i.status === "Solved",
      );
      const myActive = allIssues.filter(
        (i) => (i.solvers || []).includes(uid) && i.status === "In Progress",
      );

      setSolvedCount(mySolves.length);
      setTotalXP(mySolves.length * 100 + myActive.length * 30);

      // Calculate streak (consecutive days with a solve, starting from today)
      const today = new Date();
      let streak = 0;
      for (let d = 0; d < 7; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - d);
        const dateStr = checkDate.toISOString().split("T")[0];
        const hasSolveOnDay = mySolves.some((i) => {
          if (!i.createdAt) return false;
          return i.createdAt.startsWith(dateStr);
        });
        if (hasSolveOnDay) {
          streak++;
        } else {
          break;
        }
      }
      setActiveStreak(streak);

      setIssues(solveable);
    } catch (e) {
      console.error("SolveScreen fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fadeAnim.setValue(0);
      statsSlide.setValue(30);
      headerScale.setValue(0.95);
      fetchIssues();
    }, [user]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIssues(true);
  }, [user]);

  // Apply client-side filter
  const filteredIssues = issues.filter((issue) => {
    if (selectedFilter === "Easy") {
      return issue.urgency === "low" || issue.urgency === "medium";
    }
    if (selectedFilter === "Critical") {
      return issue.urgency === "critical" || issue.urgency === "high";
    }
    if (selectedFilter === "Nearby") {
      return issue.latitude && issue.longitude;
    }
    return true;
  });

  // Sort: critical first, then by votes
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aOrder = urgencyOrder[a.urgency] ?? 2;
    const bOrder = urgencyOrder[b.urgency] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.votes || 0) - (a.votes || 0);
  });

  const getDifficulty = (urgency) =>
    DIFFICULTY_MAP[urgency] || DIFFICULTY_MAP.medium;

  const urgentTaskCount = issues.filter(
    (i) => i.urgency === "critical" || i.urgency === "high",
  ).length;

  const filterItems = CATEGORY_FILTERS.map((f) => ({
    ...f,
    badge: f.id === "Critical" ? urgentTaskCount : undefined,
  }));

  const renderStatsHeader = () => (
    <Animated.View
      style={[
        styles.statsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: statsSlide }, { scale: headerScale }],
        },
      ]}
    >
      {/* Hero Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={20}
              color={theme.colors.accentBrand}
            />
          </View>
          <Text style={styles.statValue}>{solvedCount}</Text>
          <Text style={styles.statLabel}>Solved</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons
              name="fire"
              size={20}
              color={theme.colors.accentBrand}
            />
          </View>
          <Text style={styles.statValue}>{activeStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={20}
              color={theme.colors.accentBrand}
            />
          </View>
          <Text style={styles.statValue}>{totalXP}</Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>
      </View>

      <FilterPills
        items={filterItems}
        selected={selectedFilter}
        onSelect={setSelectedFilter}
        contentStyle={{ paddingBottom: Spacing.sm }}
      />

      {/* Task count summary */}
      <View style={styles.taskCountRow}>
        <Text style={styles.taskCountText}>
          {sortedIssues.length} {sortedIssues.length === 1 ? "task" : "tasks"}{" "}
          available
        </Text>
        <View style={styles.xpPreviewChip}>
          <MaterialCommunityIcons
            name="star-four-points"
            size={12}
            color={theme.colors.accentBrand}
          />
          <Text style={styles.xpPreviewText}>
            Up to{" "}
            {sortedIssues.reduce(
              (sum, i) => sum + getDifficulty(i.urgency).xp,
              0,
            )}{" "}
            XP
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderIssueWithReward = ({ item }) => {
    const difficulty = getDifficulty(item.urgency);
    const solverCount = (item.solvers || []).length;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* XP + Difficulty Banner */}
        <View style={styles.rewardBanner}>
          <View style={styles.rewardLeft}>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficulty.color + "20" },
              ]}
            >
              <MaterialCommunityIcons
                name={difficulty.icon}
                size={12}
                color={difficulty.color}
              />
              <Text
                style={[styles.difficultyText, { color: difficulty.color }]}
              >
                {difficulty.label}
              </Text>
            </View>
            {solverCount > 0 && (
              <View style={styles.solversBadge}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.solversText}>{solverCount} helping</Text>
              </View>
            )}
          </View>
          <View style={styles.xpBadge}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={12}
              color={theme.colors.accentBrand}
            />
            <Text style={styles.xpText}>+{difficulty.xp} XP</Text>
          </View>
        </View>
        <IssueCard issue={item} />
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            animating={true}
            color={theme.colors.accentBrand}
            size="large"
          />
          <Text style={styles.loadingText}>Finding tasks for you...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={40}
            color={theme.colors.accentBrand}
          />
        </View>
        <Text style={styles.emptyTitle}>All Clear! 🎉</Text>
        <Text style={styles.emptyDesc}>
          {selectedFilter !== "All"
            ? `No ${CATEGORY_FILTERS.find((f) => f.id === selectedFilter)?.label.toLowerCase()} tasks right now. Try another filter.`
            : "No open issues need solving right now. Your community is thriving!"}
        </Text>
        {selectedFilter !== "All" && (
          <TouchableOpacity
            onPress={() => setSelectedFilter("All")}
            activeOpacity={0.7}
            style={styles.emptyAction}
          >
            <Text style={styles.emptyActionText}>Show All Tasks</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.surface}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { maxWidth: 800, alignSelf: "center", width: "100%" },
        ]}
      >
        <View>
          <Text style={styles.headerTitle}>SOLVE</Text>
          <Text style={styles.headerSub}>Help your community, earn impact</Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate("Notifications")}
          activeScale={0.92}
        >
          <View style={styles.headerBtn}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </View>
        </AnimatedPressable>
      </View>

      <FlatList
        data={sortedIssues}
        keyExtractor={(item) => item.id}
        renderItem={renderIssueWithReward}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
          maxWidth: 800,
          alignSelf: "center",
          width: "100%",
        }}
        ListHeaderComponent={renderStatsHeader}
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={5}
        windowSize={10}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentBrand}
            colors={[theme.colors.accentBrand]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      />
    </View>
  );
}

const styles = {
  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: theme.type?.display?.fontFamily,
    fontWeight: theme.type?.display?.fontWeight,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  headerBtn: {
    padding: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Stats Section
  statsSection: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: Spacing.lg,
    alignItems: "center",
    marginHorizontal: 4,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  statCardAccent: {
    borderColor: theme.colors.accentBrand,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Filter Chips
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 0,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accentBrand,
  },
  filterText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFF",
  },
  filterBadge: {
    backgroundColor: theme.colors.accentBrand,
    borderRadius: 0,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },

  // Task count
  taskCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  taskCountText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  xpPreviewChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  xpPreviewText: {
    fontSize: 11,
    color: theme.colors.accentBrand,
    fontWeight: "800",
    marginLeft: 4,
  },

  // Reward Banner (per issue)
  rewardBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 4,
  },
  rewardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  solversBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  solversText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 4,
    fontWeight: "700",
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  xpText: {
    fontSize: 11,
    color: theme.colors.accentBrand,
    fontWeight: "800",
    marginLeft: 4,
  },

  // Loading / Empty
  loadingContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: Spacing.xl,
    backgroundColor: theme.colors.accentBrand,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
  },
  emptyActionText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
};
