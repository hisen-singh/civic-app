import { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme, Spacing } from "../theme";

export default function BottomSheet({ visible, onClose, onSelectOption }) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
              <Text style={styles.headerTitle}>Help Solve This Issue</Text>
              <Text style={styles.headerSubtitle}>
                Choose how you want to contribute
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

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Option 1: Money */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption("fund")}
            >
              <MaterialCommunityIcons
                name="currency-usd"
                size={24}
                color={theme.colors.accentBrand}
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Fund the Fix</Text>
                <Text style={styles.optionDescription}>
                  Contribute financial support toward materials or resources
                </Text>
              </View>
            </Pressable>

            {/* Option 2: Labor */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption("labor")}
            >
              <MaterialCommunityIcons
                name="hand-heart-outline"
                size={24}
                color={theme.colors.accentBrand}
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Pledge Your Time</Text>
                <Text style={styles.optionDescription}>
                  Volunteer on the ground to help fix this issue
                </Text>
              </View>
            </Pressable>

            {/* Option 3: Voice/Sharing */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption("amplify")}
            >
              <MaterialCommunityIcons
                name="bullhorn-outline"
                size={24}
                color={theme.colors.accentBrand}
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Amplify Issue</Text>
                <Text style={styles.optionDescription}>
                  Share with neighbors and urge local authorities to act
                </Text>
              </View>
            </Pressable>
          </View>
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
    marginBottom: 20,
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
  optionsContainer: {
    width: "100%",
  },
  optionButton: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonPressed: {
    backgroundColor: theme.colors.surfaceHover,
    borderColor: theme.colors.accentBrand,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
