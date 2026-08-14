import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  Linking,
  Animated,
  Alert,
} from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { IssueService } from '../services/IssueService';
import { useAuth } from '../contexts/AuthContext';
import IssueCard from '../components/IssueCard';
import BeforeAfterCard from '../components/BeforeAfterCard';
import { Spacing, Shadows, theme } from '../theme';
import { timeAgo, isValidYouTubeUrl } from '../utils/timeAgo';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import NativeImpactCard from '../components/NativeImpactCard';
import ReportBottomSheet from '../components/ReportBottomSheet';

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
  const impactCardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // { type, commentId }

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      const fetchLatest = async () => {
        setLoading(true);
        try {
          const updated = await IssueService.getIssueById(resolvedId);
          if (updated) setCurrentIssue(updated);

          const { comments: fetchedComments } = await IssueService.getComments(
            resolvedId,
            50,
            null,
          );
          setComments(fetchedComments);
        } catch (e) {
          console.error('Error fetching issue/comments:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchLatest();
    }, [resolvedId]),
  );

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    if (!user) return;

    setSubmitting(true);
    try {
      const displayName =
        user?.displayName || user?.email?.split('@')[0] || 'Citizen';
      const newComment = await IssueService.addComment(currentIssue.id, {
        authorId: user.uid,
        authorName: displayName,
        text: commentText.trim(),
      });

      setComments((prev) => [...prev, newComment]);
      setCurrentIssue((prev) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
      setCommentText('');
      Keyboard.dismiss();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (error) {
      console.error('Failed to add comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailCityCouncil = async () => {
    try {
      const html = `
                <html>
                    <body style="font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #111;">
                        <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                            <h1 style="margin: 0; color: #000; text-transform: uppercase; font-size: 24px; letter-spacing: -0.5px;">Official Civic Issue Report</h1>
                        </div>
                        <h2 style="font-size: 20px; margin-bottom: 10px;">${currentIssue.title}</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;"><strong>Category:</strong> ${currentIssue.category || 'N/A'}</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;"><strong>Urgency:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${currentIssue.urgency === 'critical' ? '#EF4444' : '#000'};">${currentIssue.urgency || 'Medium'}</span></td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;"><strong>Location:</strong> ${currentIssue.location || 'Unknown'}</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;"><strong>Reported On:</strong> ${new Date(currentIssue.createdAt).toLocaleDateString()}</td>
                            </tr>
                        </table>
                        <h3 style="margin-bottom: 10px; font-size: 16px;">Description</h3>
                        <p style="background: #F8FAFC; padding: 15px; border-radius: 8px; line-height: 1.5; font-size: 14px;">
                            ${currentIssue.description || 'No description provided.'}
                        </p>
                        ${
                          currentIssue.photo
                            ? `
                            <h3 style="margin-top: 20px; font-size: 16px;">Attached Evidence</h3>
                            <img src="${currentIssue.photo}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #E2E8F0;"/>
                        `
                            : ''
                        }
                        <div style="margin-top: 40px; font-size: 12px; color: #64748B; text-align: center;">
                            <p>Generated by Civic Platform</p>
                        </div>
                    </body>
                </html>
            `;

      const { uri } = await Print.printToFileAsync({ html });

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [],
          subject: `Civic Report: ${currentIssue.title}`,
          body: `To the City Council,\n\nPlease review the attached official report regarding an unresolved issue in our community.\n\nThank you.`,
          attachments: [uri],
        });
      } else {
        Alert.alert('Error', 'Mail is not available on this device');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate report.');
    }
  };

  const handleShareToSocials = async () => {
    if (!impactCardRef.current) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(impactCardRef, {
        format: 'png',
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share Civic Impact',
          mimeType: 'image/png',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Failed to generate impact card:', error);
      Alert.alert('Error', 'Failed to share image.');
    } finally {
      setIsSharing(false);
    }
  };

  // timeAgo is now imported from utils/timeAgo.js

  if (loading || !currentIssue) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.accentBrand} />
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 13,
            marginTop: 12,
            fontWeight: '700',
          }}
        >
          LOADING ISSUE...
        </Text>
      </View>
    );
  }

  const statusOrder = { Open: 0, 'In Progress': 1, Solved: 2, Failed: 2 };
  const currentStep = statusOrder[currentIssue.status] ?? 0;
  const solverCount = (currentIssue.solvers || []).length;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.headerBackBtn}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>DETAILS</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (currentIssue.youtubeUrl) {
                if (isValidYouTubeUrl(currentIssue.youtubeUrl)) {
                  Linking.openURL(currentIssue.youtubeUrl);
                } else {
                  Alert.alert(
                    'Invalid Link',
                    'This link does not appear to be a valid YouTube URL.',
                  );
                }
              }
            }}
            activeOpacity={0.7}
            style={{ padding: 8, opacity: currentIssue.youtubeUrl ? 1 : 0 }}
            disabled={!currentIssue.youtubeUrl}
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={20}
              color={theme.colors.textPrimary}
            />
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
            <IssueCard
              issue={currentIssue}
              showActions={true}
              disablePress={true}
              onCommentPress={() => inputRef.current?.focus()}
            />
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
          {currentIssue.status === 'Solved' &&
            !currentIssue.afterPhoto &&
            currentIssue.photo &&
            user &&
            ((currentIssue.solvers || []).includes(user.uid) ||
              currentIssue.authorId === user.uid) && (
              <TouchableOpacity
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.5,
                  });
                  if (!result.canceled) {
                    setUploadingAfter(true);
                    try {
                      const url = await IssueService.addAfterPhoto(
                        currentIssue.id,
                        result.assets[0].uri,
                      );
                      setCurrentIssue((prev) => ({ ...prev, afterPhoto: url }));
                    } catch (e) {
                      console.error('After photo upload failed:', e);
                    } finally {
                      setUploadingAfter(false);
                    }
                  }
                }}
                disabled={uploadingAfter}
                activeOpacity={0.8}
                style={styles.afterPhotoBtn}
              >
                <View style={styles.afterPhotoIconWrap}>
                  {uploadingAfter ? (
                    <ActivityIndicator
                      size={18}
                      color={theme.colors.accentBrand}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="camera-plus-outline"
                      size={20}
                      color={theme.colors.accentBrand}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.afterPhotoBtnTitle}>
                    {uploadingAfter ? 'UPLOADING...' : 'ADD "AFTER" PHOTO'}
                  </Text>
                  <Text style={styles.afterPhotoBtnSub}>
                    SHOW THE COMMUNITY WHAT YOU FIXED
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            )}

          {/* YouTube Link */}
          {currentIssue.youtubeUrl &&
          isValidYouTubeUrl(currentIssue.youtubeUrl) ? (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(currentIssue.youtubeUrl).catch((err) =>
                  console.error("Couldn't load page", err),
                )
              }
              activeOpacity={0.8}
              style={styles.youtubeBtn}
            >
              <View style={styles.youtubeIconWrap}>
                <MaterialCommunityIcons
                  name="youtube"
                  size={20}
                  color={theme.colors.accentBrand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.youtubeBtnTitle}>WATCH VIDEO</Text>
                <Text style={styles.youtubeBtnSub}>OPENS IN YOUTUBE</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}

          {/* Status Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>STATUS TIMELINE</Text>
            <View style={styles.timelineCard}>
              {[
                {
                  label: 'Reported',
                  icon: 'clipboard-check-outline',
                  status: 'Open',
                  desc: 'Issue has been filed',
                },
                {
                  label: 'In Progress',
                  icon: 'progress-wrench',
                  status: 'In Progress',
                  desc: `${solverCount} volunteer${solverCount !== 1 ? 's' : ''} working`,
                },
                {
                  label: 'Resolved',
                  icon: 'check-decagram',
                  status: 'Solved',
                  desc: 'Issue has been fixed',
                },
              ].map((step, index) => {
                const isActive = index <= currentStep;
                const isFailed =
                  currentIssue.status === 'Failed' && index === 2;
                const isCurrent = index === currentStep;

                return (
                  <View key={step.status} style={styles.timelineStep}>
                    {/* Connector line (above) */}
                    {index > 0 && (
                      <View
                        style={[
                          styles.connectorLine,
                          isActive && !isFailed && styles.connectorLineActive,
                          isFailed && styles.connectorLineFailed,
                        ]}
                      />
                    )}
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View
                        style={[
                          styles.timelineNode,
                          isActive && !isFailed && styles.timelineNodeActive,
                          isFailed && styles.timelineNodeFailed,
                          isCurrent && !isFailed && styles.timelineNodeCurrent,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isFailed ? 'close' : step.icon}
                          size={18}
                          color={
                            isFailed
                              ? '#FFF'
                              : isActive
                                ? '#FFF'
                                : theme.colors.textMuted
                          }
                        />
                      </View>
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            isActive &&
                              !isFailed && { color: theme.colors.textPrimary },
                            isFailed && { color: theme.colors.accentBrand },
                          ]}
                        >
                          {isFailed ? 'FAILED' : step.label.toUpperCase()}
                        </Text>
                        <Text style={styles.timelineDesc}>
                          {isFailed
                            ? 'ISSUE COULD NOT BE RESOLVED'
                            : step.desc.toUpperCase()}
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

          {/* Email City Council Action */}
          {(currentIssue.status === 'Open' ||
            currentIssue.status === 'In Progress') && (
            <TouchableOpacity
              onPress={handleEmailCityCouncil}
              activeOpacity={0.8}
              style={styles.emailBtn}
            >
              <View style={styles.emailIconWrap}>
                <MaterialCommunityIcons
                  name="email-fast-outline"
                  size={20}
                  color={theme.colors.accentBrand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emailBtnTitle}>EMAIL CITY COUNCIL</Text>
                <Text style={styles.emailBtnSub}>
                  GENERATE A FORMAL PDF REPORT
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {/* Share To Socials Action */}
          <TouchableOpacity
            onPress={handleShareToSocials}
            disabled={isSharing}
            activeOpacity={0.8}
            style={styles.shareBtn}
            accessibilityRole="button"
            accessibilityLabel="Share to Social Media"
          >
            <View style={styles.shareIconWrap}>
              {isSharing ? (
                <ActivityIndicator size={20} color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons
                  name="instagram"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareBtnTitle}>SHARE TO SOCIALS</Text>
              <Text style={styles.shareBtnSub}>
                EXPORT IMPACT CARD TO IG/TWITTER
              </Text>
            </View>
            <MaterialCommunityIcons
              name="export-variant"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={theme.colors.textMuted}
              />
              <Text style={styles.infoText}>
                REPORTED {timeAgo(currentIssue.createdAt).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color={theme.colors.textMuted}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {currentIssue.location
                  ? currentIssue.location.toUpperCase()
                  : 'NO LOCATION'}
              </Text>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsSectionHeader}>
              <Text style={styles.sectionTitle}>DISCUSSION</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{comments.length}</Text>
              </View>
            </View>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={28}
                    color={theme.colors.textMuted}
                  />
                </View>
                <Text style={styles.emptyTitle}>NO COMMENTS YET</Text>
                <Text style={styles.emptyDesc}>
                  BE THE FIRST TO START THE CONVERSATION.
                </Text>
              </View>
            ) : (
              comments.map((comment, index) => (
                <Animated.View key={comment.id} style={styles.commentCard}>
                  <Avatar.Text
                    size={34}
                    label={(comment.authorName || 'U')
                      .substring(0, 2)
                      .toUpperCase()}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderWidth: 2,
                      borderColor: theme.colors.border,
                      borderRadius: 0,
                      marginRight: 12,
                    }}
                    labelStyle={{
                      fontSize: 11,
                      fontWeight: '900',
                      color: theme.colors.textPrimary,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={styles.commentAuthor}>
                        {comment.authorName
                          ? comment.authorName.toUpperCase()
                          : 'ANONYMOUS'}
                      </Text>
                      <Text style={styles.commentTime}>
                        {' '}
                        · {timeAgo(comment.createdAt).toUpperCase()}
                      </Text>
                      {user && comment.authorId !== user.uid && (
                        <TouchableOpacity
                          onPress={() =>
                            setReportTarget({
                              type: 'comment',
                              commentId: comment.id,
                            })
                          }
                          style={{ marginLeft: 'auto', padding: 4 }}
                          activeOpacity={0.7}
                          accessibilityLabel="Report comment"
                        >
                          <MaterialCommunityIcons
                            name="flag-outline"
                            size={14}
                            color={theme.colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </Animated.ScrollView>

        {/* Hidden Native Impact Card for Screenshotting */}
        <View
          style={{ position: 'absolute', top: -10000, left: -10000 }}
          pointerEvents="none"
          collapsable={false}
        >
          <View ref={impactCardRef} collapsable={false}>
            <NativeImpactCard issue={currentIssue} />
          </View>
        </View>

        {/* Comment Input */}
        <View style={styles.commentInputBar}>
          <View style={styles.commentInputWrap}>
            <TextInput
              ref={inputRef}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              mode="flat"
              style={styles.commentInput}
              textColor={theme.colors.textPrimary}
              theme={{ colors: { primary: 'transparent' } }}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />
          </View>
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
            activeOpacity={0.7}
            style={[
              styles.sendBtn,
              (!commentText.trim() || submitting) && {
                opacity: 0.35,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size={16} color="#FFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <ReportBottomSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType={reportTarget?.type || 'comment'}
        issueId={resolvedId}
        commentId={reportTarget?.commentId}
      />
    </>
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerBackBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  youtubeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  youtubeBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  youtubeBtnSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  timelineSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  timelineStep: {
    paddingVertical: 6,
  },
  connectorLine: {
    width: 2,
    height: 18,
    marginLeft: 19,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  connectorLineActive: {
    backgroundColor: theme.colors.accentBrand,
  },
  connectorLineFailed: {
    backgroundColor: theme.colors.textPrimary,
  },
  timelineNode: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeActive: {
    backgroundColor: theme.colors.accentBrand,
    borderColor: theme.colors.accentBrand,
  },
  timelineNodeFailed: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  timelineNodeCurrent: {
    ...Shadows.card,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  timelineDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  currentBadge: {
    backgroundColor: theme.colors.accentBrand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFF',
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
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    marginLeft: 10,
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  emptyComments: {
    backgroundColor: theme.colors.surface,
    padding: Spacing.xxxl,
    borderRadius: 0,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  commentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    padding: Spacing.lg,
    borderRadius: 0,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  commentText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 2,
    borderColor: theme.colors.border,
  },
  commentInputWrap: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
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
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentBrand,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  afterPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    borderStyle: 'dashed',
  },
  afterPhotoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  afterPhotoBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  afterPhotoBtnSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  emailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emailBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emailBtnSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    minHeight: 48,
    backgroundColor: theme.colors.accentBrand,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...Shadows.card,
  },
  shareIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  shareBtnTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  shareBtnSub: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
};
