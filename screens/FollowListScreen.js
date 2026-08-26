import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserService } from "../services/UserService";
import { useAuth } from "../contexts/AuthContext";
import { Colors, Spacing, Radius, Typography } from "../theme";

export default function FollowListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { userId, listType } = route.params; // listType: 'followers' | 'following'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadUsers(true);
  }, [userId, listType]);

  const loadUsers = async (isRefresh = false) => {
    if (!isRefresh && !hasMore) return;
    if (isRefresh) setLoading(true);
    else setLoadingMore(true);

    try {
      const result =
        listType === "followers"
          ? await UserService.getFollowers(
              userId,
              20,
              isRefresh ? null : lastDoc,
            )
          : await UserService.getFollowing(
              userId,
              20,
              isRefresh ? null : lastDoc,
            );

      setUsers((prev) =>
        isRefresh ? result.users : [...prev, ...result.users],
      );
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("[FollowListScreen] Error loading users:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => {
        // TODO(phase-03): implement UserProfileScreen
        console.warn('[FollowListScreen] UserProfile route not available yet');
      }}
      activeOpacity={1}
    >
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={Colors.textSecondary}
            />
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>
          {item.displayName || "Civic User"}
        </Text>
        <Text style={styles.username}>
          @{item.username || item.id.slice(0, 8)}
        </Text>
        {item.city && <Text style={styles.city}>{item.city}</Text>}
      </View>
      <View style={styles.stats}>
        <Text style={styles.statNumber}>{item.followerCount || 0}</Text>
        <Text style={styles.statLabel}>followers</Text>
      </View>
    </TouchableOpacity>
  );

  const isOwnProfile = user?.uid === userId;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        onEndReached={() => hasMore && loadUsers(false)}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <Text style={styles.header}>
            {listType === "followers"
              ? `${users.length} Followers`
              : `Following ${users.length}`}
          </Text>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyText}>
                {listType === "followers"
                  ? "No followers yet"
                  : "Not following anyone yet"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={{ marginVertical: 16 }}
              color={Colors.accent}
            />
          ) : null
        }
      />
    </Animated.View>
  );
}

import { Animated } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: { marginRight: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1 },
  displayName: { ...Typography.subtitle, color: Colors.textPrimary },
  username: { ...Typography.caption, color: Colors.textSecondary },
  city: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  stats: { alignItems: "flex-end" },
  statNumber: { ...Typography.subtitle, color: Colors.textPrimary },
  statLabel: { ...Typography.caption, color: Colors.textTertiary },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});
