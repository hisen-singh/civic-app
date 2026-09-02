import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { theme, Spacing } from "../../theme";

/**
 * Shimmering skeleton placeholder that mirrors the IssueCard layout.
 * Shown while the feed is loading to improve perceived performance.
 */
export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.media, { opacity: pulse }]} />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Animated.View style={[styles.line, { width: "25%", opacity: pulse }]} />
          <Animated.View style={[styles.line, { width: "15%", opacity: pulse }]} />
        </View>
        <Animated.View
          style={[styles.line, { width: "85%", height: 14, marginTop: 12, opacity: pulse }]}
        />
        <Animated.View
          style={[styles.line, { width: "60%", height: 14, marginTop: 8, opacity: pulse }]}
        />
        <View style={styles.authorRow}>
          <Animated.View style={[styles.avatar, { opacity: pulse }]} />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Animated.View
              style={[styles.line, { width: "50%", opacity: pulse }]}
            />
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Animated.View style={[styles.pill, { opacity: pulse }]} />
          <Animated.View style={[styles.pill, { opacity: pulse }]} />
          <Animated.View style={[styles.pill, { opacity: pulse }]} />
        </View>
      </View>
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: theme.colors.background,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingBottom: Spacing.md,
  },
  media: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surfaceElevated,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
  },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceElevated,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  pill: {
    width: 48,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
};
