import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, Animated, Dimensions } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IssueService } from '../services/IssueService';
import { Colors, Radius, Spacing, Shadows, Gradients } from '../theme';

export default function AnalyticsScreen() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        solved: 0,
        inProgress: 0,
        critical: 0,
        categories: []
    });
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, [loading]);

    const loadData = async () => {
        setLoading(true);
        try {
            const appStats = await IssueService.getAppStats();
            
            const { total, solved, inProgress, critical, categories } = appStats;

            setStats({ total, solved, inProgress, critical, categories });
        } catch (e) {
            console.error('Failed to load analytics', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.accent} />
            </View>
        );
    }

    const resolutionRate = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
    const maxCat = stats.categories.length > 0 ? stats.categories[0][1] : 1;

    return (
        <Animated.ScrollView 
            style={{ flex: 1, backgroundColor: Colors.background, opacity: fadeAnim }}
            contentContainerStyle={{ padding: Spacing.xl, paddingTop: Spacing.headerTop + 24, paddingBottom: 100 }}
        >
            <View style={{ marginBottom: Spacing.xxl }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 }}>
                    Neighborhood Impact
                </Text>
                <Text style={{ fontSize: 14, color: Colors.textSecondary }}>
                    Community statistics and issue resolution metrics.
                </Text>
            </View>

            {/* Overview Stats Grid */}
            <View style={styles.grid}>
                <View style={styles.gridCard}>
                    <MaterialCommunityIcons name="clipboard-text-multiple-outline" size={24} color={Colors.accentLight} style={{ marginBottom: 12 }} />
                    <Text style={styles.cardValue}>{stats.total}</Text>
                    <Text style={styles.cardLabel}>Total Issues</Text>
                </View>
                <View style={styles.gridCard}>
                    <MaterialCommunityIcons name="check-decagram-outline" size={24} color={Colors.success} style={{ marginBottom: 12 }} />
                    <Text style={styles.cardValue}>{stats.solved}</Text>
                    <Text style={styles.cardLabel}>Resolved</Text>
                </View>
                <View style={styles.gridCard}>
                    <MaterialCommunityIcons name="progress-wrench" size={24} color={Colors.warning} style={{ marginBottom: 12 }} />
                    <Text style={styles.cardValue}>{stats.inProgress}</Text>
                    <Text style={styles.cardLabel}>In Progress</Text>
                </View>
                <View style={styles.gridCard}>
                    <MaterialCommunityIcons name="chart-pie" size={24} color={Colors.info} style={{ marginBottom: 12 }} />
                    <Text style={styles.cardValue}>{resolutionRate}%</Text>
                    <Text style={styles.cardLabel}>Resolution Rate</Text>
                </View>
            </View>

            {/* Category Breakdown (Bar Chart UI) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Issues by Category</Text>
                <View style={styles.chartContainer}>
                    {stats.categories.map(([cat, count]) => {
                        const pct = (count / maxCat) * 100;
                        return (
                            <View key={cat} style={styles.barRow}>
                                <Text style={styles.barLabel}>{cat}</Text>
                                <View style={styles.barTrack}>
                                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                                </View>
                                <Text style={styles.barCount}>{count}</Text>
                            </View>
                        );
                    })}
                    {stats.categories.length === 0 && (
                        <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginVertical: 20 }}>No data available</Text>
                    )}
                </View>
            </View>

            {/* Health Status */}
            <View style={styles.section}>
                <LinearGradient
                    colors={
                        stats.critical > 5 ? ['rgba(239, 68, 68, 0.2)', 'rgba(10, 14, 26, 0.95)'] :
                        resolutionRate > 50 ? ['rgba(16, 185, 129, 0.2)', 'rgba(10, 14, 26, 0.95)'] :
                        ['rgba(245, 158, 11, 0.2)', 'rgba(10, 14, 26, 0.95)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.healthCard}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <MaterialCommunityIcons 
                            name={stats.critical > 5 ? 'alert' : resolutionRate > 50 ? 'shield-check' : 'alert-circle-outline'} 
                            size={28} 
                            color={stats.critical > 5 ? Colors.error : resolutionRate > 50 ? Colors.success : Colors.warning} 
                        />
                        <Text style={styles.healthTitle}>
                            {stats.critical > 5 ? 'Attention Required' : resolutionRate > 50 ? 'Community is Healthy' : 'Needs Improvement'}
                        </Text>
                    </View>
                    <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                        {stats.critical > 5 
                            ? `There are ${stats.critical} critical issues in the area. Please exercise caution and assist if possible.`
                            : resolutionRate > 50 
                            ? 'Your neighborhood is actively resolving issues. Thank you for your contributions!'
                            : 'There are many open issues. Consider checking the map to see where you can help.'}
                    </Text>
                </LinearGradient>
            </View>

        </Animated.ScrollView>
    );
}

const styles = {
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.xxl,
    },
    gridCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.light,
    },
    cardValue: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    cardLabel: {
        fontSize: 12,
        color: Colors.textTertiary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: Spacing.xxxl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    chartContainer: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    barLabel: {
        width: 100,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    barTrack: {
        flex: 1,
        height: 8,
        backgroundColor: Colors.background,
        borderRadius: 4,
        overflow: 'hidden',
        marginHorizontal: 12,
    },
    barFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: 4,
    },
    barCount: {
        width: 32,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    healthCard: {
        padding: Spacing.xl,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginLeft: 12,
    }
};
