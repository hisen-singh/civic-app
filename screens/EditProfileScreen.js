import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text, TextInput, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { AuthService } from "../services/AuthService";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from "../config/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Colors, Radius, Spacing } from "../theme";

export default function EditProfileScreen({ navigation }) {
  const { user, reloadUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    successAnim.setValue(0);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setSuccessMsg(""));
  };

  const pickAvatar = () => {
    Alert.alert("Change Photo", "Choose your profile photo", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera access is needed.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) setLocalPhoto(result.assets[0]);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) setLocalPhoto(result.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      let newPhotoURL = photoURL;
      if (localPhoto?.uri) {
        const response = await fetch(localPhoto.uri);
        const blob = await response.blob();
        const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
        await uploadBytes(avatarRef, blob);
        newPhotoURL = await getDownloadURL(avatarRef);
      }
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
      });
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: displayName.trim(),
          photoURL: newPhotoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setPhotoURL(newPhotoURL);
      setLocalPhoto(null);
      if (reloadUser) await reloadUser();
      showSuccess("Profile updated!");
    } catch (error) {
      console.error("[EditProfile] Save failed:", error);
      setErrorMsg(error.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await AuthService.resendVerificationEmail();
      showSuccess("Verification email sent!");
    } catch (error) {
      setErrorMsg(error.message || "Failed to send verification email.");
    } finally {
      setResendingEmail(false);
    }
  };

  const avatarSource = localPhoto?.uri || photoURL;
  const initials = (displayName || user?.email || "U")
    .substring(0, 2)
    .toUpperCase();
  const isVerified = user?.emailVerified;
  const hasChanges =
    displayName.trim() !== (user?.displayName || "") || localPhoto !== null;

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: Colors.background, opacity: fadeAnim }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ padding: 8 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasChanges}
          activeOpacity={0.7}
          style={{ padding: 8 }}
        >
          <Text
            style={[
              styles.saveBtn,
              (!hasChanges || saving) && { opacity: 0.35 },
            ]}
          >
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {successMsg ? (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: successAnim,
              transform: [
                {
                  translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={Colors.success}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{ color: Colors.success, fontSize: 13, fontWeight: "600" }}
          >
            {successMsg}
          </Text>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <MaterialCommunityIcons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setErrorMsg("");
              }}
              mode="outlined"
              style={styles.input}
              textColor={Colors.textPrimary}
              theme={{
                colors: { primary: Colors.accent, outline: Colors.border },
              }}
              left={
                <TextInput.Icon
                  icon="account-outline"
                  color={Colors.textTertiary}
                />
              }
              maxLength={50}
            />
          </View>

          {/* Email + Verification */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={styles.readOnlyField}>
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={Colors.textTertiary}
                style={{ marginRight: 12 }}
              />
              <Text style={styles.readOnlyText} numberOfLines={1}>
                {user?.email || ""}
              </Text>
              <View
                style={[
                  styles.verifiedBadge,
                  isVerified ? styles.verifiedActive : styles.verifiedInactive,
                ]}
              >
                <MaterialCommunityIcons
                  name={isVerified ? "check-decagram" : "alert-circle-outline"}
                  size={12}
                  color={isVerified ? Colors.success : Colors.warning}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isVerified ? Colors.success : Colors.warning,
                  }}
                >
                  {isVerified ? "VERIFIED" : "UNVERIFIED"}
                </Text>
              </View>
            </View>
            {!isVerified && (
              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={resendingEmail}
                activeOpacity={0.7}
                style={styles.resendBtn}
              >
                {resendingEmail ? (
                  <ActivityIndicator
                    size={14}
                    color={Colors.accent}
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="email-send-outline"
                    size={16}
                    color={Colors.accent}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.resendText}>
                  {resendingEmail ? "Sending..." : "Resend Verification Email"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Info */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>ACCOUNT</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={16}
                  color={Colors.textTertiary}
                />
                <Text style={styles.infoLabel}>Joined</Text>
                <Text style={styles.infoValue}>
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "Unknown"}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={16}
                  color={Colors.textTertiary}
                />
                <Text style={styles.infoLabel}>User ID</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      fontSize: 11,
                      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {user?.uid?.substring(0, 16)}...
                </Text>
              </View>
            </View>
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = {
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  saveBtn: { fontSize: 15, fontWeight: "700", color: Colors.accent },
  successToast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.successSurface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: Radius.sm,
  },
  avatarSection: { alignItems: "center", marginBottom: 32, marginTop: 8 },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 34,
    backgroundColor: Colors.surfaceElevated,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.accent,
  },
  avatarInitials: { fontSize: 36, fontWeight: "700", color: "#FFF" },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.background,
  },
  changePhotoText: { color: Colors.accent, fontSize: 14, fontWeight: "600" },
  fieldSection: { marginBottom: 28 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: { backgroundColor: Colors.surfaceElevated },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyText: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedActive: { backgroundColor: Colors.successSurface },
  verifiedInactive: { backgroundColor: Colors.warningSurface },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: Colors.accentSurface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
  },
  resendText: { color: Colors.accent, fontSize: 13, fontWeight: "600" },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  infoLabel: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  infoValue: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.errorSurface,
    padding: 12,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
};
