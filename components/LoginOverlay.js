import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthService } from "../services/AuthService";
import { Spacing, theme } from "../theme";

export default function LoginOverlay({ visible, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Name is required for signup.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await AuthService.login(email.trim(), password);
      } else {
        await AuthService.signup(name.trim(), email.trim(), password);
      }
      // Success! Close the modal.
      onClose();
    } catch (err) {
      console.error("Auth error:", err);
      // Simple generic error message handling
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid credentials. Try again.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email is already registered.");
      } else {
        setError(err.message || "An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlayBackground}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.containerWrap}
            >
              <View style={styles.modalBox}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>
                    {isLogin ? "SIGN IN" : "JOIN THE FIGHT"}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close overlay"
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={28}
                      color={theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Error Banner */}
                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Inputs */}
                <View style={styles.form}>
                  {!isLogin && (
                    <TextInput
                      style={styles.input}
                      placeholder="DISPLAY NAME"
                      placeholderTextColor={theme.colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder="EMAIL ADDRESS"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="PASSWORD"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitText}>
                        {isLogin ? "AUTHORIZE" : "CREATE ACCOUNT"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Footer Toggle */}
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.toggleText}>
                    {isLogin ? "No account? " : "Already registered? "}
                    <Text style={styles.toggleTextHighlight}>
                      {isLogin ? "Sign up here." : "Sign in."}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  containerWrap: {
    width: "100%",
    maxWidth: 400,
  },
  modalBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 0, // Strict brutalism
    padding: Spacing.xl,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  closeBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -12, // Offset to align visually while maintaining touch target
    marginTop: -12,
  },
  errorBanner: {
    backgroundColor: theme.colors.accentBrand, // Electric Orange for errors too
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    height: 48, // 48x48 min touch target
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: theme.colors.accentBrand,
    borderWidth: 2,
    borderColor: theme.colors.border,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
    shadowColor: theme.colors.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toggleBtn: {
    marginTop: Spacing.xl,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextHighlight: {
    color: theme.colors.accentBrand, // Electric orange highlight
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
