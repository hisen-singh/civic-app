import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { TextInput, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme, Spacing } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

const REPORT_REASONS = [
  { id: "spam", label: "Spam", icon: "email-alert-outline" },
  {
    id: "inappropriate",
    label: "Inappropriate content",
    icon: "alert-octagon-outline",
  },
  { id: "duplicate", label: "Duplicate", icon: "content-duplicate" },
  { id: "misleading", label: "Misleading or false", icon: "eye-off-outline" },
  { id: "other", label: "Other", icon: "dots-horizontal-circle-outline" },
];

/**
 * ReportBottomSheet
 *
 * Props:
 *   visible       - boolean, controls visibility
 *   onClose       - callback when dismissed
 *   contentType   - "issue" | "comment"
 *   issueId       - the parent issue ID
 *   commentId     - (optional) the comment ID, required when contentType="comment"
 *   onReported    - callback after successful report
 */
export default function ReportBottomSheet({
  visible,
  onClose,
  contentType = "issue",
  issueId,
  commentId,
  onReported,
}) {
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setDetails("");
      setAlreadyReported(false);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSubmitReport = async () => {
    if (!selectedReason || !user) return;

    setSubmitting(true);
    try {
      let reportRef;
      if (contentType === "comment" && commentId) {
        reportRef = doc(
          db,
          "issues",
          issueId,
          "comments",
          commentId,
          "reports",
          user.uid,
        );
      } else {
        reportRef = doc(db, "issues", issueId, "reports", user.uid);
      }

      // Check if already reported
      const existing = await getDoc(reportRef);
      if (existing.exists()) {
        setAlreadyReported(true);
        setSubmitting(false);
        return;
      }

      await setDoc(reportRef, {
        reporterId: user.uid,
        reason: selectedReason,
        details: details.trim() || null,
        createdAt: new Date().toISOString(),
      });

      if (onReported) onReported();
      onClose();
      Alert.alert(
        "Report Submitted",
        "Thank you for helping keep the community safe. We'll review this shortly.",
      );
    } catch (error) {
      console.error("[ReportBottomSheet] Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalWrapper}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                Report {contentType === "comment" ? "Comment" : "Issue"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Why are you reporting this?
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Already Reported Banner */}
          {alreadyReported && (
            <View style={styles.alreadyBanner}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={16}
                color={theme.colors.accentBrand}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.alreadyText}>
                You've already reported this. We're reviewing it.
              </Text>
            </View>
          )}

          {/* Reason Options */}
          <View style={styles.optionsContainer}>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason.id}
                style={({ pressed }) => [
                  styles.optionButton,
                  selectedReason === reason.id && styles.optionButtonSelected,
                  pressed && styles.optionButtonPressed,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <MaterialCommunityIcons
                  name={reason.icon}
                  size={20}
                  color={selectedReason === reason.id ? theme.colors.accentBrand : theme.colors.textMuted}
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionTitle,
                    selectedReason === reason.id && {
                      color: theme.colors.accentBrand,
                    },
                  ]}
                >
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={theme.colors.accentBrand}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </Pressable>
            ))}
          </View>

          {/* Optional Details */}
          {selectedReason && (
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Additional details (optional)..."
              placeholderTextColor={theme.colors.textMuted}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.detailsInput}
              textColor={theme.colors.textPrimary}
              theme={{
                colors: {
                  primary: theme.colors.accentBrand,
                  outline: theme.colors.borderSubtle,
                  background: theme.colors.surface,
                },
                roundness: theme.radius.sm,
              }}
              maxLength={500}
            />
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmitReport}
            disabled={!selectedReason || submitting || alreadyReported}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              (!selectedReason || submitting || alreadyReported) && {
                opacity: 0.4,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size={18} color="#FFF" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="flag-outline"
                  size={18}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: Spacing.lg || 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: theme.type?.title?.fontWeight,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  alreadyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.accentBrandSubtle,
    padding: 12,
    marginBottom: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentBrand,
  },
  alreadyText: {
    color: theme.colors.accentBrand,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  optionsContainer: {
    width: "100%",
  },
  optionButton: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonSelected: {
    borderColor: theme.colors.accentBrand,
    backgroundColor: theme.colors.accentBrandSubtle,
  },
  optionButtonPressed: {
    backgroundColor: theme.colors.surfaceHover,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  detailsInput: {
    backgroundColor: theme.colors.surface,
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: theme.colors.accentBrand,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: "600",
  },
});
