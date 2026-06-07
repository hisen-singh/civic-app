import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StatusBar, RefreshControl, Animated } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import IssueCard from '../components/IssueCard';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadows } from '../theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Only show loading spinner on first load (when there's no data yet)
      if (issues.length === 0) {
        loadIssues();
      } else {
        // Stale-while-revalidate: show existing data, refresh silently
        loadIssues(false, true);
      }
    }, [user])
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [loading]);

  const loadIssues = async (isRefresh = false, silent = false) => {
    try {
      if (!silent) {
        // Only show loading state for non-silent fetches
      }
      const data = await IssueService.getAllIssues(isRefresh);
      setIssues(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    loadIssues(true);
  }, []);

  const filteredIssues = issues.filter(issue => {
    if (selectedCategory === 'Urgent') {
      return ['critical', 'high'].includes(issue.urgency);
    }
    if (selectedCategory === 'Solved') {
      return issue.status === 'Solved';
    }
    if (selectedCategory === 'Nearby') {
      // Show issues that have actual coordinates (user-location-tagged)
      return issue.latitude && issue.longitude;
    }
    if (selectedCategory === 'My Reports') {
      return issue.authorId === user?.uid || issue.authorName === user?.displayName;
    }
    return true; // 'All'
  });

  const categories = [
    { id: 'All', title: 'Feed', icon: 'view-dashboard-outline' },
    { id: 'Urgent', title: 'Critical', icon: 'alert-circle-outline' },
    { id: 'Solved', title: 'Resolved', icon: 'check-decagram-outline' },
    { id: 'Nearby', title: 'Near Me', icon: 'map-marker-outline' },
    { id: 'My Reports', title: 'My Reports', icon: 'account-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Civic</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notifications')} 
            activeOpacity={0.7} 
            style={styles.headerBtn}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        scrollEventThrottle={16} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        
        {/* Category Filters */}
        <View style={{ paddingTop: 12, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg }}>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    fadeAnim.setValue(0.5);
                    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
                  }}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                >
                  <MaterialCommunityIcons 
                    name={cat.icon} 
                    size={14} 
                    color={isSelected ? Colors.textInverse : Colors.textTertiary} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Feed */}
        <Animated.View style={{ paddingBottom: 100, opacity: fadeAnim }}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} color={Colors.accent} size="large" />
              <Text style={styles.loadingText}>Loading feed...</Text>
            </View>
          ) : filteredIssues.length === 0 ? (
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
          ) : (
            filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('ReportIssue')} 
        activeOpacity={0.85} 
        style={styles.fab}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.8,
  },
  headerBtn: {
    position: 'relative',
    padding: 6,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.notifDot,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  filterChipText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.textInverse,
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
    borderRadius: 36,
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
    paddingVertical: 12,
    borderRadius: Radius.sm,
    marginTop: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.fab,
  },
};
