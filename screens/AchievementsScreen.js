import { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated } from "react-native";
import { Colors, Spacing, Radius, Typography } from "../theme";
import { AchievementService } from "../services/AchievementService";
import { useAuth } from "../contexts/AuthContext";

export default function AchievementsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    loadBadges();
  }, []);

  const loadBadges = async () => {
    if (!user) return;
    try {
      const progress = await AchievementService.getBadgeProgress(user.uid);
      setBadges(progress);
    } catch (err) {
      console.error("[AchievementsScreen] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);
  const nextBadge = lockedBadges.find((b) => b.progress > 0);

  const renderBadge = ({ item }) => (
    <View
      style={[
        styles.badgeCard,
        item.earned ? styles.badgeEarned : styles.badgeLocked,
      ]}
    >
      <View
        style={[
          styles.badgeIconWrap,
          { backgroundColor: item.bg || "rgba(99,102,241,0.15)" },
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={32}
          color={item.earned ? item.color : Colors.textTertiary}
        />
        {!item.earned && (
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={14}
              color={Colors.textTertiary}
            />
          </View>
        )}
      </View>
      <Text style={[styles.badgeName, !item.earned && styles.badgeNameLocked]}>
        {item.name}
      </Text>
      <Text style={styles.badgeDesc}>{item.description}</Text>

      {!item.earned && item.nextTier && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round((item.progress || 0) * 100)}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.currentValue || 0} / {item.nextTier}
          </Text>
        </View>
      )}
      {item.earned && item.tier > 0 && (
        <View style={[styles.tierBadge, { backgroundColor: item.color }]}>
          <Text style={styles.tierText}>★ Tier {item.tier}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        renderItem={renderBadge}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{earnedBadges.length}</Text>
                <Text style={styles.summaryLabel}>Earned</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>
                  {badges.length - earnedBadges.length}
                </Text>
                <Text style={styles.summaryLabel}>Locked</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>
                  {Math.round(
                    (earnedBadges.length / (badges.length || 1)) * 100,
                  )}
                  %
                </Text>
                <Text style={styles.summaryLabel}>Complete</Text>
              </View>
            </View>
            {nextBadge && (
              <View style={styles.nextUp}>
                <Text style={styles.nextUpLabel}>Next up:</Text>
                <Text style={styles.nextUpName}>{nextBadge.name}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={{ marginTop: 80 }}
              color={Colors.accent}
            />
          ) : null
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryStat: { alignItems: "center", flex: 1 },
  summaryNumber: { ...Typography.displayMedium, color: Colors.accent },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  nextUp: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  nextUpLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginRight: 8,
  },
  nextUpName: { ...Typography.subtitle, color: Colors.textPrimary },
  row: { paddingHorizontal: Spacing.md },
  badgeCard: {
    flex: 1,
    margin: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: "center",
    minHeight: 160,
    justifyContent: "center",
  },
  badgeEarned: { borderWidth: 1, borderColor: Colors.accent },
  badgeLocked: { opacity: 0.6 },
  badgeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    position: "relative",
  },
  lockOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  badgeName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  badgeNameLocked: { color: Colors.textTertiary },
  badgeDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  progressContainer: { marginTop: Spacing.sm, width: "100%" },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: "center",
  },
  tierBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tierText: { ...Typography.overline, color: "#FFF", fontSize: 9 },
});
