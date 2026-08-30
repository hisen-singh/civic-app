import { useState, useCallback, useRef, useEffect } from "react";
import { View, Animated } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IssueService } from "../services/IssueService";
import { Spacing, theme, Shadows } from "../theme";

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    solved: 0,
    inProgress: 0,
    critical: 0,
    categories: [],
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadData = async () => {
    setLoading(true);
    try {
      const appStats = await IssueService.getAppStats();

      const { total, solved, inProgress, critical, categories } = appStats;

      setStats({ total, solved, inProgress, critical, categories });
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.accentBrand} />
      </View>
    );
  }

  const resolutionRate =
    stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
  const maxCat = stats.categories.length > 0 ? stats.categories[0][1] : 1;

  return (
    <Animated.ScrollView
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        opacity: fadeAnim,
      }}
      contentContainerStyle={{
        padding: Spacing.xl,
        paddingTop: Spacing.headerTop + 24,
        paddingBottom: 100,
      }}
    >
      <View style={{ marginBottom: Spacing.xxl }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "900",
            color: theme.colors.textPrimary,
            letterSpacing: 0.5,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          NEIGHBORHOOD IMPACT
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: theme.colors.textMuted,
            textTransform: "uppercase",
          }}
        >
          Community statistics and issue resolution metrics.
        </Text>
      </View>

      {/* Overview Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <MaterialCommunityIcons
            name="clipboard-text-multiple-outline"
            size={24}
            color={theme.colors.textPrimary}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.cardValue}>{stats.total}</Text>
          <Text style={styles.cardLabel}>Total Issues</Text>
        </View>
        <View style={styles.gridCard}>
          <MaterialCommunityIcons
            name="check-decagram-outline"
            size={24}
            color={theme.colors.accentBrand}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.cardValue}>{stats.solved}</Text>
          <Text style={styles.cardLabel}>Resolved</Text>
        </View>
        <View style={styles.gridCard}>
          <MaterialCommunityIcons
            name="progress-wrench"
            size={24}
            color={theme.colors.accentBrand}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.cardValue}>{stats.inProgress}</Text>
          <Text style={styles.cardLabel}>In Progress</Text>
        </View>
        <View style={styles.gridCard}>
          <MaterialCommunityIcons
            name="chart-pie"
            size={24}
            color={theme.colors.textPrimary}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.cardValue}>{resolutionRate}%</Text>
          <Text style={styles.cardLabel}>Resolution Rate</Text>
        </View>
      </View>

      {/* Category Breakdown (Bar Chart UI) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ISSUES BY CATEGORY</Text>
        <View style={styles.chartContainer}>
          {stats.categories.map(([cat, count]) => {
            const pct = (count / maxCat) * 100;
            return (
              <View key={cat} style={styles.barRow}>
                <Text style={styles.barLabel}>{cat.toUpperCase()}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            );
          })}
          {stats.categories.length === 0 && (
            <Text
              style={{
                color: theme.colors.textMuted,
                textAlign: "center",
                marginVertical: 20,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              No data available
            </Text>
          )}
        </View>
      </View>

      {/* Health Status */}
      <View style={styles.section}>
        <View style={styles.healthCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name={
                stats.critical > 5
                  ? "alert"
                  : resolutionRate > 50
                    ? "shield-check"
                    : "alert-circle-outline"
              }
              size={28}
              color={
                stats.critical > 5 || resolutionRate <= 50
                  ? theme.colors.accentBrand
                  : theme.colors.textPrimary
              }
            />
            <Text style={styles.healthTitle}>
              {stats.critical > 5
                ? "ATTENTION REQUIRED"
                : resolutionRate > 50
                  ? "COMMUNITY IS HEALTHY"
                  : "NEEDS IMPROVEMENT"}
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 13,
              fontWeight: "700",
              lineHeight: 18,
              textTransform: "uppercase",
            }}
          >
            {stats.critical > 5
              ? `There are ${stats.critical} critical issues in the area. Please exercise caution and assist if possible.`
              : resolutionRate > 50
                ? "Your neighborhood is actively resolving issues. Thank you for your contributions!"
                : "There are many open issues. Consider checking the map to see where you can help."}
          </Text>
        </View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = {
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.xxl,
  },
  gridCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: Spacing.lg,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...Shadows.card,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  barLabel: {
    width: 100,
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 0,
    overflow: "hidden",
    marginHorizontal: 12,
  },
  barFill: {
    height: "100%",
    backgroundColor: theme.colors.accentBrand,
    borderRadius: 0,
  },
  barCount: {
    width: 32,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  healthCard: {
    padding: Spacing.xl,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
};
