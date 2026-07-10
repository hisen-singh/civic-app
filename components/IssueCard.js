import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, Alert, Linking, Animated } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Spacing, Shadows } from '../theme';
import { timeAgo, isValidYouTubeUrl } from '../utils/timeAgo';
import ShareModal from './ShareModal';
import CommentBottomSheet from './CommentBottomSheet';
import AnimatedPressable from './ui/AnimatedPressable';

const getYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const ImpactBadge = ({ impact }) => {
    const impacts = {
        critical: { label: 'CRITICAL', color: Colors.critical, bg: Colors.criticalBg },
        high: { label: 'HIGH', color: Colors.high, bg: Colors.highBg },
        medium: { label: 'MEDIUM', color: Colors.medium, bg: Colors.mediumBg },
        low: { label: 'LOW', color: Colors.low, bg: Colors.lowBg },
    };
    const data = impacts[impact] || impacts.medium;
    return (
        <View style={{ backgroundColor: data.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: data.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{data.label}</Text>
        </View>
    );
};

const StatusBadge = ({ status }) => {
    const statuses = {
        'Open': { label: 'OPEN', color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.15)' },
        'In Progress': { label: 'IN PROGRESS', color: Colors.info, bg: Colors.infoSurface },
        'Solved': { label: 'RESOLVED', color: Colors.success, bg: Colors.successSurface },
        'Failed': { label: 'FAILED', color: Colors.error, bg: Colors.errorSurface },
    };
    const data = statuses[status] || statuses['Open'];
    return (
        <View style={{ backgroundColor: data.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ color: data.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{data.label}</Text>
        </View>
    );
};

// timeAgo is imported from ../utils/timeAgo

export default function IssueCard({ issue, showActions = true, disablePress = false, onCommentPress }) {
    const { user } = useAuth();
    const navigation = useNavigation();
    
    // Initialize vote state from the ACTUAL voters array (resilient to reloads)
    const alreadyVoted = user ? (issue.voters || []).includes(user.uid) : false;
    const [localVotes, setLocalVotes] = useState(issue.votes || 0);
    const [hasVoted, setHasVoted] = useState(alreadyVoted);
    const [localStatus, setLocalStatus] = useState(issue.status || 'Open');
    const [isDeleted, setIsDeleted] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [shareVisible, setShareVisible] = useState(false);
    const [commentSheetVisible, setCommentSheetVisible] = useState(false);
    const initialCommentCount = issue.commentsCount ?? (issue.comments || []).length;
    const [localCommentCount, setLocalCommentCount] = useState(initialCommentCount);
    
    // Animation refs
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const voteAnim = useRef(new Animated.Value(1)).current;

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);
    
    const solvers = issue.solvers || [];
    const isAlreadySolving = user ? solvers.includes(user.uid) : false;
    const [isSolving, setIsSolving] = useState(isAlreadySolving);
    const isAuthor = user && (issue.authorId === user.uid || issue.authorName === user.displayName);

    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.98, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    };

    const animateVote = () => {
        Animated.sequence([
            Animated.timing(voteAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
            Animated.spring(voteAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
    };

    const triggerHaptic = (style) => {
        // Wrapped in try/catch: on a native build that predates expo-haptics,
        // the native module is missing and throws synchronously. This keeps an
        // optional tactile enhancement from ever crashing the app.
        try {
            const impactStyle = style ?? Haptics.ImpactFeedbackStyle?.Light;
            Haptics.impactAsync(impactStyle)?.catch(() => {});
        } catch (e) {
            // Haptics unavailable (e.g. web, or a build without the native module) — ignore.
        }
    };

    const handleUpvote = async () => {
        if (hasVoted || !user) return;

        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        animateVote();
        setLocalVotes(prev => prev + 1);
        setHasVoted(true);
        try {
            const result = await IssueService.upvoteIssue(issue.id, user.uid);
            if (result === false) {
                // Server says already voted — revert
                setLocalVotes(prev => prev - 1);
                setHasVoted(true); // Keep disabled since server confirmed it
            }
        } catch (e) {
            console.error("Failed to upvote:", e);
            setLocalVotes(prev => prev - 1);
            setHasVoted(false);
        }
    };

    const handleSolve = async () => {
        if (isSolving || !user || localStatus === 'Solved' || localStatus === 'Failed') return;

        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        setIsSolving(true);
        setLocalStatus('In Progress');
        try {
            await IssueService.joinIssue(issue.id, user.uid);
        } catch (e) {
            console.error("Failed to join issue:", e);
            setIsSolving(false);
            setLocalStatus(issue.status || 'Open');
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        setLocalStatus(newStatus);
        try {
            await IssueService.updateIssueStatus(issue.id, newStatus);
        } catch (e) {
            console.error("Failed to update status:", e);
            setLocalStatus(issue.status || 'Open');
        }
    };

    const handleCardPress = () => {
        animatePress();
        if (issue.youtubeUrl) {
            if (isValidYouTubeUrl(issue.youtubeUrl)) {
                Linking.openURL(issue.youtubeUrl).catch(err => console.error("Couldn't load page", err));
            } else {
                Alert.alert('Invalid Link', 'This link does not appear to be a valid YouTube URL.');
            }
            return;
        }
        if (!disablePress) {
            navigation.navigate('IssueDetail', { issueId: issue.id });
        }
    };

    const handleComment = () => {
        if (onCommentPress) {
            onCommentPress();
        } else if (!disablePress) {
            setCommentSheetVisible(true);
        }
    };

    const handleShare = () => {
        setShareVisible(true);
    };

    const authorName = issue.authorName || 'Citizen';
    const initials = authorName.substring(0, 2).toUpperCase();
    
    const ytId = getYouTubeID(issue.youtubeUrl);
    const hasMedia = issue.photo || ytId;

    const handleDelete = () => {
        closeMenu();
        Alert.alert(
            "Delete Report",
            "This action cannot be undone. The report will be permanently removed.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await IssueService.deleteIssue(issue.id);
                            setIsDeleted(true);
                        } catch (e) {
                            console.error("Failed to delete issue:", e);
                            Alert.alert("Error", "Could not delete issue. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    if (isDeleted) return null;

    const urgencyColor = {
        critical: Colors.critical,
        high: Colors.high,
        medium: Colors.medium,
        low: Colors.low,
    }[issue.urgency] || Colors.medium;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Card style={styles.card}>
                {/* Media Section (Top) */}
                <TouchableOpacity activeOpacity={disablePress ? 1 : 0.92} onPress={handleCardPress}>
                    {hasMedia ? (
                        <View>
                            <Image
                                source={{ uri: issue.photo || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                                style={styles.media}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(10, 14, 26, 0.85)']}
                                style={styles.mediaGradient}
                            />
                            {ytId && (
                                <View style={styles.playOverlay}>
                                    <View style={styles.playButton}>
                                        <MaterialCommunityIcons name="play" size={32} color="#FFF" />
                                    </View>
                                </View>
                            )}
                            <View style={styles.topBadges}>
                                <View style={styles.categoryChip}>
                                    <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                                    <Text style={styles.categoryChipText}>{issue.category || 'Issue'}</Text>
                                </View>
                                <StatusBadge status={localStatus} />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.textOnlyMedia}>
                            <View style={styles.categoryChipInline}>
                                <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                                <Text style={[styles.categoryChipText, { color: Colors.textPrimary }]}>
                                    {issue.category || 'Issue'}
                                </Text>
                            </View>
                            <StatusBadge status={localStatus} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Content & Actions */}
                <View style={styles.contentSection}>
                    <View style={styles.authorRow}>
                        <View style={styles.authorAvatar}>
                            <Text style={styles.authorInitials}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.authorName}>{authorName}</Text>
                            <Text style={styles.authorMeta}>{timeAgo(issue.createdAt)}</Text>
                        </View>
                        <ImpactBadge impact={issue.urgency || 'medium'} />
                    </View>

                    <Text style={styles.titleText} numberOfLines={2}>
                        {issue.title}
                    </Text>
                    
                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.accentLight} />
                        <Text style={styles.metaText} numberOfLines={1}>{issue.location || 'Location not set'}</Text>
                    </View>

                    <View style={styles.actionsRow}>
                        <View style={styles.socialActions}>
                            <AnimatedPressable onPress={handleUpvote} activeScale={0.92}>
                                <View style={[styles.actionBtn, hasVoted && styles.actionBtnActive]}>
                                    <Animated.View style={{ transform: [{ scale: voteAnim }] }}>
                                        <MaterialCommunityIcons 
                                            name={hasVoted ? 'arrow-up-bold' : 'arrow-up-bold-outline'} 
                                            size={20} 
                                            color={hasVoted ? Colors.accentLight : Colors.textSecondary} 
                                        />
                                    </Animated.View>
                                    <Text style={[styles.actionCount, hasVoted && styles.actionCountActive]}>{localVotes}</Text>
                                </View>
                            </AnimatedPressable>

                            <AnimatedPressable onPress={handleComment} activeScale={0.92}>
                                <View style={styles.actionBtn}>
                                    <MaterialCommunityIcons name="comment-text-outline" size={19} color={Colors.textSecondary} />
                                    <Text style={styles.actionCount}>{localCommentCount}</Text>
                                </View>
                            </AnimatedPressable>

                            <AnimatedPressable onPress={handleShare} activeScale={0.92}>
                                <View style={styles.actionBtn}>
                                    <MaterialCommunityIcons name="share-variant-outline" size={19} color={Colors.textSecondary} />
                                </View>
                            </AnimatedPressable>
                        </View>

                        {showActions && localStatus !== 'Solved' && localStatus !== 'Failed' && !isAuthor && (
                            <AnimatedPressable onPress={handleSolve} disabled={isSolving} activeScale={0.95}>
                                {isSolving ? (
                                    <View style={[styles.primaryActionBtn, styles.primaryActionBtnActive]}>
                                        <MaterialCommunityIcons name="hand-heart" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                                        <Text style={[styles.primaryActionText, { color: Colors.success }]}>Helping</Text>
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={[Colors.accentDark, Colors.accent]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryActionBtn}
                                    >
                                        <Text style={styles.primaryActionText}>Help Solve</Text>
                                    </LinearGradient>
                                )}
                            </AnimatedPressable>
                        )}

                        {showActions && isAuthor && localStatus !== 'Solved' && localStatus !== 'Failed' && (
                            <AnimatedPressable onPress={() => handleUpdateStatus('Solved')} activeScale={0.95}>
                                <View style={[styles.primaryActionBtn, styles.markFixedBtn]}>
                                    <MaterialCommunityIcons name="check-circle-outline" size={14} color={Colors.success} style={{ marginRight: 4 }} />
                                    <Text style={[styles.primaryActionText, { color: Colors.success }]}>Mark Fixed</Text>
                                </View>
                            </AnimatedPressable>
                        )}
                    </View>
                </View>
            </Card>
            <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} issue={issue} />
            <CommentBottomSheet 
                visible={commentSheetVisible} 
                onClose={() => setCommentSheetVisible(false)} 
                issueId={issue.id} 
                initialComments={issue.comments || []}
                onCommentAdded={() => setLocalCommentCount(prev => prev + 1)}
            />
        </Animated.View>
    );
}

const styles = {
    card: {
        marginBottom: Spacing.lg,
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.card,
    },
    media: {
        width: '100%',
        height: 200,
        backgroundColor: Colors.surfaceElevated,
    },
    mediaGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
    },
    topBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryChipInline: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    urgencyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    categoryChipText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    textOnlyMedia: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contentSection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: Colors.accentSurface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    authorInitials: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.accentLight,
    },
    authorName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    authorMeta: {
        fontSize: 11,
        color: Colors.textTertiary,
        marginTop: 1,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 22,
        marginBottom: Spacing.sm,
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    metaText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginLeft: 4,
        flexShrink: 1,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    socialActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: Radius.pill,
        marginRight: 6,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    actionBtnActive: {
        backgroundColor: Colors.accentSurface,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    actionCount: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    actionCountActive: {
        color: Colors.accentLight,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: Radius.pill,
    },
    primaryActionBtnActive: {
        backgroundColor: Colors.successSurface,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    markFixedBtn: {
        backgroundColor: Colors.successSurface,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    primaryActionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 3,
    },
};

