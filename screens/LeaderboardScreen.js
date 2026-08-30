import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { IssueService } from "../services/IssueService";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import IssueCard from "../components/IssueCard";
import { Spacing, theme } from "../theme";

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [trendingIssues, setTrendingIssues] = useState([]);
  const [activeTab, setActiveTab] = useState("heroes");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, activeTab]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (
        leaderboard.length === 0 &&
        trendingIssues.length === 0 &&
        !isRefresh
      ) {
        setLoading(true);
      }
      try {
        const allIssues = await IssueService.getAllIssues(isRefresh);

        const userMap = {};
        allIssues.forEach((issue) => {
          const reporterId = issue.authorId;
          if (reporterId && reporterId !== "anonymous") {
            if (!userMap[reporterId]) {
              userMap[reporterId] = {
                id: reporterId,
                name: issue.authorName || "Unknown",
                reported: 0,
                supported: 0,
                solved: 0,
              };
            }
            userMap[reporterId].reported += 1;
            if (issue.authorName) userMap[reporterId].name = issue.authorName;
          }
          (issue.solvers || []).forEach((solverId) => {
            if (!userMap[solverId]) {
              userMap[solverId] = {
                id: solverId,
                name: solverId,
                reported: 0,
                supported: 0,
                solved: 0,
              };
            }
            userMap[solverId].supported += 1;
            if (issue.status === "Solved") {
              userMap[solverId].solved += 1;
            }
          });
        });

        const ranked = Object.values(userMap).map((u) => {
          const score = u.reported * 50 + u.supported * 30 + u.solved * 100;
          const isCurrentUser = u.id === user?.uid;
          let title = "Participant";
          if (score >= 500) title = "Community Lead";
          else if (score >= 300) title = "Local Coordinator";
          else if (score >= 150) title = "Verified Contributor";
          else if (score >= 50) title = "Active Member";

          return {
            ...u,
            score,
            title,
            isCurrentUser,
            name: isCurrentUser ? u.name + " (You)" : u.name,
          };
        });
        ranked.sort((a, b) => b.score - a.score);
        setLeaderboard(ranked);

        const rankedIssues = [...allIssues]
          .map((issue) => {
            const score =
              (issue.solvers?.length || 0) * 10 +
              (issue.comments?.length || 0) * 5 +
              (issue.votes || 0) * 2;
            return { ...issue, trendingScore: score };
          })
          .sort((a, b) => b.trendingScore - a.trendingScore);
        setTrendingIssues(rankedIssues);
      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const getMedalStyle = (rank) => {
    if (rank === 1)
      return {
        bg: "transparent",
        border: theme.colors.accentBrand,
        color: theme.colors.accentBrand,
        icon: "crown",
      };
    if (rank === 2)
      return {
        bg: "transparent",
        border: theme.colors.border,
        color: theme.colors.textPrimary,
        icon: "medal",
      };
    if (rank === 3)
      return {
        bg: "transparent",
        border: theme.colors.border,
        color: theme.colors.textPrimary,
        icon: "medal-outline",
      };
    return null;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accentBrand}
          colors={[theme.colors.accentBrand]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMUNITY IMPACT</Text>
        <Text style={styles.headerSub}>RECOGNIZING ACTIVE CONTRIBUTORS</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "heroes" && styles.tabActive]}
            onPress={() => setActiveTab("heroes")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="account-star-outline"
              size={16}
              color={activeTab === "heroes" ? "#FFF" : theme.colors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "heroes" && styles.tabTextActive,
              ]}
            >
              CONTRIBUTORS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "problems" && styles.tabActive]}
            onPress={() => setActiveTab("problems")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="trending-up"
              size={16}
              color={
                activeTab === "problems" ? "#FFF" : theme.colors.textPrimary
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "problems" && styles.tabTextActive,
              ]}
            >
              TRENDING
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={{
          paddingVertical: Spacing.xxl,
          paddingBottom: 100,
          opacity: fadeAnim,
        }}
      >
        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <ActivityIndicator
              animating={true}
              color={theme.colors.accentBrand}
              size="large"
            />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: 13,
                marginTop: 12,
              }}
            >
              LOADING DATA...
            </Text>
          </View>
        ) : activeTab === "heroes" ? (
          leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={32}
                  color={theme.colors.textPrimary}
                />
              </View>
              <Text style={styles.emptyTitle}>NO CONTRIBUTORS YET</Text>
              <Text style={styles.emptyDesc}>
                HELP RESOLVE A COMMUNITY ISSUE TO APPEAR HERE.
              </Text>
            </View>
          ) : (
            <>
              {leaderboard.length >= 3 && (
                <View style={styles.podiumRow}>
                  {[1, 0, 2].map((podiumIdx) => {
                    const person = leaderboard[podiumIdx];
                    if (!person) return null;
                    const rank = podiumIdx + 1;
                    const medal = getMedalStyle(rank);
                    const isCenter = podiumIdx === 0;
                    return (
                      <View
                        key={person.id}
                        style={[
                          styles.podiumCard,
                          isCenter && styles.podiumCardCenter,
                        ]}
                      >
                        <View
                          style={[
                            styles.podiumAvatar,
                            { borderColor: medal.color, borderWidth: 2 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.podiumInitials,
                              { color: medal.color },
                            ]}
                          >
                            {(person.name || "U").substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.podiumRankBadge,
                            {
                              backgroundColor: medal.bg,
                              borderColor: medal.border,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={medal.icon}
                            size={12}
                            color={medal.color}
                          />
                        </View>
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {person.name?.split(" ")[0] || "User"}
                        </Text>
                        <Text
                          style={[styles.podiumScore, { color: medal.color }]}
                        >
                          {person.score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {leaderboard.map((person, index) => {
                if (index < 3 && leaderboard.length >= 3) return null;
                const rank = index + 1;
                const highlight = person.isCurrentUser;

                return (
                  <View
                    key={person.id}
                    style={[
                      styles.rankCard,
                      highlight && styles.rankCardHighlight,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankNumberPlain}>#{rank}</Text>
                    </View>

                    <View style={styles.rankAvatar}>
                      <Text style={styles.rankAvatarText}>
                        {(person.name || "U").substring(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.personName,
                          highlight && { color: theme.colors.accentBrand },
                        ]}
                      >
                        {person.name}
                      </Text>
                      <Text style={styles.personTitle}>{person.title}</Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.score,
                          highlight && { color: theme.colors.textPrimary },
                        ]}
                      >
                        {person.score}
                      </Text>
                      <Text style={styles.scoreLabel}>IMPACT</Text>
                    </View>
                  </View>
                );
              })}

              {leaderboard.length > 0 &&
                !leaderboard.some((p) => p.isCurrentUser) && (
                  <View style={styles.yourPosition}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color={theme.colors.textPrimary}
                    />
                    <Text style={styles.yourPositionText}>
                      START CONTRIBUTING TO SEE YOUR RANKING HERE!
                    </Text>
                  </View>
                )}
            </>
          )
        ) : trendingIssues.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="trending-neutral"
                size={32}
                color={theme.colors.textPrimary}
              />
            </View>
            <Text style={styles.emptyTitle}>NO TRENDING ISSUES</Text>
            <Text style={styles.emptyDesc}>
              REPORTS WITH COMMUNITY ENGAGEMENT WILL APPEAR HERE.
            </Text>
          </View>
        ) : (
          trendingIssues.slice(0, 10).map((issue, index) => (
            <View key={issue.id}>
              {index === 0 && (
                <View style={styles.trendingLabel}>
                  <MaterialCommunityIcons
                    name="fire"
                    size={14}
                    color={theme.colors.accentBrand}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.trendingLabelText}>
                    MOST COMMUNITY ENGAGEMENT
                  </Text>
                </View>
              )}
              <IssueCard issue={issue} />
            </View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = {
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: Spacing.xl,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  tabActive: {
    backgroundColor: theme.colors.accentBrand,
  },
  tabText: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#FFF",
  },
  // Podium
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  podiumCard: {
    alignItems: "center",
    flex: 1,
    paddingVertical: Spacing.lg,
  },
  podiumCardCenter: {
    marginTop: -12,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  podiumInitials: {
    fontSize: 16,
    fontWeight: "900",
  },
  podiumRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 0,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -12,
    marginBottom: 6,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  podiumScore: {
    fontSize: 16,
    fontWeight: "900",
  },
  // Rank Cards
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  rankCardHighlight: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accentBrand,
    borderWidth: 2,
  },
  rankBadge: {
    width: 36,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rankAvatarText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  rankNumberPlain: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  personName: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  personTitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  score: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.accentBrand,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  yourPosition: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  yourPositionText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    fontWeight: "700",
  },
  trendingLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  trendingLabelText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.accentBrand,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
};
