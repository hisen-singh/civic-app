import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Shadows } from '../theme';

export default function ProfileScreen() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [stats, setStats] = useState({ 
        reported: 0, 
        supported: 0, 
        solved: 0,
        rank: '-',
        badges: []
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.97)).current;

    useEffect(() => {
        if (!loading) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]).start();
        }
    }, [loading]);

    const loadStats = async (isRefresh = false) => {
        // Only show full loading screen on initial load
        if (!isRefresh && stats.reported === 0 && stats.supported === 0) {
            setLoading(true);
        }
        try {
            const allIssues = await IssueService.getAllIssues(isRefresh);
            const uid = user?.uid;
            const name = user?.displayName;

            const myReported = allIssues.filter(i => i.authorId === uid || i.authorName === name);
            const reported = myReported.length;

            const mySupported = allIssues.filter(i => (i.solvers || []).includes(uid));
            const supported = mySupported.length;

            const mySolved = mySupported.filter(i => i.status === 'Solved');
            const solved = mySolved.length;

            const roadsSolved = mySolved.filter(i => i.category === 'Roads' || i.category === 'Pothole').length;
            const ecoSolved = mySolved.filter(i => i.category === 'Environment' || i.category === 'Litter').length;

            const unlockedBadges = [
                { id: 'first_report', name: 'Verified Reporter', icon: 'bullhorn-outline', unlocked: reported >= 1, desc: 'Filed your first report' },
                { id: 'eco_warrior', name: 'Eco Guardian', icon: 'leaf', unlocked: ecoSolved >= 1, desc: 'Solved an environment issue' },
                { id: 'street_savior', name: 'Infrastructure Watch', icon: 'road', unlocked: roadsSolved >= 1, desc: 'Fixed a road/pothole issue' },
                { id: 'rising_star', name: 'Active Solver', icon: 'check-decagram', unlocked: solved >= 1, desc: 'Resolved your first issue' },
                { id: 'team_player', name: 'Community Builder', icon: 'account-group', unlocked: supported >= 3, desc: 'Helped on 3+ issues' }
            ];
            
            const badges = unlockedBadges
                .sort((a, b) => b.unlocked - a.unlocked)
                .slice(0, 4);

            // Calculate rank from all users
            const userScores = {};
            allIssues.forEach(issue => {
                const rid = issue.authorId;
                if (rid && rid !== 'anonymous') {
                    if (!userScores[rid]) userScores[rid] = 0;
                    userScores[rid] += 50;
                }
                (issue.solvers || []).forEach(sid => {
                    if (!userScores[sid]) userScores[sid] = 0;
                    userScores[sid] += 30;
                    if (issue.status === 'Solved') userScores[sid] += 100;
                });
            });

            const sortedScores = Object.entries(userScores)
                .sort(([, a], [, b]) => b - a);
            
            const myRankIndex = sortedScores.findIndex(([id]) => id === uid);
            const rank = myRankIndex >= 0 ? myRankIndex + 1 : sortedScores.length + 1;

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
        }, [user])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fadeAnim.setValue(0.5);
        scaleAnim.setValue(0.99);
        loadStats(true);
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
    const trustScore = (stats.reported * 50) + (stats.supported * 30) + (stats.solved * 100);
    const joinDate = user?.metadata?.creationTime 
        ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.accent} />
            </View>
        );
    }

    const settingsItems = [
        { 
            title: 'Watch Areas', 
            desc: 'Neighborhood alerts & tracking', 
            icon: 'map-marker-radius', 
            iconBg: Colors.accentSurface, 
            iconColor: Colors.accent,
            onPress: () => navigation.navigate('WatchArea'),
        },
        { 
            title: 'Notifications', 
            desc: 'Manage your alert preferences', 
            icon: 'bell-outline', 
            iconBg: Colors.warningSurface, 
            iconColor: Colors.warning,
            onPress: () => navigation.navigate('Notifications'),
        },
    ];

    return (
        <Animated.ScrollView 
            style={{ flex: 1, backgroundColor: Colors.background, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.accent}
                    colors={[Colors.accent]}
                    progressBackgroundColor={Colors.surface}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Header */}
            <View style={styles.headerSection}>
                <View style={styles.avatarRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.lg }}>
                        <Text style={styles.displayName}>{displayName}</Text>
                        <Text style={styles.email}>{user?.email || ''}</Text>
                        {joinDate ? <Text style={styles.joinDate}>Member since {joinDate}</Text> : null}
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Colors.accent }]}>{trustScore}</Text>
                        <Text style={styles.statLabel}>Trust Score</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Colors.success }]}>#{stats.rank}</Text>
                        <Text style={styles.statLabel}>City Rank</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.reported}</Text>
                        <Text style={styles.statLabel}>Reports</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Colors.success }]}>{stats.solved}</Text>
                        <Text style={styles.statLabel}>Solved</Text>
                    </View>
                </View>
            </View>

            <View style={{ paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl }}>
                {/* Activity Cards */}
                <Text style={styles.sectionTitle}>Activity Overview</Text>
                <View style={{ flexDirection: 'row', marginBottom: Spacing.xxxl }}>
                    <View style={[styles.activityCard, { marginRight: Spacing.md }]}>
                        <View style={[styles.activityIcon, { backgroundColor: Colors.infoSurface }]}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={Colors.info} />
                        </View>
                        <Text style={styles.activityValue}>{stats.reported}</Text>
                        <Text style={styles.activityLabel}>Reports Filed</Text>
                    </View>
                    <View style={[styles.activityCard, { marginRight: Spacing.md }]}>
                        <View style={[styles.activityIcon, { backgroundColor: Colors.warningSurface }]}>
                            <MaterialCommunityIcons name="hand-heart-outline" size={22} color={Colors.warning} />
                        </View>
                        <Text style={styles.activityValue}>{stats.supported}</Text>
                        <Text style={styles.activityLabel}>Helping On</Text>
                    </View>
                    <View style={styles.activityCard}>
                        <View style={[styles.activityIcon, { backgroundColor: Colors.successSurface }]}>
                            <MaterialCommunityIcons name="check-decagram-outline" size={22} color={Colors.success} />
                        </View>
                        <Text style={styles.activityValue}>{stats.solved}</Text>
                        <Text style={styles.activityLabel}>Resolved</Text>
                    </View>
                </View>

                {/* Badges */}
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={{ marginBottom: Spacing.xxxl }}>
                    {stats.badges.map((badge) => (
                        <View key={badge.id} style={[styles.badgeRow, !badge.unlocked && { opacity: 0.35 }]}>
                            <View style={[styles.badgeIconWrap, badge.unlocked && { backgroundColor: Colors.accentSurface }]}>
                                <MaterialCommunityIcons 
                                    name={badge.icon} 
                                    size={22} 
                                    color={badge.unlocked ? Colors.accent : Colors.textTertiary} 
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
                                    <MaterialCommunityIcons name="check" size={12} color={Colors.success} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Settings */}
                <Text style={styles.sectionTitle}>Settings</Text>
                {settingsItems.map((item, index) => (
                    <TouchableOpacity 
                        key={item.title}
                        style={[styles.settingsRow, index < settingsItems.length - 1 && { marginBottom: Spacing.sm }]}
                        onPress={item.onPress}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.settingsIcon, { backgroundColor: item.iconBg }]}>
                            <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.settingsTitle}>{item.title}</Text>
                            <Text style={styles.settingsDesc}>{item.desc}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                ))}

                {/* Logout */}
                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    style={styles.logoutBtn}
                >
                    <MaterialCommunityIcons name="logout" size={18} color={Colors.error} style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Civic v1.0</Text>
                <View style={{ height: 40 }} />
            </View>
        </Animated.ScrollView>
    );
}

const styles = {
    headerSection: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.headerTop + 16,
        paddingBottom: Spacing.xxl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    displayName: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    email: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    joinDate: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    statsRow: {
        width: '100%',
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: Colors.textTertiary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.border,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    activityCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    activityValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    activityLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    badgeIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    badgeDesc: {
        fontSize: 12,
        color: Colors.textTertiary,
    },
    unlockedBadge: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: Colors.successSurface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xxxl,
    },
    settingsIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    settingsTitle: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    settingsDesc: {
        color: Colors.textTertiary,
        fontSize: 12,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: Spacing.xxl,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: Colors.error,
        backgroundColor: Colors.errorSurface,
    },
    logoutText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '600',
    },
    versionText: {
        color: Colors.textTertiary,
        fontSize: 11,
        textAlign: 'center',
        marginTop: Spacing.xxl,
        fontWeight: '500',
    },
};
