import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dimensions,
  View,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text, ActivityIndicator } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { AuthService } from "../services/AuthService";
import { useAuth } from "../contexts/AuthContext";
import { IssueService } from "../services/IssueService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedPressable from "../components/ui/AnimatedPressable";
import LoginOverlay from "../components/LoginOverlay";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { theme, Spacing } from "../theme";
import IssueCard from "../components/IssueCard";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    reported: 0,
    supported: 0,
    solved: 0,
    rank: "-",
    badges: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const [myIssues, setMyIssues] = useState([]);
  const [savedIssues, setSavedIssues] = useState([]);
  const [activeTab, setActiveTab] = useState("reports");
  const scrollViewRef = useRef(null);
  const [reportsY, setReportsY] = useState(0);

  const scrollToReports = () => {
    if (scrollViewRef.current && reportsY > 0) {
      scrollViewRef.current.scrollTo({ y: reportsY - 20, animated: true });
    }
  };

  const loadMyIssues = async () => {
    if (!user) return;
    try {
      const allIssues = await IssueService.getAllIssues(true);
      const filtered = allIssues.filter((i) => i.authorId === user.uid);
      setMyIssues(filtered);

      const { UserService } = require("../services/UserService");
      const savedIds = await UserService.getSavedIssues(user.uid);
      const saved = allIssues.filter(i => savedIds.includes(i.id));
      saved.sort((a, b) => savedIds.indexOf(a.id) - savedIds.indexOf(b.id));
      setSavedIssues(saved);
    } catch (e) {
      console.warn("Failed to load user issues:", e);
    }
  };

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadStats = async (isRefresh = false) => {
    // Guest Guard: Prevent undefined query crashes
    if (!user) {
      setLoading(false);
      return;
    }

    // Only show full loading screen on initial load
    if (!isRefresh && stats.reported === 0 && stats.supported === 0) {
      setLoading(true);
    }
    try {
      const uid = user?.uid;

      // Get user stats directly from server count aggregates
      const userStats = await IssueService.getUserStats(uid);
      const { reported, supported, solved, roadsSolved, ecoSolved } = userStats;

      // Get rank from user profile (updated via cron)
      let rank = "-";
      try {
        const userDocSnap = await getDoc(doc(db, "users", uid));
        if (userDocSnap.exists()) {
          rank = userDocSnap.data().rank || "-";
        }
      } catch (e) {
        console.warn("Failed to fetch rank", e);
      }

      const unlockedBadges = [
        {
          id: "first_report",
          name: "Verified Reporter",
          icon: "bullhorn-outline",
          unlocked: reported >= 1,
          desc: "Filed your first report",
        },
        {
          id: "eco_warrior",
          name: "Eco Guardian",
          icon: "leaf",
          unlocked: ecoSolved >= 1,
          desc: "Solved an environment issue",
        },
        {
          id: "street_savior",
          name: "Infrastructure Watch",
          icon: "road",
          unlocked: roadsSolved >= 1,
          desc: "Fixed a road/pothole issue",
        },
        {
          id: "rising_star",
          name: "Active Solver",
          icon: "check-decagram",
          unlocked: solved >= 1,
          desc: "Resolved your first issue",
        },
        {
          id: "team_player",
          name: "Community Builder",
          icon: "account-group",
          unlocked: supported >= 3,
          desc: "Helped on 3+ issues",
        },
      ];

      const badges = unlockedBadges
        .sort((a, b) => b.unlocked - a.unlocked)
        .slice(0, 4);

      setStats({ reported, supported, solved, rank, badges });
    } catch (e) {
      console.error("Profile stats error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadMyIssues();
    }, [user]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fadeAnim.setValue(0.5);
    scaleAnim.setValue(0.99);
    loadStats(true);
    loadMyIssues();
  }, []);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error(error);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  const getAvatarColor = (name) => {
    const colors = [
      "#E53935",
      "#D81B60",
      "#8E24AA",
      "#5E35B1",
      "#3949AB",
      "#1E88E5",
      "#00ACC1",
      "#00897B",
      "#43A047",
      "#7CB342",
      "#F4511E",
      "#FB8C00",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const avatarBgColor = getAvatarColor(displayName);
  const trustScore =
    stats.reported * 50 + stats.supported * 30 + stats.solved * 100;
  const joinDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

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

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surfaceSubtle,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={64}
          color={theme.colors.textMuted}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: theme.colors.textPrimary,
            marginBottom: 12,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: -0.5,
          }}
        >
          {t("profile.guest_title", "Guest Profile")}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.textMuted,
            textAlign: "center",
            marginBottom: 32,
            lineHeight: 20,
          }}
        >
          Sign in to track your community impact, earn badges, and join the city
          leaderboard.
        </Text>
        <TouchableOpacity
          onPress={() => setIsLoginVisible(true)}
          style={{
            backgroundColor: theme.colors.accentBrand,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 0,
            width: "100%",
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            SIGN IN
          </Text>
        </TouchableOpacity>

        <LoginOverlay
          visible={isLoginVisible}
          onClose={() => setIsLoginVisible(false)}
        />
      </View>
    );
  }

  const settingsItems = [
    {
      title: "Community Impact",
      desc: "Leaderboard, rankings & trending issues",
      icon: "chart-timeline-variant-shimmer",
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.accentBrand,
      onPress: () => navigation.navigate("Analytics"),
    },
    {
      title: "Edit Profile",
      desc: "Photo, name & account settings",
      icon: "account-edit-outline",
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.accentBrand,
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      title: "Watch Areas",
      desc: "Neighborhood alerts & tracking",
      icon: "map-marker-radius",
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => navigation.navigate("WatchArea"),
    },
    {
      title: "Notifications",
      desc: "Manage your alert preferences",
      icon: "bell-outline",
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => navigation.navigate("Notifications"),
    },
    {
      title: t("profile.language", "Language"),
      desc:
        i18n.language === "en"
          ? "English (Switch to Hindi)"
          : "हिन्दी (Switch to English)",
      icon: "translate",
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => i18n.changeLanguage(i18n.language === "en" ? "hi" : "en"),
    },
  ];

  const { width } = Dimensions.get('window');
  // 3-column grid width calculation
  const gridItemSize = (Math.min(width, 800) - (Spacing.xl * 2) - (Spacing.sm * 2)) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarName}>{displayName}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons name="cog-outline" size={26} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentBrand}
            colors={[theme.colors.accentBrand]}
            progressBackgroundColor={theme.colors.background}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
          maxWidth: 800,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* Profile Info (Instagram Style) */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statBox} onPress={scrollToReports}>
              <Text style={styles.statNum}>{stats.reported}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.solved}</Text>
              <Text style={styles.statLabel}>Solved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.rank}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioName}>{displayName}</Text>
          <Text style={styles.bioDesc}>Member since {joinDate}</Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("EditProfile")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("Analytics")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            setReportsY(layout.y);
          }}
          style={styles.tabContainer}
        >
          <TouchableOpacity 
            onPress={() => setActiveTab("reports")} 
            style={[styles.tabButton, activeTab === "reports" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons 
              name="grid" 
              size={24} 
              color={activeTab === "reports" ? theme.colors.textPrimary : theme.colors.textMuted} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab("saved")}
            style={[styles.tabButton, activeTab === "saved" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons 
              name="bookmark-outline" 
              size={24} 
              color={activeTab === "saved" ? theme.colors.textPrimary : theme.colors.textMuted} 
            />
          </TouchableOpacity>
        </View>

        {/* Grid Feed */}
        <View style={styles.gridContainer}>
          {activeTab === "reports" ? (
            myIssues.length === 0 ? (
              <View style={styles.emptyFeed}>
                <MaterialCommunityIcons name="image-off-outline" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyFeedText}>No posts yet</Text>
              </View>
            ) : (
              myIssues.map((issue) => (
                <TouchableOpacity 
                  key={issue.id} 
                  style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
                  onPress={() => navigation.navigate("IssueDetail", { id: issue.id, issue })}
                  activeOpacity={0.9}
                >
                  {issue.photo ? (
                    <Image source={{ uri: issue.photo }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridFallback}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )
          ) : (
            savedIssues.length === 0 ? (
              <View style={styles.emptyFeed}>
                <MaterialCommunityIcons name="bookmark-off-outline" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyFeedText}>No saved posts</Text>
              </View>
            ) : (
              savedIssues.map((issue) => (
                <TouchableOpacity 
                  key={`saved-${issue.id}`} 
                  style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
                  onPress={() => navigation.navigate("IssueDetail", { id: issue.id, issue })}
                  activeOpacity={0.9}
                >
                  {issue.photo ? (
                    <Image source={{ uri: issue.photo }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridFallback}>
                      <MaterialCommunityIcons name="bookmark-outline" size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )
          )}
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = {
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.md,
    backgroundColor: theme.colors.background,
  },
  topBarName: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileHeader: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: Spacing.xl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: theme.colors.surfaceSubtle,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statBox: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  bioName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  bioDesc: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.textPrimary,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  gridItem: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
  },
  emptyFeed: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyFeedText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
};
