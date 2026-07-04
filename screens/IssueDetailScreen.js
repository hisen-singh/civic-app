import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Keyboard, Linking, Animated, Alert } from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import IssueCard from '../components/IssueCard';
import BeforeAfterCard from '../components/BeforeAfterCard';
import { Colors, Radius, Spacing, Shadows } from '../theme';
import { timeAgo, isValidYouTubeUrl } from '../utils/timeAgo';
import * as ImagePicker from 'expo-image-picker';

export default function IssueDetailScreen({ route, navigation }) {
    const { issue: passedIssue, issueId: passedId } = route.params;
    const { user } = useAuth();
    
    const resolvedId = passedId || passedIssue?.id;
    const [currentIssue, setCurrentIssue] = useState(passedIssue || null);
    const [loading, setLoading] = useState(!passedIssue);
    const [comments, setComments] = useState(passedIssue?.comments || []);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [loading]);

    useFocusEffect(
        useCallback(() => {
            const fetchLatest = async () => {
                setLoading(true);
                try {
                    const updated = await IssueService.getIssueById(resolvedId);
                    if (updated) setCurrentIssue(updated);
                    
                    const { comments: fetchedComments } = await IssueService.getComments(resolvedId, 50, null);
                    setComments(fetchedComments);
                } catch (e) {
                    console.error('Error fetching issue/comments:', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchLatest();
        }, [resolvedId])
    );

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        if (!user) return;
        
        setSubmitting(true);
        try {
            const displayName = user?.displayName || user?.email?.split('@')[0] || 'Citizen';
            const newComment = await IssueService.addComment(currentIssue.id, {
                authorId: user.uid,
                authorName: displayName,
                text: commentText.trim()
            });
            
            setComments(prev => [...prev, newComment]);
            setCurrentIssue(prev => ({
                ...prev,
                commentsCount: (prev.commentsCount || 0) + 1
            }));
            setCommentText('');
            Keyboard.dismiss();
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        } catch (error) {
            console.error("Failed to add comment:", error);
            Alert.alert("Error", "Failed to submit comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // timeAgo is now imported from utils/timeAgo.js

    if (loading || !currentIssue) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={{ color: Colors.textTertiary, fontSize: 13, marginTop: 12 }}>Loading issue...</Text>
            </View>
        );
    }

    const statusOrder = { 'Open': 0, 'In Progress': 1, 'Solved': 2, 'Failed': 2 };
    const currentStep = statusOrder[currentIssue.status] ?? 0;
    const solverCount = (currentIssue.solvers || []).length;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.headerBackBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Details</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => {
                        if (currentIssue.youtubeUrl) {
                            if (isValidYouTubeUrl(currentIssue.youtubeUrl)) {
                                Linking.openURL(currentIssue.youtubeUrl);
                            } else {
                                Alert.alert('Invalid Link', 'This link does not appear to be a valid YouTube URL.');
                            }
                        }
                    }} 
                    activeOpacity={0.7} 
                    style={{ padding: 8, opacity: currentIssue.youtubeUrl ? 1 : 0 }}
                    disabled={!currentIssue.youtubeUrl}
                >
                    <MaterialCommunityIcons name="open-in-new" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView 
                ref={scrollRef} 
                style={{ flex: 1, opacity: fadeAnim }} 
                contentContainerStyle={{ paddingBottom: 40 }} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Issue Card */}
                <View style={{ marginTop: 4 }}>
                    <IssueCard issue={currentIssue} showActions={true} disablePress={true} onCommentPress={() => inputRef.current?.focus()} />
                </View>
                
                {/* Before/After Card */}
                {currentIssue.photo && currentIssue.afterPhoto && (
                    <BeforeAfterCard
                        beforePhoto={currentIssue.photo}
                        afterPhoto={currentIssue.afterPhoto}
                        title={currentIssue.title}
                    />
                )}

                {/* Add After Photo (for solvers of solved issues) */}
                {currentIssue.status === 'Solved' && !currentIssue.afterPhoto && 
                 currentIssue.photo && user && 
                 ((currentIssue.solvers || []).includes(user.uid) || currentIssue.authorId === user.uid) && (
                    <TouchableOpacity
                        onPress={async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5,
                            });
                            if (!result.canceled) {
                                setUploadingAfter(true);
                                try {
                                    const url = await IssueService.addAfterPhoto(currentIssue.id, result.assets[0].uri);
                                    setCurrentIssue(prev => ({ ...prev, afterPhoto: url }));
                                } catch (e) {
                                    console.error('After photo upload failed:', e);
                                } finally { setUploadingAfter(false); }
                            }
                        }}
                        disabled={uploadingAfter}
                        activeOpacity={0.8}
                        style={styles.afterPhotoBtn}
                    >
                        <View style={styles.afterPhotoIconWrap}>
                            {uploadingAfter ? (
                                <ActivityIndicator size={18} color={Colors.success} />
                            ) : (
                                <MaterialCommunityIcons name="camera-plus-outline" size={20} color={Colors.success} />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.afterPhotoBtnTitle}>
                                {uploadingAfter ? 'Uploading...' : 'Add "After" Photo'}
                            </Text>
                            <Text style={styles.afterPhotoBtnSub}>Show the community what you fixed</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                )}
                
                {/* YouTube Link */}
                {currentIssue.youtubeUrl && isValidYouTubeUrl(currentIssue.youtubeUrl) ? (
                    <TouchableOpacity 
                        onPress={() => Linking.openURL(currentIssue.youtubeUrl).catch(err => console.error("Couldn't load page", err))}
                        activeOpacity={0.8}
                        style={styles.youtubeBtn}
                    >
                        <View style={styles.youtubeIconWrap}>
                            <MaterialCommunityIcons name="youtube" size={20} color="#FF0000" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.youtubeBtnTitle}>Watch Video</Text>
                            <Text style={styles.youtubeBtnSub}>Opens in YouTube</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                ) : null}

                {/* Status Timeline */}
                <View style={styles.timelineSection}>
                    <Text style={styles.sectionTitle}>Status Timeline</Text>
                    <View style={styles.timelineCard}>
                        {[
                            { label: 'Reported', icon: 'clipboard-check-outline', status: 'Open', desc: 'Issue has been filed' },
                            { label: 'In Progress', icon: 'progress-wrench', status: 'In Progress', desc: `${solverCount} volunteer${solverCount !== 1 ? 's' : ''} working` },
                            { label: 'Resolved', icon: 'check-decagram', status: 'Solved', desc: 'Issue has been fixed' },
                        ].map((step, index) => {
                            const isActive = index <= currentStep;
                            const isFailed = currentIssue.status === 'Failed' && index === 2;
                            const isCurrent = index === currentStep;

                            return (
                                <View key={step.status} style={styles.timelineStep}>
                                    {/* Connector line (above) */}
                                    {index > 0 && (
                                        <View style={[
                                            styles.connectorLine,
                                            isActive && !isFailed && styles.connectorLineActive,
                                            isFailed && styles.connectorLineFailed,
                                        ]} />
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[
                                            styles.timelineNode,
                                            isActive && !isFailed && styles.timelineNodeActive,
                                            isFailed && styles.timelineNodeFailed,
                                            isCurrent && !isFailed && styles.timelineNodeCurrent,
                                        ]}>
                                            <MaterialCommunityIcons 
                                                name={isFailed ? 'close' : step.icon} 
                                                size={18} 
                                                color={isFailed ? Colors.error : isActive ? '#FFF' : Colors.textTertiary} 
                                            />
                                        </View>
                                        <View style={{ marginLeft: 14, flex: 1 }}>
                                            <Text style={[
                                                styles.timelineLabel,
                                                isActive && !isFailed && { color: Colors.textPrimary },
                                                isFailed && { color: Colors.error },
                                            ]}>
                                                {isFailed ? 'Failed' : step.label}
                                            </Text>
                                            <Text style={styles.timelineDesc}>
                                                {isFailed ? 'Issue could not be resolved' : step.desc}
                                            </Text>
                                        </View>
                                        {isCurrent && !isFailed && (
                                            <View style={styles.currentBadge}>
                                                <Text style={styles.currentBadgeText}>CURRENT</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Info Row */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.infoText}>Reported {timeAgo(currentIssue.createdAt)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.infoText} numberOfLines={1}>{currentIssue.location || 'No location'}</Text>
                    </View>
                </View>

                {/* Comments */}
                <View style={styles.commentsSection}>
                    <View style={styles.commentsSectionHeader}>
                        <Text style={styles.sectionTitle}>Discussion</Text>
                        <View style={styles.commentCountBadge}>
                            <Text style={styles.commentCountText}>{comments.length}</Text>
                        </View>
                    </View>

                    {comments.length === 0 ? (
                        <View style={styles.emptyComments}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="chat-outline" size={28} color={Colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No comments yet</Text>
                            <Text style={styles.emptyDesc}>Be the first to start the conversation.</Text>
                        </View>
                    ) : (
                        comments.map((comment, index) => (
                            <Animated.View key={comment.id} style={styles.commentCard}>
                                <Avatar.Text 
                                    size={34} 
                                    label={(comment.authorName || 'U').substring(0, 2).toUpperCase()} 
                                    style={{ backgroundColor: index % 2 === 0 ? Colors.accent : Colors.accentDark, marginRight: 12 }} 
                                    labelStyle={{ fontSize: 11, fontWeight: '700' }}
                                />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={styles.commentAuthor}>{comment.authorName || 'Anonymous'}</Text>
                                        <Text style={styles.commentTime}> · {timeAgo(comment.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.commentText}>{comment.text}</Text>
                                </View>
                            </Animated.View>
                        ))
                    )}
                </View>
            </Animated.ScrollView>

            {/* Comment Input */}
            <View style={styles.commentInputBar}>
                <View style={styles.commentInputWrap}>
                    <TextInput
                        ref={inputRef}
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Add a comment..."
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        mode="flat"
                        style={styles.commentInput}
                        textColor={Colors.textPrimary}
                        theme={{ colors: { primary: 'transparent' } }}
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                    />
                </View>
                <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || submitting}
                    activeOpacity={0.7}
                    style={[styles.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.35, backgroundColor: Colors.surfaceElevated }]}
                >
                    {submitting ? (
                        <ActivityIndicator size={16} color="#FFF" />
                    ) : (
                        <MaterialCommunityIcons name="send" size={18} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = {
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.headerTop,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    headerBackBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    youtubeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    youtubeIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    youtubeBtnTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    youtubeBtnSub: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    timelineSection: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xxl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    timelineCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginTop: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timelineStep: {
        paddingVertical: 6,
    },
    connectorLine: {
        width: 2,
        height: 18,
        marginLeft: 19,
        backgroundColor: Colors.border,
        marginBottom: 4,
    },
    connectorLineActive: {
        backgroundColor: Colors.success,
    },
    connectorLineFailed: {
        backgroundColor: Colors.error,
    },
    timelineNode: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineNodeActive: {
        backgroundColor: Colors.success,
        borderColor: Colors.success,
    },
    timelineNodeFailed: {
        backgroundColor: Colors.errorSurface,
        borderColor: Colors.error,
    },
    timelineNodeCurrent: {
        ...Shadows.subtle,
    },
    timelineLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textTertiary,
    },
    timelineDesc: {
        fontSize: 12,
        color: Colors.textTertiary,
        marginTop: 1,
    },
    currentBadge: {
        backgroundColor: Colors.accentSurface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    currentBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: Colors.accent,
        letterSpacing: 0.5,
    },
    infoRow: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    infoText: {
        fontSize: 12,
        color: Colors.textTertiary,
        marginLeft: 6,
    },
    commentsSection: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xxl,
    },
    commentsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    commentCountBadge: {
        backgroundColor: Colors.surfaceElevated,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.pill,
        marginLeft: 10,
    },
    commentCountText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    emptyComments: {
        backgroundColor: Colors.surface,
        padding: Spacing.xxxl,
        borderRadius: Radius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    emptyDesc: {
        fontSize: 13,
        color: Colors.textTertiary,
    },
    commentCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: Radius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    commentAuthor: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    commentTime: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    commentText: {
        color: Colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    commentInputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    commentInputWrap: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    commentInput: {
        backgroundColor: 'transparent',
        maxHeight: 100,
        fontSize: 14,
        paddingHorizontal: 4,
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    afterPhotoBtn: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: Spacing.lg, marginTop: Spacing.md,
        padding: Spacing.lg, backgroundColor: Colors.surface,
        borderRadius: Radius.lg, borderWidth: 1.5,
        borderColor: Colors.success + '30', borderStyle: 'dashed',
    },
    afterPhotoIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.successSurface,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    afterPhotoBtnTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    afterPhotoBtnSub: { fontSize: 11, color: Colors.textTertiary },
};
