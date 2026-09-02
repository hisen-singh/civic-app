import { useState } from "react";
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
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { AuthService } from "../services/AuthService";
import { mapFirebaseAuthError, validateEmail } from "../utils/authValidators";
import { Spacing, theme } from "../theme";

export default function LoginOverlay({ visible, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errCode, setErrCode] = useState(null);

  const handleForgotPassword = async () => {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setError("No internet connection. Please try again when online.");
      setErrCode(null);
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address first, then tap Forgot password.");
      setErrCode(null);
      return;
    }
    setResetLoading(true);
    setError(null);
    setErrCode(null);
    try {
      await AuthService.resetPassword(email.trim());
      Alert.alert(
        "Reset Email Sent",
        `If an account exists for ${email.trim()}, a password reset link is on its way. Check your inbox (and spam folder).`,
      );
    } catch (err) {
      console.error(
        "[LoginOverlay] Password reset error:",
        err.code,
        err.message,
      );
      setError(
        mapFirebaseAuthError(err.code) ||
          err.message ||
          "Failed to send reset email.",
      );
      setErrCode(err.code || null);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async () => {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setError("No internet connection. Please try again when online.");
      setErrCode(null);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      setErrCode(null);
      return;
    }
    
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.ok) {
      setError(emailValidation.error);
      setErrCode(null);
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Name is required for signup.");
      setErrCode(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrCode(null);
    try {
      if (isLogin) {
        await AuthService.login(email.trim(), password);
      } else {
        await AuthService.signup(name.trim(), email.trim(), password);
      }
      // Success! Close the modal.
      onClose();
    } catch (err) {
      console.error("[LoginOverlay] Auth error:", err.code, err.message);
      // Firebase v12 reports bad credentials as auth/invalid-credential;
      // mapFirebaseAuthError covers that plus network/config/verify-email cases.
      setError(
        mapFirebaseAuthError(err.code) ||
          err.message ||
          "An error occurred. Please try again.",
      );
      setErrCode(err.code || null);
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
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.containerWrap}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalBox}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.title}>
                      {isLogin ? "Sign In" : "Join Civic"}
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
                      {errCode ? (
                        <Text style={styles.errorCodeText}>
                          code: {errCode}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Inputs */}
                  <View style={styles.form}>
                    {!isLogin && (
                      <TextInput
                        style={styles.input}
                        placeholder="Display Name"
                        placeholderTextColor={theme.colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    )}
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor={theme.colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <View>
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((s) => !s)}
                        style={styles.eyeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <MaterialCommunityIcons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.submitBtn}
                      activeOpacity={0.8}
                      onPress={handleSubmit}
                      disabled={loading || resetLoading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.submitText}>
                          {isLogin ? "Sign In" : "Create Account"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Forgot Password (login mode only) */}
                    {isLogin && (
                      <TouchableOpacity
                        onPress={handleForgotPassword}
                        disabled={resetLoading || loading}
                        style={styles.forgotBtn}
                      >
                        {resetLoading ? (
                          <ActivityIndicator
                            color={theme.colors.textMuted}
                            size="small"
                          />
                        ) : (
                          <Text style={styles.forgotText}>
                            Forgot password?
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Footer Toggle */}
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setErrCode(null);
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
              </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorCodeText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
  modalBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: Spacing.xl,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontFamily: theme.type?.title?.fontFamily,
    fontWeight: theme.type?.title?.fontWeight,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -12,
    marginTop: -12,
  },
  errorBanner: {
    backgroundColor: theme.colors.statusCriticalBg,
    borderWidth: 1,
    borderColor: theme.colors.statusCritical,
    borderRadius: theme.radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: theme.colors.statusCritical,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    height: 48,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    fontFamily: theme.type?.body?.fontFamily,
  },
  submitBtn: {
    backgroundColor: theme.colors.accentBrand,
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: theme.type?.meta?.fontFamily,
    fontWeight: "600",
  },
  toggleBtn: {
    marginTop: Spacing.xl,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotBtn: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  forgotText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  toggleText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  toggleTextHighlight: {
    color: theme.colors.accentBrand,
    fontWeight: "600",
  },
});
