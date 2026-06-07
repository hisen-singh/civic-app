import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, Share, Alert, Linking, Animated } from 'react-native';
import { Card, Text, Button, ProgressBar, Avatar, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Spacing, Shadows } from '../theme';

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

    const handleUpvote = async () => {
        if (hasVoted || !user) return;
        
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
            Linking.openURL(issue.youtubeUrl).catch(err => console.error("Couldn't load page", err));
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
            navigation.navigate('IssueDetail', { issueId: issue.id });
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `📌 ${issue.title}\n📍 ${issue.location || 'Unknown'}\n📝 ${issue.description || ''}\n\nHelp solve this issue — reported on Civic.`,
            });
        } catch (e) {
            console.error('Share error:', e);
        }
    };

    const authorName = issue.authorName || 'Citizen';
    const initials = authorName.substring(0, 2).toUpperCase();
    const commentCount = (issue.comments || []).length;
    
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

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Card style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <Avatar.Text 
                        size={36} 
                        label={initials} 
                        style={{ backgroundColor: Colors.accent, marginRight: 12 }} 
                        labelStyle={{ fontSize: 13, fontWeight: '700' }} 
                    />
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.authorName}>{authorName}</Text>
                            <Text style={styles.timestamp}>· {timeAgo(issue.createdAt)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textTertiary} />
                            <Text style={styles.location}> {issue.location || 'Location not set'}</Text>
                        </View>
                    </View>
                    <StatusBadge status={localStatus} />
                    {isAuthor && (
                        <Menu
                            visible={menuVisible}
                            onDismiss={closeMenu}
                            anchor={
                                <TouchableOpacity onPress={openMenu} style={{ marginLeft: 8, padding: 4 }}>
                                    <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            }
                            contentStyle={{ backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md }}
                        >
                            <Menu.Item 
                                onPress={handleDelete} 
                                title="Delete Report" 
                                titleStyle={{ color: Colors.error, fontSize: 14 }} 
                                leadingIcon={() => <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.error} />}
                            />
                        </Menu>
                    )}
                </View>

                {/* Media Section */}
                <TouchableOpacity activeOpacity={disablePress ? 1 : 0.9} onPress={handleCardPress}>
                    {hasMedia ? (
                        <View>
                            <Image
                                source={{ uri: issue.photo || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                                style={styles.media}
                                resizeMode="cover"
                            />
                            {ytId && (
                                <View style={styles.playOverlay}>
                                    <View style={styles.playButton}>
                                        <MaterialCommunityIcons name="play" size={32} color="#FFF" />
                                    </View>
                                </View>
                            )}
                            {/* Category chip on media */}
                            <View style={styles.categoryChip}>
                                <Text style={styles.categoryChipText}>{issue.category || 'Issue'}</Text>
                            </View>
                        </View>
                    ) : (
                        /* Text-only card: show category + title prominently */
                        <View style={styles.textOnlySection}>
                            <View style={styles.categoryChipInline}>
                                <Text style={styles.categoryChipText}>{issue.category || 'Issue'}</Text>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Actions Bar */}
                <View style={styles.actionsBar}>
                    <TouchableOpacity onPress={handleUpvote} style={styles.actionBtn} activeOpacity={0.7}>
                        <Animated.View style={{ transform: [{ scale: voteAnim }] }}>
                            <MaterialCommunityIcons 
                                name={hasVoted ? 'arrow-up-bold' : 'arrow-up-bold-outline'} 
                                size={26} 
                                color={hasVoted ? Colors.success : Colors.textPrimary} 
                            />
                        </Animated.View>
                        <Text style={[styles.actionCount, hasVoted && { color: Colors.success }]}>{localVotes}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleComment} style={styles.actionBtn} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="comment-outline" size={22} color={Colors.textPrimary} style={{ transform: [{ scaleX: -1 }] }} />
                        {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare} style={styles.actionBtn} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="share-outline" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />
                    <ImpactBadge impact={issue.urgency || issue.impact || 'medium'} />
                </View>

                {/* Title & Description */}
                <View style={styles.contentSection}>
                    <Text style={styles.titleText}>
                        {issue.title}
                    </Text>
                    
                    {issue.description && (
                        <Text style={styles.descText} numberOfLines={3}>
                            {issue.description}
                        </Text>
                    )}

                    {commentCount > 0 && (
                        <TouchableOpacity onPress={handleComment} activeOpacity={0.7} style={{ marginTop: 8 }}>
                            <Text style={styles.viewComments}>
                                View all {commentCount} comments
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Urgency bar */}
                    <View style={styles.urgencyRow}>
                        <Text style={styles.urgencyLabel}>Urgency</Text>
                        <View style={{ flex: 1 }}>
                            <ProgressBar
                                progress={({ critical: 1, high: 0.75, medium: 0.5, low: 0.25 })[issue.urgency] || 0.5}
                                color={({ critical: Colors.critical, high: Colors.high, medium: Colors.medium, low: Colors.low })[issue.urgency] || Colors.medium}
                                style={styles.urgencyBar}
                            />
                        </View>
                    </View>

                    {/* Solve Actions */}
                    {showActions && localStatus !== 'Solved' && localStatus !== 'Failed' && !isAuthor && (
                        <TouchableOpacity
                            onPress={handleSolve}
                            disabled={isSolving}
                            activeOpacity={0.8}
                            style={[styles.solveBtn, isSolving && styles.solveBtnActive]}
                        >
                            <MaterialCommunityIcons 
                                name={isSolving ? "check-circle" : "hand-heart"} 
                                size={18} 
                                color={isSolving ? Colors.success : '#FFF'} 
                                style={{ marginRight: 8 }} 
                            />
                            <Text style={[styles.solveBtnText, isSolving && { color: Colors.success }]}>
                                {isSolving ? "You're helping" : "Help Solve"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showActions && isAuthor && localStatus !== 'Solved' && localStatus !== 'Failed' && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={styles.authorPrompt}>You reported this. Is it resolved?</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TouchableOpacity 
                                    onPress={() => handleUpdateStatus('Solved')} 
                                    activeOpacity={0.8}
                                    style={[styles.statusBtn, { backgroundColor: Colors.successSurface, borderColor: Colors.success }]}
                                >
                                    <MaterialCommunityIcons name="check" size={16} color={Colors.success} style={{ marginRight: 6 }} />
                                    <Text style={[styles.statusBtnText, { color: Colors.success }]}>Resolved</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => handleUpdateStatus('Failed')} 
                                    activeOpacity={0.8}
                                    style={[styles.statusBtn, { backgroundColor: Colors.errorSurface, borderColor: Colors.error }]}
                                >
                                    <MaterialCommunityIcons name="close" size={16} color={Colors.error} style={{ marginRight: 6 }} />
                                    <Text style={[styles.statusBtnText, { color: Colors.error }]}>Not Fixed</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Card>
        </Animated.View>
    );
}

const styles = {
    card: {
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.card,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    authorName: {
        fontWeight: '700',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    timestamp: {
        fontSize: 12,
        color: Colors.textTertiary,
        marginLeft: 6,
    },
    location: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    media: {
        width: '100%',
        height: 280,
        backgroundColor: Colors.surfaceElevated,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4,
    },
    categoryChip: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(10, 14, 26, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    categoryChipInline: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.accentSurface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    categoryChipText: {
        color: Colors.textPrimary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    textOnlySection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: 4,
        paddingBottom: 8,
    },
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: Spacing.xl,
    },
    actionCount: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
    },
    contentSection: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    titleText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 21,
        marginBottom: 4,
    },
    descText: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    viewComments: {
        color: Colors.textTertiary,
        fontSize: 13,
    },
    urgencyRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    urgencyLabel: {
        fontSize: 11,
        color: Colors.textTertiary,
        fontWeight: '700',
        marginRight: 12,
        textTransform: 'uppercase',
        width: 55,
    },
    urgencyBar: {
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.surfaceElevated,
    },
    solveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        paddingVertical: 12,
        borderRadius: Radius.sm,
        backgroundColor: Colors.accent,
    },
    solveBtnActive: {
        backgroundColor: Colors.successSurface,
        borderWidth: 1,
        borderColor: Colors.success,
    },
    solveBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    authorPrompt: {
        color: Colors.textTertiary,
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'center',
    },
    statusBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: Radius.sm,
        borderWidth: 1,
        marginHorizontal: 4,
    },
    statusBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
};
