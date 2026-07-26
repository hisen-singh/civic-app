import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Animated,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../contexts/AuthContext";
import { IssueService } from "../services/IssueService";
import { useNavigation } from "@react-navigation/native";
import { Spacing, Shadows, theme } from "../theme";
import { timeAgo, isValidYouTubeUrl } from "../utils/timeAgo";
import ShareModal from "./ShareModal";
import CommentBottomSheet from "./CommentBottomSheet";
import AnimatedPressable from "./ui/AnimatedPressable";

const getYouTubeID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const ImpactBadge = ({ impact }) => {
  const impacts = {
    critical: {
      label: "CRITICAL",
      color: "#FFFFFF",
      bg: theme.colors.statusCritical,
    },
    high: {
      label: "HIGH",
      color: "#FFFFFF",
      bg: theme.colors.statusMedium,
    },
    medium: {
      label: "MEDIUM",
      color: "#FFFFFF",
      bg: theme.colors.statusMedium,
    },
    low: {
      label: "LOW",
      color: "#FFFFFF",
      bg: theme.colors.statusLow,
    },
  };
  const data = impacts[impact] || impacts.medium;
  return (
    <View
      style={{
        backgroundColor: data.bg,
        borderWidth: data.borderColor ? 1 : 0,
        borderColor: data.borderColor || "transparent",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
      }}
    >
      <Text
        style={{
          color: data.color,
          fontSize: 10,
          fontWeight: "900",
          letterSpacing: 0.5,
        }}
      >
        {data.label}
      </Text>
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const statuses = {
    Open: {
      label: "OPEN",
      color: theme.colors.textPrimary,
      bg: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    "In Progress": {
      label: "IN PROGRESS",
      color: theme.colors.textPrimary,
      bg: theme.colors.surface,
      borderColor: theme.colors.accentBrand,
    },
    Solved: {
      label: "RESOLVED",
      color: "#FFFFFF",
      bg: theme.colors.accentBrand,
    },
    Failed: {
      label: "FAILED",
      color: "#FFFFFF",
      bg: theme.colors.statusCritical,
    },
  };
  const data = statuses[status] || statuses["Open"];
  return (
    <View
      style={{
        backgroundColor: data.bg,
        borderWidth: 1,
        borderColor: data.borderColor || data.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
      }}
    >
      <Text
        style={{
          color: data.color,
          fontSize: 10,
          fontWeight: "900",
          letterSpacing: 0.5,
        }}
      >
        {data.label}
      </Text>
    </View>
  );
};

// timeAgo is imported from ../utils/timeAgo

export default function IssueCard({
  issue,
  showActions = true,
  disablePress = false,
  onCommentPress,
}) {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Initialize vote state from the ACTUAL voters array (resilient to reloads)
  const alreadyVoted = user ? (issue.voters || []).includes(user.uid) : false;
  const [localVotes, setLocalVotes] = useState(issue.votes || 0);
  const [hasVoted, setHasVoted] = useState(alreadyVoted);
  const [localStatus, setLocalStatus] = useState(issue.status || "Open");
  const [isDeleted, setIsDeleted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const initialCommentCount =
    issue.commentsCount ?? (issue.comments || []).length;
  const [localCommentCount, setLocalCommentCount] =
    useState(initialCommentCount);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const voteAnim = useRef(new Animated.Value(1)).current;

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const solvers = issue.solvers || [];
  const isAlreadySolving = user ? solvers.includes(user.uid) : false;
  const [isSolving, setIsSolving] = useState(isAlreadySolving);
  const isAuthor =
    user &&
    (issue.authorId === user.uid || issue.authorName === user.displayName);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateVote = () => {
    Animated.sequence([
      Animated.timing(voteAnim, {
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(voteAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
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
    setLocalVotes((prev) => prev + 1);
    setHasVoted(true);
    try {
      const result = await IssueService.upvoteIssue(issue.id, user.uid);
      if (result === false) {
        // Server says already voted — revert
        setLocalVotes((prev) => prev - 1);
        setHasVoted(true); // Keep disabled since server confirmed it
      }
    } catch (e) {
      console.error("Failed to upvote:", e);
      setLocalVotes((prev) => prev - 1);
      setHasVoted(false);
    }
  };

  const handleSolve = async () => {
    if (
      isSolving ||
      !user ||
      localStatus === "Solved" ||
      localStatus === "Failed"
    )
      return;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsSolving(true);
    setLocalStatus("In Progress");
    try {
      await IssueService.joinIssue(issue.id, user.uid);
    } catch (e) {
      console.error("Failed to join issue:", e);
      setIsSolving(false);
      setLocalStatus(issue.status || "Open");
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setLocalStatus(newStatus);
    try {
      await IssueService.updateIssueStatus(issue.id, newStatus);
    } catch (e) {
      console.error("Failed to update status:", e);
      setLocalStatus(issue.status || "Open");
    }
  };

  const handlePlayVideo = () => {
    if (issue.youtubeUrl && isValidYouTubeUrl(issue.youtubeUrl)) {
      Linking.openURL(issue.youtubeUrl).catch((err) =>
        console.error("Couldn't load page", err),
      );
    } else {
      Alert.alert(
        "Invalid Link",
        "This link does not appear to be a valid YouTube URL.",
      );
    }
  };

  const handleCardPress = () => {
    animatePress();
    if (!disablePress) {
      navigation.navigate("IssueDetail", { issueId: issue.id });
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

  const authorName = issue.authorName || "Citizen";
  const initials = authorName.substring(0, 2).toUpperCase();

  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      theme.colors.accentBrand,
      theme.colors.statusLow,
      theme.colors.statusMedium,
      theme.colors.statusCritical,
      "#3B82F6", // Blue
      "#8B5CF6", // Violet
      "#EC4899", // Pink
      "#10B981", // Emerald
    ];
    return colors[Math.abs(hash) % colors.length];
  };
  const avatarBg = getAvatarColor(authorName);

  const ytId = getYouTubeID(issue.youtubeUrl);
  const hasMedia = issue.photo || ytId;

  const urgencyColor =
    {
      critical: theme.colors.statusCritical,
      high: theme.colors.statusMedium,
      medium: theme.colors.statusMedium,
      low: theme.colors.statusLow,
    }[issue.urgency] || theme.colors.statusMedium;

  const urgencyBgColor = theme.colors.surfaceCard;
  const urgencyLabel = (issue.urgency || "medium").toUpperCase() + " URGENCY";

  const textColor = "#FFFFFF";
  const textMuted = "rgba(255, 255, 255, 0.9)";
  const surfaceSubtle = hasMedia
    ? "rgba(255,255,255,0.15)"
    : theme.colors.surfaceSubtle;
  const borderColor = hasMedia ? "rgba(255,255,255,0.2)" : theme.colors.border;
  const accentColor = hasMedia ? "#FFFFFF" : urgencyColor;

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
          },
        },
      ],
    );
  };

  if (isDeleted) return null;

  // urgencyColor moved up

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Card
        style={[
          styles.card,
          {
            backgroundColor: urgencyBgColor,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          },
          hasMedia && { borderWidth: 0 },
        ]}
      >
        {hasMedia && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Image
              source={{
                uri:
                  issue.photo ||
                  `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
              }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Media Section (Top) */}
        <TouchableOpacity
          activeOpacity={disablePress ? 1 : 0.92}
          onPress={handleCardPress}
          style={hasMedia ? { height: 180 } : {}}
        >
          {hasMedia ? (
            <View style={{ flex: 1 }}>
              {ytId && (
                <TouchableOpacity
                  style={styles.playOverlay}
                  onPress={handlePlayVideo}
                >
                  <View style={styles.playButton}>
                    <MaterialCommunityIcons
                      name="play"
                      size={32}
                      color="#FFF"
                    />
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.topBadges}>
                <View style={styles.categoryChip}>
                  <View
                    style={[
                      styles.urgencyDot,
                      { backgroundColor: urgencyColor },
                    ]}
                  />
                  <Text style={styles.categoryChipText}>{urgencyLabel}</Text>
                </View>
                <StatusBadge status={localStatus} />
              </View>
            </View>
          ) : (
            <View style={styles.textOnlyMedia}>
              <View style={styles.categoryChipInline}>
                <View
                  style={[styles.urgencyDot, { backgroundColor: urgencyColor }]}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {urgencyLabel}
                </Text>
              </View>
              <StatusBadge status={localStatus} />
            </View>
          )}
        </TouchableOpacity>

        {/* Content & Actions */}
        <View
          style={[
            styles.contentSection,
            hasMedia && styles.contentSectionGlass,
          ]}
        >
          <View style={styles.authorRow}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              activeOpacity={0.7}
              onPress={() => {
                if (issue.authorId) {
                  navigation.navigate("PublicProfile", {
                    userId: issue.authorId,
                    userName: issue.authorName || "User",
                  });
                }
              }}
            >
              <View
                style={[
                  styles.authorAvatar,
                  { backgroundColor: avatarBg, borderColor: avatarBg },
                ]}
              >
                <Text style={[styles.authorInitials, { color: "#FFFFFF" }]}>
                  {initials}
                </Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.authorName, { color: textColor }]}>
                  {authorName}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <Text
                    style={[
                      styles.authorMeta,
                      { color: textMuted, marginRight: 8 },
                    ]}
                  >
                    {timeAgo(issue.createdAt)}
                  </Text>

                  <View
                    style={[
                      styles.metaRow,
                      {
                        backgroundColor: surfaceSubtle,
                        marginBottom: 0,
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={11}
                      color={accentColor}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { color: textMuted, fontSize: 10, marginLeft: 3 },
                      ]}
                      numberOfLines={1}
                    >
                      {issue.location || "Location not set"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.titleText, { color: textColor }]}
            numberOfLines={2}
          >
            {issue.title}
            {!issue.description && (
              <Text
                style={{
                  color: theme.colors.accentBrand,
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                {`  [${(issue.category || "General").toUpperCase()}]`}
              </Text>
            )}
          </Text>

          {issue.description ? (
            <Text
              style={[styles.descriptionText, { color: textMuted }]}
              numberOfLines={3}
            >
              {issue.description}
              <Text
                style={{
                  color: theme.colors.accentBrand,
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                {`  [${(issue.category || "General").toUpperCase()}]`}
              </Text>
            </Text>
          ) : null}

          <View style={[styles.actionsRow, { borderTopColor: borderColor }]}>
            <View style={styles.socialActions}>
              <AnimatedPressable onPress={handleUpvote} activeScale={0.92}>
                <View
                  style={[
                    styles.actionBtn,
                    { backgroundColor: surfaceSubtle, borderColor },
                    hasVoted && styles.actionBtnActive,
                  ]}
                >
                  <Animated.View style={{ transform: [{ scale: voteAnim }] }}>
                    <MaterialCommunityIcons
                      name={
                        hasVoted ? "arrow-up-bold" : "arrow-up-bold-outline"
                      }
                      size={20}
                      color={hasVoted ? accentColor : textMuted}
                    />
                  </Animated.View>
                  <Text
                    style={[
                      styles.actionCount,
                      { color: textMuted },
                      hasVoted && { color: accentColor },
                    ]}
                  >
                    {localVotes}
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleComment} activeScale={0.92}>
                <View
                  style={[
                    styles.actionBtn,
                    { backgroundColor: surfaceSubtle, borderColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="comment-text-outline"
                    size={19}
                    color={textMuted}
                  />
                  <Text style={[styles.actionCount, { color: textMuted }]}>
                    {localCommentCount}
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleShare} activeScale={0.92}>
                <View
                  style={[
                    styles.actionBtn,
                    { backgroundColor: surfaceSubtle, borderColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="share-variant-outline"
                    size={19}
                    color={textMuted}
                  />
                </View>
              </AnimatedPressable>
            </View>

            {showActions &&
              localStatus !== "Solved" &&
              localStatus !== "Failed" &&
              !isAuthor && (
                <AnimatedPressable
                  onPress={handleSolve}
                  disabled={isSolving}
                  activeScale={0.95}
                >
                  {isSolving ? (
                    <View
                      style={[
                        styles.primaryActionBtn,
                        styles.primaryActionBtnActive,
                        { borderColor: "#B71C1C" },
                      ]}
                    >
                      <FontAwesome5
                        name="fist-raised"
                        size={12}
                        color="#B71C1C"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[styles.primaryActionText, { color: "#B71C1C" }]}
                      >
                        Solving
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.primaryActionBtn,
                        { backgroundColor: "#B71C1C" },
                      ]}
                    >
                      <FontAwesome5
                        name="fist-raised"
                        size={12}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.primaryActionText}>Solve</Text>
                    </View>
                  )}
                </AnimatedPressable>
              )}

            {showActions &&
              isAuthor &&
              localStatus !== "Solved" &&
              localStatus !== "Failed" && (
                <AnimatedPressable
                  onPress={() => handleUpdateStatus("Solved")}
                  activeScale={0.95}
                >
                  <View style={[styles.primaryActionBtn, styles.markFixedBtn]}>
                    <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={14}
                      color={theme.colors.accentBrand}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.primaryActionText,
                        { color: theme.colors.accentBrand },
                      ]}
                    >
                      Mark Fixed
                    </Text>
                  </View>
                </AnimatedPressable>
              )}
          </View>
        </View>
      </Card>
      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        issue={issue}
      />
      <CommentBottomSheet
        visible={commentSheetVisible}
        onClose={() => setCommentSheetVisible(false)}
        issueId={issue.id}
        initialComments={issue.comments || []}
        onCommentAdded={() => setLocalCommentCount((prev) => prev + 1)}
      />
    </Animated.View>
  );
}

const styles = {
  card: {
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg,
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.radius.outer,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...Shadows.card,
  },
  media: {
    width: "100%",
    height: 200,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  mediaGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  topBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryChipInline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
    marginRight: 6,
  },
  categoryChipText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  textOnlyMedia: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  contentSectionGlass: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentBrandSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  authorInitials: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.accentBrand,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  authorMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: Spacing.sm,
    letterSpacing: -0.2,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  descriptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    marginBottom: Spacing.md,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.inner,
    alignSelf: "flex-start",
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
    flexShrink: 1,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  socialActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 9999,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.accentBrandSubtle,
    borderColor: "rgba(37, 99, 235, 0.3)",
  },
  actionCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  actionCountActive: {
    color: theme.colors.accentBrand,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 9999,
  },
  primaryActionBtnActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentBrand,
  },
  markFixedBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentBrand,
  },
  primaryActionText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },
};
