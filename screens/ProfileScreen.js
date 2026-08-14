import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Image,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedPressable from '../components/ui/AnimatedPressable';
import LoginOverlay from '../components/LoginOverlay';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { theme, Colors, Radius, Spacing, Shadows, Gradients } from '../theme';
import IssueCard from '../components/IssueCard';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    reported: 0,
    supported: 0,
    solved: 0,
    rank: '-',
    badges: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const [myIssues, setMyIssues] = useState([]);
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
    } catch (e) {
      console.warn('Failed to load user issues:', e);
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
      let rank = '-';
      try {
        const userDocSnap = await getDoc(doc(db, 'users', uid));
        if (userDocSnap.exists()) {
          rank = userDocSnap.data().rank || '-';
        }
      } catch (e) {
        console.warn('Failed to fetch rank', e);
      }

      const unlockedBadges = [
        {
          id: 'first_report',
          name: 'Verified Reporter',
          icon: 'bullhorn-outline',
          unlocked: reported >= 1,
          desc: 'Filed your first report',
        },
        {
          id: 'eco_warrior',
          name: 'Eco Guardian',
          icon: 'leaf',
          unlocked: ecoSolved >= 1,
          desc: 'Solved an environment issue',
        },
        {
          id: 'street_savior',
          name: 'Infrastructure Watch',
          icon: 'road',
          unlocked: roadsSolved >= 1,
          desc: 'Fixed a road/pothole issue',
        },
        {
          id: 'rising_star',
          name: 'Active Solver',
          icon: 'check-decagram',
          unlocked: solved >= 1,
          desc: 'Resolved your first issue',
        },
        {
          id: 'team_player',
          name: 'Community Builder',
          icon: 'account-group',
          unlocked: supported >= 3,
          desc: 'Helped on 3+ issues',
        },
      ];

      const badges = unlockedBadges
        .sort((a, b) => b.unlocked - a.unlocked)
        .slice(0, 4);

      setStats({ reported, supported, solved, rank, badges });
    } catch (e) {
      console.error('Profile stats error:', e);
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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();
  const trustScore =
    stats.reported * 50 + stats.supported * 30 + stats.solved * 100;
  const joinDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '';

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
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
          justifyContent: 'center',
          alignItems: 'center',
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
            fontWeight: '800',
            color: theme.colors.textPrimary,
            marginBottom: 12,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: -0.5,
          }}
        >
          {t('profile.guest_title', 'Guest Profile')}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.textMuted,
            textAlign: 'center',
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
            width: '100%',
            alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '800',
              textTransform: 'uppercase',
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
      title: 'Community Impact',
      desc: 'Leaderboard, rankings & trending issues',
      icon: 'chart-timeline-variant-shimmer',
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.accentBrand,
      onPress: () => navigation.navigate('Analytics'),
    },
    {
      title: 'Edit Profile',
      desc: 'Photo, name & account settings',
      icon: 'account-edit-outline',
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.accentBrand,
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      title: 'Watch Areas',
      desc: 'Neighborhood alerts & tracking',
      icon: 'map-marker-radius',
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => navigation.navigate('WatchArea'),
    },
    {
      title: 'Notifications',
      desc: 'Manage your alert preferences',
      icon: 'bell-outline',
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      title: t('profile.language', 'Language'),
      desc:
        i18n.language === 'en'
          ? 'English (Switch to Hindi)'
          : 'हिन्दी (Switch to English)',
      icon: 'translate',
      iconBg: theme.colors.surfaceSubtle,
      iconColor: theme.colors.textPrimary,
      onPress: () => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en'),
    },
  ];

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
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
      contentContainerStyle={{
        paddingBottom: 120,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      {/* Profile Header */}
      <View style={styles.headerSection}>
        <View style={styles.avatarRow}>
          <AnimatedPressable
            onPress={() => navigation.navigate('EditProfile')}
            activeScale={0.95}
          >
            <View style={styles.avatarRing}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
          </AnimatedPressable>
          <View style={{ flex: 1, marginLeft: Spacing.lg }}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            {joinDate ? (
              <Text style={styles.joinDate}>Member since {joinDate}</Text>
            ) : null}
          </View>
          <AnimatedPressable
            onPress={() => navigation.navigate('EditProfile')}
            activeScale={0.92}
          >
            <View style={styles.editBtn}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color={theme.colors.accentBrand}
              />
            </View>
          </AnimatedPressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text
              style={{
                fontSize: 64,
                fontWeight: '900',
                color: theme.colors.textPrimary,
                letterSpacing: -2,
                lineHeight: 68,
              }}
            >
              {trustScore}
            </Text>
            <Text style={styles.statLabel}>TRUST SCORE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: theme.colors.textPrimary }]}
            >
              #{stats.rank}
            </Text>
            <Text style={styles.statLabel}>City Rank</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            activeOpacity={0.7}
            onPress={scrollToReports}
          >
            <Text style={styles.statValue}>{stats.reported}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: theme.colors.accentBrand }]}
            >
              {stats.solved}
            </Text>
            <Text style={styles.statLabel}>Solved</Text>
          </View>
        </View>
      </View>

      <View
        style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl }}
      >
        {/* Activity Cards */}
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={{ flexDirection: 'row', marginBottom: Spacing.xxxl }}>
          <TouchableOpacity
            style={[styles.activityCard, { marginRight: Spacing.md }]}
            activeOpacity={0.7}
            onPress={scrollToReports}
          >
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: theme.colors.surfaceSubtle },
              ]}
            >
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={22}
                color={theme.colors.textPrimary}
              />
            </View>
            <Text style={styles.activityValue}>{stats.reported}</Text>
            <Text style={styles.activityLabel}>Reports Filed</Text>
          </TouchableOpacity>
          <View style={[styles.activityCard, { marginRight: Spacing.md }]}>
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: theme.colors.surfaceSubtle },
              ]}
            >
              <MaterialCommunityIcons
                name="hand-heart-outline"
                size={22}
                color={theme.colors.accentBrand}
              />
            </View>
            <Text style={styles.activityValue}>{stats.supported}</Text>
            <Text style={styles.activityLabel}>Helping On</Text>
          </View>
          <View style={styles.activityCard}>
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: theme.colors.surfaceSubtle },
              ]}
            >
              <MaterialCommunityIcons
                name="check-decagram-outline"
                size={22}
                color={theme.colors.accentBrand}
              />
            </View>
            <Text style={styles.activityValue}>{stats.solved}</Text>
            <Text style={styles.activityLabel}>Resolved</Text>
          </View>
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={{ marginBottom: Spacing.xxxl }}>
          {stats.badges.map((badge) => (
            <View
              key={badge.id}
              style={[styles.badgeRow, !badge.unlocked && { opacity: 0.35 }]}
            >
              <View
                style={[
                  styles.badgeIconWrap,
                  badge.unlocked && {
                    backgroundColor: theme.colors.surfaceSubtle,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={badge.icon}
                  size={22}
                  color={
                    badge.unlocked
                      ? theme.colors.accentBrand
                      : theme.colors.textMuted
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>
                  {badge.unlocked ? badge.desc : 'Locked — keep contributing'}
                </Text>
              </View>
              {badge.unlocked && (
                <View style={styles.unlockedBadge}>
                  <MaterialCommunityIcons
                    name="check"
                    size={12}
                    color={theme.colors.accentBrand}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        {settingsItems.map((item, index) => (
          <AnimatedPressable
            key={item.title}
            onPress={item.onPress}
            activeScale={0.98}
            style={{
              marginBottom:
                index < settingsItems.length - 1 ? Spacing.sm : Spacing.xxxl,
            }}
          >
            <View style={styles.settingsRow}>
              <View
                style={[styles.settingsIcon, { backgroundColor: item.iconBg }]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={20}
                  color={item.iconColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsTitle}>{item.title}</Text>
                <Text style={styles.settingsDesc}>{item.desc}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textMuted}
              />
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {/* My Reports Feed */}
      <View
        onLayout={(event) => {
          const layout = event.nativeEvent.layout;
          setReportsY(layout.y);
        }}
        style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl }}
      >
        <Text style={styles.sectionTitle}>My Reports</Text>
        {myIssues.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
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
                fontWeight: '700',
              }}
            >
              No reports filed yet
            </Text>
          </View>
        ) : (
          myIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </View>

      {/* Footer / Logout */}
      <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: 40 }}>
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={styles.logoutBtn}
        >
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>
            {t('profile.sign_out', 'SIGN OUT')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Civic v1.0</Text>
        <View style={{ height: 40 }} />
      </View>
    </Animated.ScrollView>
  );
}

const styles = {
  headerSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 16,
    paddingBottom: Spacing.xxl,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 0,
    backgroundColor: theme.colors.accentBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
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
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 0,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: Spacing.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activityCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: Spacing.lg,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: Spacing.sm,
  },
  badgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  unlockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 0,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: Spacing.lg,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingsTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  settingsDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: Spacing.xxl,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: theme.colors.accentBrand,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.xxl,
    fontWeight: '500',
  },
};
