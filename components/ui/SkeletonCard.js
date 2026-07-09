import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';

/**
 * Shimmering skeleton placeholder that mirrors the IssueCard layout.
 * Shown while the feed is loading to improve perceived performance.
 */
export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.media, { opacity: pulse }]} />
      <View style={styles.content}>
        <View style={styles.authorRow}>
          <Animated.View style={[styles.avatar, { opacity: pulse }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View style={[styles.line, { width: '40%', opacity: pulse }]} />
            <Animated.View style={[styles.line, { width: '25%', opacity: pulse }]} />
          </View>
          <Animated.View style={[styles.badge, { opacity: pulse }]} />
        </View>
        <Animated.View style={[styles.line, { width: '85%', height: 14, marginTop: Spacing.md, opacity: pulse }]} />
        <Animated.View style={[styles.line, { width: '60%', marginTop: 8, opacity: pulse }]} />
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  media: {
    height: 140,
    backgroundColor: Colors.surfaceElevated,
  },
  content: {
    padding: Spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceElevated,
  },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceElevated,
  },
  badge: {
    width: 56,
    height: 20,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  pill: {
    width: 64,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceElevated,
  },
};
