import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StatusBar, RefreshControl, Animated } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import IssueCard from '../components/IssueCard';
import FilterPills from '../components/ui/FilterPills';
import GradientButton from '../components/ui/GradientButton';
import AnimatedPressable from '../components/ui/AnimatedPressable';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadows, Gradients } from '../theme';
import * as Location from 'expo-location';

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
  const [newIssueCount, setNewIssueCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pillAnim = useRef(new Animated.Value(-50)).current;
  const [locationName, setLocationName] = useState('Your Area');

  // Fetch real location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) {
          const city = place.city || place.subregion || place.region || '';
          const region = place.region || '';
          setLocationName(city && region && city !== region ? `${city}, ${region}` : city || region || 'Your Area');
        }
      } catch (e) {
        // Silent fallback — keep default
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let activeWatchAreas = [];

      // Fetch user's watch areas
      const loadWatchAreas = async () => {
        if (!user?.uid) return;
        try {
          const q = query(collection(db, 'watchAreas'), where('userId', '==', user.uid), where('active', '==', true));
          const snapshot = await getDocs(q);
          if (isMounted) {
            activeWatchAreas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        } catch (e) {
          console.error('[HomeScreen] Failed to load watch areas:', e);
        }
      };
      loadWatchAreas();

      // Helper for distance (Haversine formula) in meters
      const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const p1 = lat1 * Math.PI/180;
        const p2 = lat2 * Math.PI/180;
        const dp = (lat2-lat1) * Math.PI/180;
        const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Subscribe to real-time new issues
      const unsubscribe = IssueService.subscribeToNewIssues(async (newIssue) => {
        if (!isMounted) return;
        // Only count issues not authored by current user
        if (newIssue.authorId !== user?.uid) {
          setNewIssueCount(prev => prev + 1);
          Animated.spring(pillAnim, { toValue: 0, friction: 6, useNativeDriver: true }).start();

          // Foreground Geofencing: Check if issue is within any active watch area
          if (newIssue.latitude && newIssue.longitude) {
            const isInside = activeWatchAreas.some(area => {
              const dist = getDistance(area.latitude, area.longitude, newIssue.latitude, newIssue.longitude);
              return dist <= area.radius;
            });

            if (isInside) {
              const Notifications = await import('expo-notifications');
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `📍 New Issue in Watch Area`,
                  body: `${newIssue.title} was just reported nearby.`,
                  sound: true,
                },
                trigger: null, // trigger immediately
              });
            }
          }
        }
      });
      return () => {
        isMounted = false;
        unsubscribe();
      };
    }, [user])
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
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

    try {
      const fetchCategory = activeCategory === 'Nearby' ? 'All' : activeCategory;
      const { data, lastDoc: newLastDoc } = await IssueService.getIssuesPaginated(10, isRefresh ? null : lastDoc, fetchCategory, user?.uid);
      
      if (isRefresh) {
        setIssues(data);
      } else {
        setIssues(prev => {
          // Prevent duplicates
          const newItems = data.filter(d => !prev.some(p => p.id === d.id));
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
            const { data, lastDoc: newLastDoc } = await IssueService.getIssuesPaginated(10, isRefresh ? null : lastDoc, 'All', null);
            if (isRefresh) {
                setIssues(data);
            } else {
                setIssues(prev => [...prev, ...data]);
            }
            setLastDoc(newLastDoc);
            setHasMore(data.length === 10);
        } catch (e) { console.error(e); }
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
  }, [selectedCategory, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNewIssueCount(0);
    Animated.timing(pillAnim, { toValue: -50, duration: 200, useNativeDriver: true }).start();
    fadeAnim.setValue(0);
    loadIssues(true, selectedCategory);
  }, [selectedCategory]);

  const filteredIssues = issues.filter(issue => {
    if (selectedCategory === 'Urgent') return ['critical', 'high'].includes(issue.urgency);
    if (selectedCategory === 'Solved') return issue.status === 'Solved';
    if (selectedCategory === 'Nearby') return issue.latitude && issue.longitude;
    return true;
  });

  const openCount = issues.filter(i => i.status !== 'Solved' && i.status !== 'Failed').length;
  const solvedCount = issues.filter(i => i.status === 'Solved').length;
  const urgentCount = issues.filter(i => ['critical', 'high'].includes(i.urgency)).length;

  const categories = [
    { id: 'All', title: t('home.tab_feed', 'Feed'), icon: 'view-dashboard-outline' },
    { id: 'Urgent', title: t('home.tab_critical', 'Critical'), icon: 'alert-circle-outline' },
    { id: 'Solved', title: t('home.tab_resolved', 'Resolved'), icon: 'check-decagram-outline' },
    { id: 'Nearby', title: 'Nearby', icon: 'map-marker-outline' },
  ];

  const renderHeader = () => (
    <View style={{ paddingTop: 12, paddingBottom: 16 }}>
      {/* Community Pulse */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.18)', 'rgba(19, 25, 37, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>{t('home.pulse', 'COMMUNITY PULSE')}</Text>
              <Text style={styles.heroTitle}>{t('home.greeting', 'Hi')} {user?.displayName || 'Citizen'}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="pulse" size={22} color={Colors.accentLight} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{openCount}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={[styles.statValue, { color: Colors.success }]}>{solvedCount}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Text style={[styles.statValue, { color: Colors.warning }]}>{urgentCount}</Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
          </View>
        </LinearGradient>
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
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        }}
        contentStyle={{ paddingBottom: Spacing.sm }}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons 
            name={selectedCategory === 'Solved' ? 'check-all' : 'clipboard-text-off-outline'} 
            size={32} 
            color={Colors.textTertiary} 
          />
        </View>
        <Text style={styles.emptyTitle}>
          {selectedCategory === 'All' ? 'No issues reported yet' : `No ${categories.find(c => c.id === selectedCategory)?.title.toLowerCase()} issues`}
        </Text>
        <Text style={styles.emptyDesc}>
          {selectedCategory === 'All' ? 'Be the first to report a community issue.' : 'Nothing to show in this category right now.'}
        </Text>
        {selectedCategory === 'All' && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('ReportIssue')} 
            activeOpacity={0.8}
            style={styles.emptyAction}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Report an Issue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <LinearGradient
        colors={Gradients.header}
        style={[styles.header, { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color={Colors.accentLight} />
            <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
          </View>
          <Text style={styles.locationText}>{locationName}</Text>
        </View>
        <AnimatedPressable onPress={() => navigation.navigate('Notifications')} activeScale={0.92}>
          <View style={styles.headerBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </View>
        </AnimatedPressable>
      </LinearGradient>

      {/* New Issues Pill */}
      {newIssueCount > 0 && (
        <Animated.View style={[styles.newIssuePill, { transform: [{ translateY: pillAnim }] }]}>
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.8}
            style={styles.newIssuePillInner}
          >
            <MaterialCommunityIcons name="arrow-up" size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.newIssuePillText}>
              {newIssueCount} new {newIssueCount === 1 ? 'issue' : 'issues'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Main Feed using High-Performance FlatList */}
      <FlatList
        data={filteredIssues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: fadeAnim }}>
            <IssueCard issue={item} />
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, maxWidth: 800, alignSelf: 'center', width: '100%' }}
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
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.accent} style={{ margin: 20 }} /> : null}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
            progressBackgroundColor={Colors.surface}
          />
        }
      />
    </View>
  );
}

const styles = {
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  locationText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerBtn: {
    position: 'relative',
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.notifDot,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Shadows.subtle,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accentLight,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 14, 26, 0.5)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: Colors.textTertiary,
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
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    marginTop: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.fab,
  },
  newIssuePill: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    alignItems: 'center', paddingTop: 8,
  },
  newIssuePillInner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: Radius.sm, ...Shadows.fab,
  },
  newIssuePillText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
};

