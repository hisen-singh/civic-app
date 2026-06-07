import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import IssueCard from '../components/IssueCard';
import { Colors, Radius, Spacing, Shadows } from '../theme';

export default function LeaderboardScreen() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [trendingIssues, setTrendingIssues] = useState([]);
    const [activeTab, setActiveTab] = useState('heroes');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!loading) {
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        }
    }, [loading, activeTab]);

    const fetchData = useCallback(async (isRefresh = false) => {
        // Only show loading spinner on initial load, not on background refreshes
        if (leaderboard.length === 0 && trendingIssues.length === 0 && !isRefresh) {
            setLoading(true);
        }
        try {
            const allIssues = await IssueService.getAllIssues(isRefresh);

            // Build user activity map
            const userMap = {};
            allIssues.forEach(issue => {
                const reporterId = issue.authorId;
                if (reporterId && reporterId !== 'anonymous') {
                    if (!userMap[reporterId]) {
                        userMap[reporterId] = { id: reporterId, name: issue.authorName || 'Unknown', reported: 0, supported: 0, solved: 0 };
                    }
                    userMap[reporterId].reported += 1;
                    if (issue.authorName) userMap[reporterId].name = issue.authorName;
                }
                (issue.solvers || []).forEach(solverId => {
                    if (!userMap[solverId]) {
                        userMap[solverId] = { id: solverId, name: solverId, reported: 0, supported: 0, solved: 0 };
                    }
                    userMap[solverId].supported += 1;
                    if (issue.status === 'Solved') {
                        userMap[solverId].solved += 1;
                    }
                });
            });

            const ranked = Object.values(userMap).map(u => {
                const score = (u.reported * 50) + (u.supported * 30) + (u.solved * 100);
                const isCurrentUser = u.id === user?.uid;
                let title = 'Participant';
                if (score >= 500) title = 'Community Lead';
                else if (score >= 300) title = 'Local Coordinator';
                else if (score >= 150) title = 'Verified Contributor';
                else if (score >= 50) title = 'Active Member';

                return { ...u, score, title, isCurrentUser, name: isCurrentUser ? (u.name + ' (You)') : u.name };
            });
            ranked.sort((a, b) => b.score - a.score);
            setLeaderboard(ranked);

            // Trending issues
            const rankedIssues = [...allIssues].map(issue => {
                const score = (issue.solvers?.length || 0) * 10 + (issue.comments?.length || 0) * 5 + (issue.votes || 0) * 2;
                return { ...issue, trendingScore: score };
            }).sort((a, b) => b.trendingScore - a.trendingScore);
            setTrendingIssues(rankedIssues);
        } catch (error) {
            console.error("Leaderboard error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    // Medal colors for top 3
    const getMedalStyle = (rank) => {
        if (rank === 1) return { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.4)', color: '#FACC15', icon: 'crown' };
        if (rank === 2) return { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)', color: '#94A3B8', icon: 'medal' };
        if (rank === 3) return { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.25)', color: '#D97706', icon: 'medal-outline' };
        return null;
    };

    return (
        <ScrollView 
            style={{ flex: 1, backgroundColor: Colors.background }}
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Impact</Text>
                <Text style={styles.headerSub}>Recognizing active contributors</Text>
                
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'heroes' && styles.tabActive]}
                        onPress={() => setActiveTab('heroes')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons 
                            name="account-star-outline" 
                            size={16} 
                            color={activeTab === 'heroes' ? '#FFF' : Colors.textSecondary} 
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'heroes' && styles.tabTextActive]}>Contributors</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'problems' && styles.tabActive]}
                        onPress={() => setActiveTab('problems')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons 
                            name="trending-up" 
                            size={16} 
                            color={activeTab === 'problems' ? '#FFF' : Colors.textSecondary} 
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.tabText, activeTab === 'problems' && styles.tabTextActive]}>Trending</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Animated.View style={{ paddingVertical: Spacing.xxl, paddingBottom: 100, opacity: fadeAnim }}>
                {loading ? (
                    <View style={{ alignItems: 'center', paddingTop: 40 }}>
                        <ActivityIndicator animating={true} color={Colors.accent} size="large" />
                        <Text style={{ color: Colors.textTertiary, fontSize: 13, marginTop: 12 }}>Loading data...</Text>
                    </View>
                ) : activeTab === 'heroes' ? (
                    leaderboard.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="account-group-outline" size={32} color={Colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No Contributors Yet</Text>
                            <Text style={styles.emptyDesc}>Help resolve a community issue to appear here.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Top 3 podium */}
                            {leaderboard.length >= 3 && (
                                <View style={styles.podiumRow}>
                                    {[1, 0, 2].map(podiumIdx => {
                                        const person = leaderboard[podiumIdx];
                                        if (!person) return null;
                                        const rank = podiumIdx + 1;
                                        const medal = getMedalStyle(rank);
                                        const isCenter = podiumIdx === 0;
                                        return (
                                            <View key={person.id} style={[styles.podiumCard, isCenter && styles.podiumCardCenter]}>
                                                <View style={[styles.podiumAvatar, { borderColor: medal.color, borderWidth: 2 }]}>
                                                    <Text style={[styles.podiumInitials, { color: medal.color }]}>
                                                        {(person.name || 'U').substring(0, 2).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={[styles.podiumRankBadge, { backgroundColor: medal.bg, borderColor: medal.border }]}>
                                                    <MaterialCommunityIcons name={medal.icon} size={12} color={medal.color} />
                                                </View>
                                                <Text style={styles.podiumName} numberOfLines={1}>{person.name?.split(' ')[0] || 'User'}</Text>
                                                <Text style={[styles.podiumScore, { color: medal.color }]}>{person.score}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Rest of leaderboard */}
                            {leaderboard.map((person, index) => {
                                if (index < 3 && leaderboard.length >= 3) return null; // Skip top 3 shown in podium
                                const rank = index + 1;
                                const highlight = person.isCurrentUser;

                                return (
                                    <View key={person.id} style={[
                                        styles.rankCard,
                                        highlight && styles.rankCardHighlight,
                                    ]}>
                                        {/* Rank */}
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankNumberPlain}>#{rank}</Text>
                                        </View>

                                        {/* Avatar */}
                                        <View style={styles.rankAvatar}>
                                            <Text style={styles.rankAvatarText}>
                                                {(person.name || 'U').substring(0, 2).toUpperCase()}
                                            </Text>
                                        </View>

                                        {/* Info */}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.personName, highlight && { color: Colors.accent }]}>
                                                {person.name}
                                            </Text>
                                            <Text style={styles.personTitle}>{person.title}</Text>
                                        </View>

                                        {/* Score */}
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.score, highlight && { color: Colors.textPrimary }]}>
                                                {person.score}
                                            </Text>
                                            <Text style={styles.scoreLabel}>impact</Text>
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Show current user position if not in top results */}
                            {leaderboard.length > 0 && !leaderboard.some(p => p.isCurrentUser) && (
                                <View style={styles.yourPosition}>
                                    <MaterialCommunityIcons name="account-outline" size={16} color={Colors.textTertiary} />
                                    <Text style={styles.yourPositionText}>Start contributing to see your ranking here!</Text>
                                </View>
                            )}
                        </>
                    )
                ) : (
                    trendingIssues.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="trending-neutral" size={32} color={Colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No Trending Issues</Text>
                            <Text style={styles.emptyDesc}>Reports with community engagement will appear here.</Text>
                        </View>
                    ) : (
                        trendingIssues.slice(0, 10).map((issue, index) => (
                            <View key={issue.id}>
                                {index === 0 && (
                                    <View style={styles.trendingLabel}>
                                        <MaterialCommunityIcons name="fire" size={14} color={Colors.warning} style={{ marginRight: 6 }} />
                                        <Text style={styles.trendingLabelText}>Most community engagement</Text>
                                    </View>
                                )}
                                <IssueCard issue={issue} />
                            </View>
                        ))
                    )
                )}
            </Animated.View>
        </ScrollView>
    );
}

const styles = {
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.headerTop + 4,
        paddingBottom: Spacing.xxl,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: Radius.sm,
        padding: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    tabActive: {
        backgroundColor: Colors.accent,
    },
    tabText: {
        color: Colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    tabTextActive: {
        color: '#FFF',
    },
    // Podium
    podiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.xxl,
    },
    podiumCard: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: Spacing.lg,
    },
    podiumCardCenter: {
        marginTop: -12,
    },
    podiumAvatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    podiumInitials: {
        fontSize: 16,
        fontWeight: '800',
    },
    podiumRankBadge: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -12,
        marginBottom: 6,
    },
    podiumName: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 2,
    },
    podiumScore: {
        fontSize: 16,
        fontWeight: '800',
    },
    // Rank Cards
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptyDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    rankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rankCardHighlight: {
        backgroundColor: Colors.accentSurface,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderWidth: 1.5,
    },
    rankBadge: {
        width: 36,
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    rankAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    rankAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    rankNumberPlain: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textTertiary,
    },
    personName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    personTitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    score: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.accent,
    },
    scoreLabel: {
        fontSize: 10,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    yourPosition: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    yourPositionText: {
        fontSize: 13,
        color: Colors.textTertiary,
        marginLeft: 8,
    },
    trendingLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    trendingLabelText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.warning,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
};
