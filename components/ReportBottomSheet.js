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
import { Spacing } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

const REPORT_REASONS = [
  { id: "spam", label: "Spam", icon: "email-alert-outline" },
  {
    id: "inappropriate",
    label: "Inappropriate Content",
    icon: "alert-octagon-outline",
  },
  { id: "duplicate", label: "Duplicate", icon: "content-duplicate" },
  { id: "misleading", label: "Misleading / False", icon: "eye-off-outline" },
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
                REPORT {contentType === "comment" ? "COMMENT" : "ISSUE"}
              </Text>
              <Text style={styles.headerSubtitle}>
                WHY ARE YOU REPORTING THIS?
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={22} color="#F1F5F9" />
            </TouchableOpacity>
          </View>

          {/* Already Reported Banner */}
          {alreadyReported && (
            <View style={styles.alreadyBanner}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={16}
                color="#10B981"
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
                  color={selectedReason === reason.id ? "#FF4500" : "#94A3B8"}
                  style={styles.optionIcon}
                />
                <Text
                  style={[
                    styles.optionTitle,
                    selectedReason === reason.id && {
                      color: "#FF4500",
                    },
                  ]}
                >
                  {reason.label.toUpperCase()}
                </Text>
                {selectedReason === reason.id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color="#FF4500"
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
              placeholderTextColor="#64748B"
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.detailsInput}
              textColor="#F1F5F9"
              theme={{
                colors: {
                  primary: "#FF4500",
                  outline: "rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.05)",
                },
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
                <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>
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
    backgroundColor: "#121212",
    borderRadius: 0,
    borderTopWidth: 2,
    borderTopColor: "#FF4500",
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
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#F1F5F9",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 6,
  },
  alreadyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  alreadyText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  optionsContainer: {
    width: "100%",
  },
  optionButton: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonSelected: {
    borderColor: "#FF4500",
    backgroundColor: "rgba(255, 69, 0, 0.08)",
  },
  optionButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  optionIcon: {
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F1F5F9",
    letterSpacing: 0.5,
  },
  detailsInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: "#FF4500",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#FF4500",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
