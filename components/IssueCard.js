import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Animated,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../contexts/AuthContext";
import { IssueService } from "../services/IssueService";
import { UserService } from "../services/UserService";
import { useNavigation } from "@react-navigation/native";
import { Spacing, theme } from "../theme";
import { timeAgo, isValidYouTubeUrl } from "../utils/timeAgo";
import ShareModal from "./ShareModal";
import CommentBottomSheet from "./CommentBottomSheet";
import BottomSheet from "./BottomSheet";
import ReportBottomSheet from "./ReportBottomSheet";
import AnimatedPressable from "./ui/AnimatedPressable";

const getYouTubeID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const StatusBadge = ({ status }) => {
  const statuses = {
    Open: { label: "OPEN", color: theme.colors.textMuted },
    "In Progress": { label: "IN PROGRESS", color: theme.colors.accentBrand },
    Solved: { label: "RESOLVED", color: theme.colors.accentBrand },
    Failed: { label: "FAILED", color: theme.colors.statusCritical },
  };
  const data = statuses[status] || statuses["Open"];
  return (
    <Text
      style={{
        color: data.color,
        fontSize: 11,
        fontFamily: theme.type?.micro?.fontFamily,
        fontWeight: theme.type?.micro?.fontWeight,
        letterSpacing: 0.5,
      }}
    >
      {data.label}
    </Text>
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
  const [shareVisible, setShareVisible] = useState(false);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [solveSheetVisible, setSolveSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const initialCommentCount =
    issue.commentsCount ?? (issue.comments || []).length;
  const [localCommentCount, setLocalCommentCount] =
    useState(initialCommentCount);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user && issue.id) {
      UserService.getSavedIssues(user.uid).then((saved) => {
        setIsSaved(saved.includes(issue.id));
      });
    }
  }, [user, issue.id]);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const voteAnim = useRef(new Animated.Value(1)).current;

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
    } catch {
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

  const lastTapRef = useRef(0);
  const handleCardPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      handleUpvote();
    } else {
      animatePress();
      if (!disablePress) {
        navigation.navigate("IssueDetail", { issueId: issue.id });
      }
    }
    lastTapRef.current = now;
  };

  const handleSave = async () => {
    if (!user) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsSaved(!isSaved);
    try {
      if (isSaved) {
        await UserService.unsaveIssue(user.uid, issue.id);
      } else {
        await UserService.saveIssue(user.uid, issue.id);
      }
    } catch (e) {
      setIsSaved(isSaved);
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

  const handleSelectSolveOption = (option) => {
    setSolveSheetVisible(false);
    if (option === "fund" || option === "FUND THE FIX") {
      Alert.alert(
        "Fund the Fix",
        "Thank you for supporting this issue! Funding feature coming soon.",
      );
    } else if (option === "labor" || option === "PLEDGE YOUR TIME") {
      handleSolve();
    } else if (option === "amplify" || option === "AMPLIFY ISSUE") {
      handleShare();
    }
  };

  const authorName = issue.authorName || "Citizen";
  const initials = authorName.substring(0, 2).toUpperCase();

  const getAvatarColor = (name) => {
    const colors = [
      "#E53935",
      "#D81B60",
      "#8E24AA",
      "#5E35B1",
      "#3949AB",
      "#1E88E5",
      "#00ACC1",
      "#00897B",
      "#43A047",
      "#7CB342",
      "#F4511E",
      "#FB8C00",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const avatarBg = getAvatarColor(authorName);

  const ytId = getYouTubeID(issue.youtubeUrl);
  const hasMedia = issue.photo || ytId;

  const urgencyColor =
    {
      critical: theme.colors.statusCritical,
      high: theme.colors.textPrimary,
      medium: theme.colors.statusMedium,
      low: theme.colors.statusLow,
    }[issue.urgency] || theme.colors.statusMedium;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={styles.card}>
        {/* Media — full-bleed, edge-to-edge */}
        {hasMedia && (
          <TouchableOpacity
            activeOpacity={disablePress ? 1 : 0.92}
            onPress={handleCardPress}
            style={styles.mediaWrap}
          >
            <Image
              source={{
                uri:
                  issue.photo ||
                  `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
              }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {ytId && (
              <TouchableOpacity
                style={styles.playOverlay}
                onPress={handlePlayVideo}
              >
                <View style={[styles.playButton, { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }]}>
                  <MaterialCommunityIcons
                    name="play"
                    size={24}
                    color="#FFF"
                  />
                </View>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}

        {/* Content below media */}
        <View style={styles.contentSection}>
          <View style={styles.metaLine}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.urgencyDot, { backgroundColor: urgencyColor, width: 8, height: 8, borderRadius: 4, marginRight: 8 }]} />
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{(issue.category || "General")}</Text>
              </View>
            </View>
            <StatusBadge status={localStatus} />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCardPress}
            disabled={disablePress}
          >
            <Text style={styles.titleText} numberOfLines={2}>
              {(issue.title || "").replace(/\[.*?\]\s*/g, '')}
            </Text>
          </TouchableOpacity>

          {issue.description ? (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {issue.description}
            </Text>
          ) : null}

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
                  { backgroundColor: avatarBg, borderColor: avatarBg, width: 24, height: 24 },
                ]}
              >
                <Text style={[styles.authorInitials, { fontSize: 9 }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.authorName}>{authorName}</Text>
                <Text style={styles.authorMeta} numberOfLines={1}>
                  {` · ${timeAgo(issue.createdAt)} · ${issue.location || "Location not set"}`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.socialActions}>
              <AnimatedPressable onPress={handleUpvote} activeScale={0.9}>
                <View style={styles.actionBtn}>
                  <Animated.View style={{ transform: [{ scale: voteAnim }] }}>
                    <MaterialCommunityIcons
                      name={hasVoted ? "arrow-up-bold" : "arrow-up-bold-outline"}
                      size={18}
                      color={hasVoted ? theme.colors.accentBrand : theme.colors.textMuted}
                    />
                  </Animated.View>
                  {localVotes > 0 && (
                    <Text style={[styles.actionCount, hasVoted && styles.actionCountActive]}>
                      {localVotes}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleComment} activeScale={0.9}>
                <View style={styles.actionBtn}>
                  <MaterialCommunityIcons
                    name="comment-text-outline"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                  {localCommentCount > 0 && (
                    <Text style={styles.actionCount}>{localCommentCount}</Text>
                  )}
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleSave} activeScale={0.9}>
                <View style={styles.actionBtn}>
                  <MaterialCommunityIcons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={18}
                    color={isSaved ? theme.colors.accentBrand : theme.colors.textMuted}
                  />
                </View>
              </AnimatedPressable>

              <AnimatedPressable onPress={handleShare} activeScale={0.9}>
                <View style={styles.actionBtn}>
                  <MaterialCommunityIcons
                    name="share-variant-outline"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </View>
              </AnimatedPressable>

              {!isAuthor && (
                <AnimatedPressable onPress={() => setReportSheetVisible(true)} activeScale={0.9}>
                  <View style={styles.actionBtn}>
                    <MaterialCommunityIcons
                      name="flag-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </View>
                </AnimatedPressable>
              )}
            </View>

            {showActions && localStatus !== "Solved" && localStatus !== "Failed" && !isAuthor && (
              <AnimatedPressable onPress={() => setSolveSheetVisible(true)} disabled={isSolving} activeScale={0.95}>
                <View style={[styles.primaryActionBtn, isSolving ? styles.primaryActionBtnActive : { backgroundColor: theme.colors.accentBrandSubtle }]}>
                  <Text style={[styles.primaryActionText, { color: theme.colors.accentBrand }]}>
                    {isSolving ? "Solving" : "Help Solve"}
                  </Text>
                </View>
              </AnimatedPressable>
            )}

            {showActions && isAuthor && localStatus !== "Solved" && localStatus !== "Failed" && (
              <AnimatedPressable onPress={() => handleUpdateStatus("Solved")} activeScale={0.95}>
                <View style={[styles.primaryActionBtn, styles.markFixedBtn]}>
                  <Text style={[styles.primaryActionText, { color: theme.colors.accentBrand }]}>
                    Mark Fixed
                  </Text>
                </View>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </View>
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
      <BottomSheet
        visible={solveSheetVisible}
        onClose={() => setSolveSheetVisible(false)}
        onSelectOption={handleSelectSolveOption}
        issue={issue}
      />
      <ReportBottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        contentType="issue"
        issueId={issue.id}
      />
    </Animated.View>
  );
}

const styles = {
  card: {
    marginBottom: Spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingBottom: Spacing.md,
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surfaceElevated,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  contentSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  metaLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  categoryPill: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  categoryPillText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: theme.type?.meta?.fontWeight,
  },
  titleText: {
    fontSize: 17,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: theme.type?.title?.fontWeight,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: theme.type?.body?.fontFamily,
    fontWeight: theme.type?.body?.fontWeight,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  authorRow: {
    marginBottom: Spacing.sm,
  },
  authorAvatar: {
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  authorInitials: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  authorName: {
    fontSize: 13,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: theme.type?.meta?.fontWeight,
    color: theme.colors.textPrimary,
  },
  authorMeta: {
    fontSize: 13,
    fontFamily: theme.type?.body?.fontFamily,
    fontWeight: theme.type?.body?.fontWeight,
    color: theme.colors.textMuted,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  socialActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    minHeight: 40,
    minWidth: 40,
  },
  actionCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: theme.type?.meta?.fontWeight,
    marginLeft: 5,
  },
  actionCountActive: {
    color: theme.colors.accentBrand,
  },
  primaryActionBtn: {
    paddingHorizontal: 16,
    minHeight: 32,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionBtnActive: {
    backgroundColor: theme.colors.surface,
  },
  primaryActionText: {
    fontSize: 12,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: theme.type?.meta?.fontWeight,
  },
  markFixedBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
};
