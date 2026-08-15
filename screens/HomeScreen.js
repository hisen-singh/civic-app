import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import IssueCard from '../components/IssueCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import FilterPills from '../components/ui/FilterPills';
import GradientButton from '../components/ui/GradientButton';
import AnimatedPressable from '../components/ui/AnimatedPressable';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadows, Gradients, theme } from '../theme';
import * as Location from 'expo-location';

const getAvatarColor = (name) => {
  const colors = [
    '#E53935',
    '#D81B60',
    '#8E24AA',
    '#5E35B1',
    '#3949AB',
    '#1E88E5',
    '#00ACC1',
    '#00897B',
    '#43A047',
    '#7CB342',
    '#F4511E',
    '#6D4C41',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [locationName, setLocationName] = useState('Your Area');
  const [stories, setStories] = useState([]);

  const loadStories = async () => {
    try {
      const allIssues = await IssueService.getAllIssues(true);
      const userMap = {};
      allIssues.forEach((issue) => {
        // Exclude non-India locations & mock open data profiles
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
            locLower.includes('ave') ||
            locLower.includes('st') ||
            locLower.includes('chicago') ||
            locLower.includes('il');
          if (!isUS) {
            isIndia = true;
          }
        }

        const authorName = issue.authorName || '';
        if (
          authorName.toLowerCase().includes('city') ||
          authorName.toLowerCase().includes('open data')
        ) {
          isIndia = false;
        }

        if (!isIndia) return;

        const rId = issue.authorId;
        if (rId && rId !== 'anonymous') {
          if (!userMap[rId]) {
            userMap[rId] = {
              id: rId,
              name: issue.authorName || 'Citizen',
              reported: 0,
              supported: 0,
              solved: 0,
            };
          }
          userMap[rId].reported += 1;
          if (issue.authorName) userMap[rId].name = issue.authorName;
        }
        (issue.solvers || []).forEach((sId) => {
          if (!userMap[sId]) {
            userMap[sId] = {
              id: sId,
              name: 'Citizen',
              reported: 0,
              supported: 0,
              solved: 0,
            };
          }
          userMap[sId].supported += 1;
          if (issue.status === 'Solved') {
            userMap[sId].solved += 1;
          }
        });
      });
      const ranked = Object.values(userMap)
        .map((u) => {
          const score = u.reported * 50 + u.supported * 30 + u.solved * 100;
          return { ...u, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
      setStories(ranked);
    } catch (e) {
      console.warn('Failed to load stories data', e);
    }
  };

  // Fetch real location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) {
          const city = place.city || place.subregion || place.region || '';
          const region = place.region || '';
          setLocationName(
            city && region && city !== region
              ? `${city}, ${region}`
              : city || region || 'Your Area',
          );
        }
      } catch (e) {
        // Silent fallback — keep default
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      loadStories();
      return () => {
        isMounted = false;
      };
    }, [user]),
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadIssues = async (isRefresh = false, categoryOverride = null) => {
    if (!isRefresh && loadingMore) return;
    const activeCategory = categoryOverride || selectedCategory;

    if (isRefresh) {
      // Don't set refreshing to true if it's a silent load
    } else if (issues.length === 0) {
      setLoading(true);
    }

    setLoadError(false);
    try {
      const fetchCategory =
        activeCategory === 'Nearby' ? 'All' : activeCategory;
      const { data, lastDoc: newLastDoc } =
        await IssueService.getIssuesPaginated(
          10,
          isRefresh ? null : lastDoc,
          fetchCategory,
          user?.uid,
        );

      const indiaOnlyData = data.filter((issue) => {
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
            locLower.includes('ave') ||
            locLower.includes('st') ||
            locLower.includes('chicago') ||
            locLower.includes('il');
          if (!isUS) {
            isIndia = true;
          }
        }

        const authorName = issue.authorName || '';
        if (
          authorName.toLowerCase().includes('city') ||
          authorName.toLowerCase().includes('open data')
        ) {
          isIndia = false;
        }
        return isIndia;
      });

      if (isRefresh) {
        setIssues(indiaOnlyData);
      } else {
        setIssues((prev) => {
          // Prevent duplicates
          const newItems = indiaOnlyData.filter(
            (d) => !prev.some((p) => p.id === d.id),
          );
          return [...prev, ...newItems];
        });
      }

      setLastDoc(newLastDoc);
      setHasMore(data.length === 10);
    } catch (error) {
      console.error(error);

      // Fallback if missing index: try fetching 'All' and rely on client-filter
      if (error.message && error.message.includes('index')) {
        try {
          const { data, lastDoc: newLastDoc } =
            await IssueService.getIssuesPaginated(
              10,
              isRefresh ? null : lastDoc,
              'All',
              null,
            );
          const indiaOnlyData = data.filter((issue) => {
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
                locLower.includes('ave') ||
                locLower.includes('st') ||
                locLower.includes('chicago') ||
                locLower.includes('il');
              if (!isUS) {
                isIndia = true;
              }
            }
            const authorName = issue.authorName || '';
            if (
              authorName.toLowerCase().includes('city') ||
              authorName.toLowerCase().includes('open data')
            ) {
              isIndia = false;
            }
            return isIndia;
          });
          if (isRefresh) {
            setIssues(indiaOnlyData);
          } else {
            setIssues((prev) => [...prev, ...indiaOnlyData]);
          }
          setLastDoc(newLastDoc);
          setHasMore(indiaOnlyData.length === 10);
        } catch (e) {
          console.error(e);
          setLoadError(true);
        }
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadIssues(true, selectedCategory);
    loadStories();
  }, [selectedCategory, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    loadIssues(true, selectedCategory);
    loadStories();
  }, [selectedCategory]);

  const filteredIssues = issues.filter((issue) => {
    if (selectedCategory === 'Urgent')
      return ['critical', 'high'].includes(issue.urgency);
    if (selectedCategory === 'Solved') return issue.status === 'Solved';
    if (selectedCategory === 'Nearby') return issue.latitude && issue.longitude;
    return true;
  });

  const openCount = issues.filter(
    (i) => i.status !== 'Solved' && i.status !== 'Failed',
  ).length;
  const solvedCount = issues.filter((i) => i.status === 'Solved').length;
  const urgentCount = issues.filter((i) =>
    ['critical', 'high'].includes(i.urgency),
  ).length;

  const categories = [
    {
      id: 'All',
      title: t('home.tab_feed', 'Feed'),
      icon: 'view-dashboard-outline',
    },
    {
      id: 'Urgent',
      title: t('home.tab_critical', 'Critical'),
      icon: 'alert-circle-outline',
    },
    {
      id: 'Solved',
      title: t('home.tab_resolved', 'Resolved'),
      icon: 'check-decagram-outline',
    },
    { id: 'Nearby', title: 'Nearby', icon: 'map-marker-outline' },
  ];

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'Citizen';
  const initials = displayName.substring(0, 2).toUpperCase();

  const currentUserScore = stories.find((s) => s.id === user?.uid)?.score || 0;

  const renderHeader = () => (
    <View style={{ paddingTop: 12, paddingBottom: 16 }}>
      {/* Instagram-style Stories bar for active contributors */}
      <View style={{ marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: theme.colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
          }}
        >
          Active in {locationName}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            gap: 16,
            paddingVertical: 4,
          }}
        >
          {/* My Story (You) */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={{ alignItems: 'center', width: 64 }}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                padding: 2,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceSubtle,
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 25,
                  backgroundColor: theme.colors.accentBrandSubtle,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: theme.colors.accentBrand,
                    }}
                  >
                    {initials}
                  </Text>
                )}
              </View>
              {/* Instagram-style plus overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: theme.colors.accentBrand,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: theme.colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name="plus" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: theme.colors.textPrimary,
                marginTop: 6,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              You
            </Text>
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: theme.colors.accentBrand,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {currentUserScore} pts
            </Text>
          </TouchableOpacity>

          {/* Active Stories */}
          {stories.map((story) => {
            if (story.id === user?.uid) return null;
            const sDisplayName = story.name || 'Citizen';
            const sInitials = sDisplayName.substring(0, 2).toUpperCase();
            const sAvatarBg = getAvatarColor(sDisplayName);

            return (
              <TouchableOpacity
                key={story.id}
                onPress={() =>
                  navigation.navigate('PublicProfile', {
                    userId: story.id,
                    userName: sDisplayName,
                  })
                }
                style={{ alignItems: 'center', width: 64 }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    borderWidth: 2.5,
                    borderColor: theme.colors.accentBrand, // Orange active ring
                    padding: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 25,
                      backgroundColor: sAvatarBg,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '900',
                        color: '#FFFFFF',
                      }}
                    >
                      {sInitials}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: theme.colors.textPrimary,
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {sDisplayName.split(' ')[0]}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: theme.colors.textMuted,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {story.score} pts
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Report CTA */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
        <GradientButton
          label="Report an Issue"
          icon="camera-plus-outline"
          onPress={() => navigation.navigate('ReportIssue')}
          style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}
        />
      </View>

      {/* Filter Chips */}
      <FilterPills
        items={categories}
        selected={selectedCategory}
        onSelect={(id) => {
          setSelectedCategory(id);
          fadeAnim.setValue(0.5);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }}
        contentStyle={{ paddingBottom: Spacing.sm }}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: theme.colors.surfaceSubtle },
            ]}
          >
            <MaterialCommunityIcons
              name="wifi-off"
              size={32}
              color={theme.colors.accentBrand}
            />
          </View>
          <Text style={styles.emptyTitle}>Couldn&apos;t load the feed</Text>
          <Text style={styles.emptyDesc}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              loadIssues(true, selectedCategory);
            }}
            activeOpacity={0.8}
            style={styles.emptyAction}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons
            name={
              selectedCategory === 'Solved'
                ? 'check-all'
                : 'clipboard-text-off-outline'
            }
            size={32}
            color={theme.colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {selectedCategory === 'All'
            ? 'No issues reported yet'
            : `No ${categories.find((c) => c.id === selectedCategory)?.title.toLowerCase()} issues`}
        </Text>
        <Text style={styles.emptyDesc}>
          {selectedCategory === 'All'
            ? 'Be the first to report a community issue.'
            : 'Nothing to show in this category right now.'}
        </Text>
        {selectedCategory === 'All' && (
          <TouchableOpacity
            onPress={() => navigation.navigate('ReportIssue')}
            activeOpacity={0.8}
            style={styles.emptyAction}
          >
            <MaterialCommunityIcons
              name="plus"
              size={16}
              color="#FFF"
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
              Report an Issue
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSubtle }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.surfaceSubtle}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { maxWidth: 800, alignSelf: 'center', width: '100%' },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image
            source={require('../assets/icon.png')}
            style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
          />
          <Text style={styles.brandTitle}>CIVIC</Text>
        </View>
        <AnimatedPressable
          onPress={() => navigation.navigate('Notifications')}
          activeScale={0.92}
        >
          <View style={styles.headerBtn}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
            <View style={styles.notifDot} />
          </View>
        </AnimatedPressable>
      </View>

      {/* Main Feed using High-Performance FlatList */}
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: fadeAnim }}>
            <IssueCard issue={item} />
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
          maxWidth: 800,
          alignSelf: 'center',
          width: '100%',
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={5}
        windowSize={10}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading && !refreshing) {
            setLoadingMore(true);
            loadIssues(false);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.accentBrand}
              style={{ margin: 20 }}
            />
          ) : null
        }
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
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  headerBtn: {
    position: 'relative',
    padding: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentBrand,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  heroCard: {
    borderRadius: 0,
    padding: Spacing.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentBrand,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 0,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentBrand,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: 0,
    marginTop: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 0,
    backgroundColor: theme.colors.accentBrand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newIssuePill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 8,
  },
  newIssuePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentBrand,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 0,
  },
  newIssuePillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
};
