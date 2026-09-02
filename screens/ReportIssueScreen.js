import React, { useState, useRef } from "react";
import {
  View,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Text, TextInput, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IssueService } from "../services/IssueService";
import { SyncService } from "../services/SyncService";
import { useAuth } from "../contexts/AuthContext";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { theme, Colors, Spacing } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { detectUrgency } from "../utils/urgencyDetector";
import CategoryGrid from "../components/ui/CategoryGrid";
import UrgencySelector from "../components/ui/UrgencySelector";
import MediaPicker from "../components/ui/MediaPicker";

export default function ReportIssueScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState("Pothole");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [coords, setCoords] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [urgency, setUrgency] = useState("medium");
  const [autoDetected, setAutoDetected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const submitScale = useRef(new Animated.Value(1)).current;

  // Auto-detect urgency from title + description
  React.useEffect(() => {
    if (title.length >= 3 || description.length >= 5) {
      const result = detectUrgency(title, description);
      setAutoDetected(result);
      if (result.confidence !== "low") {
        setUrgency(result.urgency);
      }
    } else {
      setAutoDetected(null);
    }
  }, [title, description]);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    setLocationStr("Detecting...");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStr("");
        Alert.alert(
          "Permission Required",
          "Location access is needed to tag your report.",
        );
        setIsFetchingLocation(false);
        return;
      }

      // Try cached location first (fast)
      let location = null;
      try {
        location = await Location.getLastKnownPositionAsync({});
      } catch (e) {
        console.warn("[ReportIssue] getLastKnownPosition failed:", e);
      }

      if (!location) {
        try {
          // Timeout after 10s to prevent app freeze
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Location timeout")), 10000),
          );
          location = await Promise.race([locationPromise, timeoutPromise]);
        } catch (e) {
          console.warn("[ReportIssue] getCurrentPosition failed/timed out:", e);
          setLocationStr("");
          Alert.alert(
            "Location Unavailable",
            "Could not detect your location. You can type it manually.",
          );
          setIsFetchingLocation(false);
          return;
        }
      }

      if (!location) {
        setLocationStr("");
        Alert.alert(
          "Location Unavailable",
          "Could not detect your location. You can type it manually.",
        );
        setIsFetchingLocation(false);
        return;
      }

      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address) {
          const parts = [
            address.street || address.name,
            address.city || address.district || address.subregion,
            address.region,
          ].filter(Boolean);

          const uniqueParts = [...new Set(parts)];
          setLocationStr(
            uniqueParts.length > 0
              ? uniqueParts.join(", ")
              : "Location detected",
          );
        } else {
          setLocationStr(
            `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
          );
        }
      } catch (geocodeError) {
        console.warn("[ReportIssue] Reverse geocode failed:", geocodeError);
        // Still have coordinates, just show them directly
        setLocationStr(
          `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        );
      }
    } catch (error) {
      console.error("[ReportIssue] Location error:", error);
      setLocationStr("");
      Alert.alert(
        "Error",
        "Unable to fetch location. You can type it manually.",
      );
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Progress calculation
  const getProgress = () => {
    let filled = 0;
    if (category) filled++;
    if (title.trim().length >= 5) filled++;
    if (locationStr.trim()) filled++;
    if (description.trim().length >= 10) filled++;
    if (photo || youtubeUrl.trim()) filled++;
    return filled;
  };
  const progress = getProgress();
  const totalSteps = 5;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg(
        'Title is required. Please tap the "Issue Title" field and provide a brief name for the issue.',
      );
      return;
    }
    if (title.trim().length < 5) {
      setErrorMsg(
        "Title is too short. Please add more details to the title (minimum 5 characters).",
      );
      return;
    }
    if (!description.trim()) {
      setErrorMsg(
        'Description is required. Please type in the "Description" field to explain the issue clearly.',
      );
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg(
        "Description is too brief. Please type at least 10 characters explaining what needs to be fixed.",
      );
      return;
    }

    // Animate button
    Animated.sequence([
      Animated.timing(submitScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(submitScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    setErrorMsg("");

    try {
      // Rate limit pre-check
      if (user?.uid) {
        try {
          const { doc: firestoreDoc, getDoc } = require("firebase/firestore");
          const { db: firestoreDb } = require("../config/firebaseConfig");
          const rateLimitDoc = await getDoc(
            firestoreDoc(firestoreDb, "userRateLimits", user.uid),
          );
          if (rateLimitDoc.exists()) {
            const data = rateLimitDoc.data();
            if ((data.issuesThisHour || 0) >= 5) {
              setErrorMsg(
                "You've reached the posting limit (5 reports per hour). Please wait before posting again.",
              );
              setLoading(false);
              return;
            }
          }
        } catch (rateLimitError) {
          // If rate limit check fails, proceed anyway — the backend will catch it
          console.warn(
            "[ReportIssue] Rate limit pre-check failed:",
            rateLimitError,
          );
        }
      }

      const netState = await NetInfo.fetch();
      const isOffline = !netState.isConnected;

      const issueData = {
        title: title.trim(),
        description: description.trim(),
        category,
        status: "Open",
        urgency: urgency,
        location: locationStr,
        latitude: coords ? coords.latitude : null,
        longitude: coords ? coords.longitude : null,
        authorId: user?.uid || "anonymous",
        authorName: user?.displayName || "Citizen",
        youtubeUrl: youtubeUrl.trim(),
        photo: photo ? photo.uri : null,
      };

      if (isOffline) {
        await SyncService.enqueueIssue(issueData);
        Alert.alert(
          "Saved Offline",
          "You appear to be offline. Your issue has been saved and will sync automatically when you reconnect.",
        );
        navigation.goBack();
        return;
      }

      try {
        if (photo && photo.uri && !photo.uri.startsWith("http")) {
          issueData.photo = await IssueService.uploadImage(photo.uri);
        }
        await IssueService.addIssue(issueData);
      } catch (networkError) {
        console.warn("Upload failed, queueing offline:", networkError);
        issueData.photo = photo ? photo.uri : null;
        await SyncService.enqueueIssue(issueData);
        Alert.alert(
          "Saved Offline",
          "We couldn't reach the server right now. Your issue has been saved and will sync automatically when you reconnect.",
        );
      }

      navigation.goBack();
    } catch (error) {
      setErrorMsg(error.message || "Failed to submit. Please try again.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            New Report
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || progress < 3}
          activeOpacity={0.7}
          style={{
            padding: 8,
            minHeight: 48,
            minWidth: 48,
            justifyContent: "center",
            alignItems: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Submit Report"
          accessibilityState={{ disabled: loading || progress < 3 }}
        >
          <Text
            style={[
              styles.submitHeaderText,
              (loading || progress < 3) && { opacity: 0.35 },
            ]}
          >
            Post
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${(progress / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {progress}/{totalSteps} completed
        </Text>
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                progress >= 1 && styles.sectionDotActive,
              ]}
            />
            <Text style={styles.sectionLabel}>Category</Text>
          </View>
          <CategoryGrid category={category} setCategory={setCategory} />
        </View>

        {/* Section: Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                progress >= 2 && styles.sectionDotActive,
              ]}
            />
            <Text style={styles.sectionLabel}>Issue Details</Text>
          </View>
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setErrorMsg("");
            }}
            mode="outlined"
            style={styles.input}
            textColor={theme.colors.textPrimary}
            theme={{
              colors: {
                primary: theme.colors.accentBrand,
                outline: theme.colors.borderSubtle,
                background: theme.colors.surface,
              },
              roundness: theme.radius.sm,
            }}
            label="Issue Title"
            placeholder="e.g. Deep pothole on Main St."
            placeholderTextColor={theme.colors.textMuted}
            maxLength={200}
            accessibilityLabel="Issue Title Input"
          />
          <TextInput
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              setErrorMsg("");
            }}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={[
              styles.input,
              { minHeight: 60, backgroundColor: theme.colors.surface },
            ]}
            textColor={theme.colors.textPrimary}
            theme={{
              colors: {
                primary: theme.colors.accentBrand,
                outline: theme.colors.borderSubtle,
                background: theme.colors.surface,
              },
              roundness: theme.radius.sm,
            }}
            label="Description"
            placeholder="Describe the issue and its exact location..."
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Issue Description Input"
          />
          <View style={styles.charCount}>
            <Text style={styles.charCountText}>
              {description.length} characters
            </Text>
          </View>
        </View>

        {/* Section: Urgency */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                urgency !== "low" && styles.sectionDotActive,
              ]}
            />
            <Text style={styles.sectionLabel}>Urgency Level</Text>
            {autoDetected && autoDetected.confidence !== "low" && (
              <View style={styles.autoDetectBadge}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={10}
                  color="#3B82F6"
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.autoDetectText}>AUTO-DETECTED</Text>
              </View>
            )}
          </View>
          <UrgencySelector urgency={urgency} setUrgency={setUrgency} />
          {autoDetected && autoDetected.matchedKeyword && (
            <View style={styles.detectedHint}>
              <MaterialCommunityIcons
                name="information-outline"
                size={14}
                color={Colors.textTertiary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.detectedHintText}>
                Detected keyword: "{autoDetected.matchedKeyword}"
              </Text>
            </View>
          )}
        </View>

        {/* Section: Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                progress >= 3 && styles.sectionDotActive,
              ]}
            />
            <Text style={styles.sectionLabel}>Location</Text>
          </View>
          <TextInput
            value={locationStr}
            onChangeText={setLocationStr}
            mode="outlined"
            style={styles.input}
            textColor="#000000"
            theme={{
              colors: {
                primary: "#3B82F6",
                outline: "#000000",
                background: "#FFFFFF",
              },
              roundness: 0,
            }}
            label="Location"
            placeholder="Enter location manually..."
            placeholderTextColor={Colors.textTertiary}
            left={<TextInput.Icon icon="map-marker-outline" color="#000000" />}
            accessibilityLabel="Location Input"
          />
          <TouchableOpacity
            onPress={fetchLocation}
            disabled={isFetchingLocation}
            activeOpacity={0.7}
            style={styles.gpsBtn}
            accessibilityRole="button"
            accessibilityLabel="Use Current GPS Location"
            accessibilityState={{ disabled: isFetchingLocation }}
          >
            <View style={styles.gpsBtnIconWrap}>
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={16}
                color={isFetchingLocation ? Colors.textTertiary : "#FFF"}
              />
            </View>
            <Text
              style={[
                styles.gpsBtnText,
                isFetchingLocation && { color: Colors.textTertiary },
              ]}
            >
              {isFetchingLocation
                ? "Detecting location..."
                : "Use Current Location"}
            </Text>
            {isFetchingLocation && (
              <ActivityIndicator
                size={14}
                color={Colors.textTertiary}
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Section: Media */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionDot,
                progress >= 5 && styles.sectionDotActive,
              ]}
            />
            <Text style={styles.sectionLabel}>Evidence</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>

          <MediaPicker photo={photo} setPhoto={setPhoto} />

          {/* YouTube Link */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or add a video</Text>
            <View style={styles.dividerLine} />
          </View>
          <TextInput
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            mode="outlined"
            style={styles.input}
            textColor="#000000"
            theme={{
              colors: {
                primary: "#3B82F6",
                outline: "#000000",
                background: "#FFFFFF",
              },
              roundness: 0,
            }}
            label="YouTube Link"
            placeholder="Paste YouTube link..."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="youtube" color="#FF0000" />}
            accessibilityLabel="YouTube Link Input"
          />
        </View>

        {/* Error */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color={Colors.error}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: Colors.error, fontSize: 13, flex: 1 }}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* Submit */}
        <View style={{ paddingHorizontal: Spacing.xl }}>
          <Animated.View style={{ transform: [{ scale: submitScale }] }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={[{ transform: [{ scale: submitScale }] }, loading && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Submit Report"
              accessibilityState={{ disabled: loading }}
            >
              <LinearGradient
                colors={theme.gradients.primary}
                style={styles.submitBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size={20} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons
                      name="send"
                      size={18}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.disclaimer}>
            Your report will be visible to the community and help improve your
            neighborhood.
          </Text>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.md,
    backgroundColor: "#000000",
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
  },
  backBtn: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  submitHeaderText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3B82F6",
    textTransform: "uppercase",
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: "#000000",
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#222222",
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 0,
  },
  progressText: {
    fontSize: 11,
    color: "#A0AAB5",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
    backgroundColor: "#000000",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    flexWrap: "wrap", // Prevent clipping
  },
  sectionDot: {
    width: 12,
    height: 12,
    borderRadius: 0,
    backgroundColor: "#222222",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sectionDotActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    backgroundColor: "#3B82F6", // Electric Blue
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  input: {
    backgroundColor: "#FFFFFF",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: "#000000",
  },
  charCount: {
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 4,
  },
  charCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A0AAB5",
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  gpsBtnIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  gpsBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#FFFFFF",
  },
  dividerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginHorizontal: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 0,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  submitBtn: {
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  disclaimer: {
    color: "#A0AAB5",
    fontSize: 11,
    textAlign: "center",
    marginTop: Spacing.lg,
    lineHeight: 16,
    fontWeight: "600",
  },
  autoDetectBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  autoDetectText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  detectedHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222222",
    padding: 10,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  detectedHintText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontStyle: "italic",
    fontWeight: "600",
  },
};
