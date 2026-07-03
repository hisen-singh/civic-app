import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NotificationService } from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../theme';

// Time-ago formatter
const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
};

const NOTIF_ICONS = {
    'WATCH_AREA_ALERT': 'map-marker-radius',
    'ISSUE_SOLVED': 'check-decagram',
    'SOLVER_JOINED': 'account-plus',
    'NEW_COMMENT': 'chat-outline',
};

export default function NotificationsScreen() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            if (user?.uid) {
                fetchNotifications();
            }
        }, [user])
    );

    const fetchNotifications = async () => {
        setLoading(true);
        const notifs = await NotificationService.getUserNotifications(user.uid);
        setNotifications(notifs);
        setLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    };

    const handleMarkAllRead = async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        await Promise.all(unread.map(n => NotificationService.markAsRead(n.id)));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handlePressNotification = async (notif) => {
        if (!notif.read) {
            await NotificationService.markAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        }
        if (notif.issueId) {
            navigation.navigate('IssueDetail', { issueId: notif.issueId });
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor={Colors.textPrimary} size={24} onPress={() => navigation.goBack()} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.unreadBadge}>{unreadCount} new</Text>
                    )}
                </View>
                <TouchableOpacity
                    onPress={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    activeOpacity={0.7}
                    style={{ padding: 8 }}
                >
                    <MaterialCommunityIcons 
                        name="check-all" 
                        size={22} 
                        color={unreadCount > 0 ? Colors.accent : Colors.textTertiary} 
                    />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            ) : (
                <Animated.ScrollView style={[styles.listContainer, { opacity: fadeAnim }]}>
                    {notifications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="bell-check-outline" size={36} color={Colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptyDesc}>No new alerts in your tracked areas.</Text>
                        </View>
                    ) : (
                        notifications.map(notif => (
                            <TouchableOpacity 
                                key={notif.id} 
                                onPress={() => handlePressNotification(notif)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.card, !notif.read && styles.unreadCard]}>
                                    <View style={[
                                        styles.iconContainer,
                                        !notif.read && { backgroundColor: Colors.accentSurface }
                                    ]}>
                                        <MaterialCommunityIcons 
                                            name={NOTIF_ICONS[notif.type] || 'bell-outline'}
                                            size={20} 
                                            color={!notif.read ? Colors.accent : Colors.textTertiary} 
                                        />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.title, !notif.read && styles.unreadText]}>
                                            {notif.title}
                                        </Text>
                                        <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
                                        <Text style={styles.time}>{timeAgo(notif.createdAt)}</Text>
                                    </View>
                                    {!notif.read && <View style={styles.unreadDot} />}
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Spacing.headerTop,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    unreadBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.accent,
        marginTop: 2,
    },
    listContainer: {
        padding: Spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyIcon: {
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
        marginBottom: Spacing.sm,
    },
    emptyDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.surface,
        marginBottom: Spacing.sm,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    unreadCard: {
        borderColor: 'rgba(99, 102, 241, 0.2)',
        backgroundColor: 'rgba(99, 102, 241, 0.04)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    unreadText: {
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    body: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        lineHeight: 18,
    },
    time: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
        marginTop: 8,
        marginLeft: Spacing.sm,
    },
});
