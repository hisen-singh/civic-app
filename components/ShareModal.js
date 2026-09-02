import { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Share,
  Animated,
  Modal,
  Linking,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme, Spacing } from "../theme";

const STATUS_COLORS = {
  Open: theme.colors.textMuted,
  "In Progress": theme.colors.accentBrand,
  Solved: theme.colors.accentBrand,
  Failed: theme.colors.statusCritical,
};

export default function ShareModal({ visible, onClose, issue }) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!issue) return null;

  const shareText = `📌 ${issue.title}\n📍 ${issue.location || "Location not set"}\n📋 ${issue.category || "Issue"} • ${issue.status || "Open"}\n\n${issue.description ? issue.description.substring(0, 120) + "..." : ""}\n\nHelp solve this community issue — reported on Civic.`;

  const handleShare = async (platform) => {
    try {
      if (platform === "whatsapp") {
        const url = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          onClose();
          return;
        }
      }
      if (platform === "twitter") {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.substring(0, 280))}`;
        await Linking.openURL(url);
        onClose();
        return;
      }
      await Share.share({ message: shareText });
      onClose();
    } catch (e) {
      console.error("Share error:", e);
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const backdrop = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Share Issue</Text>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            {issue.photo ? (
              <Image
                source={{ uri: issue.photo }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.previewImage,
                  {
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.colors.surfaceElevated,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={32}
                  color={theme.colors.textMuted}
                />
              </View>
            )}
            <View style={styles.previewContent}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      STATUS_COLORS[issue.status] || theme.colors.textMuted,
                  },
                ]}
              />
              <Text style={styles.previewTitle} numberOfLines={2}>
                {issue.title}
              </Text>
              <Text style={styles.previewMeta} numberOfLines={1}>
                {issue.category} • {issue.location || "No location"}
              </Text>
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleShare("whatsapp")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(37, 211, 102, 0.12)" },
                ]}
              >
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={24}
                  color="#25D366"
                />
              </View>
              <Text style={styles.optionLabel}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleShare("twitter")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(29, 161, 242, 0.12)" },
                ]}
              >
                <MaterialCommunityIcons
                  name="twitter"
                  size={24}
                  color="#1DA1F2"
                />
              </View>
              <Text style={styles.optionLabel}>Twitter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleShare("more")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: theme.colors.accentBrandSubtle },
                ]}
              >
                <MaterialCommunityIcons
                  name="share-variant-outline"
                  size={24}
                  color={theme.colors.accentBrand}
                />
              </View>
              <Text style={styles.optionLabel}>More</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 34,
    paddingHorizontal: Spacing.xl,
    ...theme.shadows.card,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: theme.type?.title?.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: "hidden",
    marginBottom: 24,
  },
  previewImage: { width: 90, height: 90 },
  previewContent: { flex: 1, padding: 12, justifyContent: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  previewTitle: {
    fontSize: 14,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  previewMeta: { fontSize: 12, color: theme.colors.textMuted },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  optionBtn: { alignItems: "center" },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionLabel: { fontSize: 12, fontWeight: "500", color: theme.colors.textMuted },
  cancelBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "500", color: theme.colors.textMuted },
};
