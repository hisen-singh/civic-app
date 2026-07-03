import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, TextInput, Keyboard, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from 'react-native-paper';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Radius, Spacing, Shadows } from '../theme';

export default function CommentBottomSheet({ visible, onClose, issueId, initialComments = [], onCommentAdded }) {
    const { user } = useAuth();
    const [comments, setComments] = useState(initialComments);
    const [loading, setLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const slideAnim = useRef(new Animated.Value(500)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
            ]).start();
            fetchComments();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true })
            ]).start();
        }
    }, [visible, issueId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const fetchedComments = await IssueService.getComments(issueId);
            // Merge initial comments with fetched
            const combined = [...initialComments, ...fetchedComments];
            const uniqueComments = combined.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            setComments(uniqueComments);
            // Auto scroll to bottom
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            console.error('Error fetching comments:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        console.log("handleAddComment triggered. commentText:", commentText, "user:", user?.uid, "submitting:", submitting);
        if (!commentText.trim() || !user || submitting) {
            console.log("Early return. Missing text, user, or already submitting");
            if (!user) alert("You must be logged in to comment.");
            return;
        }
        
        setSubmitting(true);
        try {
            const displayName = user?.displayName || user?.email?.split('@')[0] || 'Citizen';
            const newComment = await IssueService.addComment(issueId, {
                authorId: user.uid,
                authorName: displayName,
                text: commentText.trim()
            });
            console.log("Comment added successfully:", newComment);
            
            setComments(prev => [...prev, newComment]);
            setCommentText('');
            Keyboard.dismiss();
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
            
            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Failed to submit comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} activeOpacity={1} />
                </Animated.View>
                
                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
                    {/* Header with drag handle */}
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.headerTitle}>Comments</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Comments List */}
                    <ScrollView 
                        ref={scrollRef}
                        style={styles.commentsList}
                        contentContainerStyle={styles.commentsContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {loading && comments.length === 0 ? (
                            <ActivityIndicator size="small" color={Colors.accent} style={{ marginTop: 20 }} />
                        ) : comments.length === 0 ? (
                            <View style={styles.emptyComments}>
                                <Text style={styles.emptyTitle}>No comments yet</Text>
                                <Text style={styles.emptyDesc}>Be the first to start the conversation.</Text>
                            </View>
                        ) : (
                            comments.map((comment, index) => (
                                <View key={comment.id || index} style={styles.commentItem}>
                                    <Avatar.Text 
                                        size={36} 
                                        label={(comment.authorName || 'U').substring(0, 2).toUpperCase()} 
                                        style={{ backgroundColor: index % 2 === 0 ? Colors.accent : Colors.accentDark, marginRight: 12 }} 
                                        labelStyle={{ fontSize: 12, fontWeight: '700' }}
                                    />
                                    <View style={styles.commentBody}>
                                        <View style={styles.commentMeta}>
                                            <Text style={styles.commentAuthor}>{comment.authorName || 'Anonymous'}</Text>
                                            <Text style={styles.commentTime}>  {timeAgo(comment.createdAt)}</Text>
                                        </View>
                                        <Text style={styles.commentText}>{comment.text}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* Input Area */}
                    <View style={styles.inputArea}>
                        <TextInput
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder="Add a comment..."
                            placeholderTextColor={Colors.textTertiary}
                            style={styles.input}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity 
                            onPress={handleAddComment}
                            disabled={!commentText.trim() || submitting}
                            style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
                        >
                            {submitting ? (
                                <ActivityIndicator size={16} color="#FFF" />
                            ) : (
                                <MaterialCommunityIcons name="arrow-up" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = {
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    overlayTouchable: {
        flex: 1,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '75%',
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...Shadows.fab,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 4,
    },
    commentsList: {
        flex: 1,
    },
    commentsContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.xxxl,
    },
    emptyComments: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptyDesc: {
        color: Colors.textTertiary,
        fontSize: 14,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: Spacing.xl,
    },
    commentBody: {
        flex: 1,
    },
    commentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentAuthor: {
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    commentTime: {
        color: Colors.textTertiary,
        fontSize: 12,
    },
    commentText: {
        color: Colors.textPrimary,
        fontSize: 14,
        lineHeight: 20,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
        backgroundColor: Colors.surfaceElevated,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background,
        color: Colors.textPrimary,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        marginRight: 12,
        fontSize: 14,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: Colors.border,
    }
};

import { StyleSheet } from 'react-native';
