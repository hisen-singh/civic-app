import { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Animated, Image } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { IssueService } from "../services/IssueService";
import { theme, Spacing } from "../theme";
import IssueCard from "../components/IssueCard";

// Deterministic avatar color from name
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
    "#6D4C41",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function PublicProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName } = route.params || {};

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userIssues, setUserIssues] = useState([]);
  const scrollViewRef = useRef(null);
  const [reportsY, setReportsY] = useState(0);

  const scrollToReports = () => {
    if (scrollViewRef.current && reportsY > 0) {
      scrollViewRef.current.scrollTo({ y: reportsY - 20, animated: true });
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadProfile = async () => {
    try {
      // Fetch user document
      let userProfile = { displayName: userName || "User" };
      if (userId) {
        const publicDoc = await getDoc(
          doc(db, "users", userId, "publicProfile", "profile"),
        );
        if (publicDoc.exists()) {
          userProfile = { ...userProfile, ...publicDoc.data() };
        }
      }
      setProfile(userProfile);

      // Fetch user stats
      if (userId) {
        const userStats = await IssueService.getUserStats(userId);
        setStats(userStats);

        // Fetch user issues
        const allIssues = await IssueService.getAllIssues(true);
        const filtered = allIssues.filter((i) => i.authorId === userId);
        setUserIssues(filtered);
      }
    } catch (e) {
      console.error("Failed to load public profile:", e);
    } finally {
      setLoading(false);
    }
  };

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

  const displayName = profile?.displayName || userName || "User";
  const initials = displayName.substring(0, 2).toUpperCase();
  const avatarBg = getAvatarColor(displayName);
  const reported = stats?.reported || 0;
  const solved = stats?.solved || 0;
  const supported = stats?.supported || 0;
  const trustScore = reported * 50 + supported * 30 + solved * 100;
  const rank = profile?.rank || "-";
  const joinDate = profile?.createdAt?.toDate
    ? profile.createdAt
        .toDate()
        .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          maxWidth: 800,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* Avatar + Name */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
            {profile?.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile?.email && <Text style={styles.email}>{profile.email}</Text>}
          {joinDate ? (
            <Text style={styles.joinDate}>Member since {joinDate}</Text>
          ) : null}
        </View>

        {/* Trust Score */}
        <View style={styles.trustCard}>
          <Text style={styles.trustScore}>{trustScore}</Text>
          <Text style={styles.trustLabel}>TRUST SCORE</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{rank}</Text>
            <Text style={styles.statLabel}>City Rank</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={scrollToReports}
          >
            <Text style={styles.statValue}>{reported}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{supported}</Text>
            <Text style={styles.statLabel}>Helping</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: theme.colors.accentBrand }]}
            >
              {solved}
            </Text>
            <Text style={styles.statLabel}>Solved</Text>
          </View>
        </View>

        {/* Activity Summary */}
        <View
          style={{
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xxl,
            marginBottom: Spacing.xl,
          }}
        >
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              style={[styles.activityCard, { marginRight: Spacing.md }]}
              activeOpacity={0.7}
              onPress={scrollToReports}
            >
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={24}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.activityValue}>{reported}</Text>
              <Text style={styles.activityLabel}>Reports Filed</Text>
            </TouchableOpacity>
            <View style={[styles.activityCard, { marginRight: Spacing.md }]}>
              <MaterialCommunityIcons
                name="hand-heart-outline"
                size={24}
                color={theme.colors.accentBrand}
              />
              <Text style={styles.activityValue}>{supported}</Text>
              <Text style={styles.activityLabel}>Helping On</Text>
            </View>
            <View style={styles.activityCard}>
              <MaterialCommunityIcons
                name="check-decagram-outline"
                size={24}
                color={theme.colors.accentBrand}
              />
              <Text style={styles.activityValue}>{solved}</Text>
              <Text style={styles.activityLabel}>Resolved</Text>
            </View>
          </View>
        </View>

        {/* Reports Feed */}
        <View
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            setReportsY(layout.y);
          }}
          style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm }}
        >
          <Text style={styles.sectionTitle}>Reports</Text>
          {userIssues.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: Spacing.xl,
                backgroundColor: theme.colors.surfaceSubtle,
                borderRadius: theme.radius.inner,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <MaterialCommunityIcons
                name="clipboard-text-off-outline"
                size={24}
                color={theme.colors.textMuted}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                No reports filed yet
              </Text>
            </View>
          ) : (
            userIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = {
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderColor: theme.colors.border,
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 9999,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  trustCard: {
    alignItems: "center",
    marginHorizontal: Spacing.xl,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.outer,
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: Spacing.lg,
  },
  trustScore: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
    lineHeight: 52,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.accentBrand,
    letterSpacing: 1,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.inner,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: Spacing.lg,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  activityCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.inner,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: Spacing.lg,
    alignItems: "center",
  },
  activityValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
};
