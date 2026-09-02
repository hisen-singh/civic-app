import { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { AuthService } from "../services/AuthService";
import { mapFirebaseAuthError } from "../utils/authValidators";
import GradientButton from "../components/ui/GradientButton";
import { Colors, Gradients, Radius, Spacing } from "../theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errCode, setErrCode] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 5,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -5,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogin = async () => {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setErrorMsg("No internet connection. Please try again when online.");
      setErrCode(null);
      shake();
      return;
    }

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      setErrCode(null);
      shake();
      return;
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      shake();
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setErrCode(null);
    setResetSent(false);
    try {
      await AuthService.login(email.trim(), password);
    } catch (error) {
      setErrorMsg(
        mapFirebaseAuthError(error.code) ||
          error.message ||
          "Login failed. Please try again."
      );
      setErrCode(error.code || null);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      setErrorMsg("No internet connection. Please try again when online.");
      setErrCode(null);
      shake();
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Enter your email address first, then tap Reset.");
      setErrCode(null);
      shake();
      return;
    }
    setResetLoading(true);
    setErrorMsg("");
    setErrCode(null);
    try {
      await AuthService.resetPassword(email.trim());
      setResetSent(true);
    } catch (error) {
      console.error(
        "[LoginScreen] Password reset error:",
        error.code,
        error.message,
      );
      setErrorMsg(
        mapFirebaseAuthError(error.code) ||
          error.message ||
          "Failed to send reset email."
      );
      setErrCode(error.code || null);
      shake();
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <LinearGradient colors={Gradients.authBg} style={{ flex: 1 }}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: Spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <LinearGradient
              colors={[Colors.accentSurface, "rgba(19, 25, 37, 0.8)"]}
              style={styles.logoContainer}
            >
              <MaterialCommunityIcons
                name="shield-check"
                size={32}
                color={Colors.accentLight}
              />
            </LinearGradient>
            <Text style={styles.logoText}>Civic</Text>
            <Text style={styles.subtitle}>Sign in to your community</Text>
            <View style={styles.featureRow}>
              {["Report", "Solve", "Impact"].map((tag) => (
                <View key={tag} style={styles.featureTag}>
                  <Text style={styles.featureTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <TextInput
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrorMsg("");
                setErrCode(null);
              }}
              mode="outlined"
              style={styles.input}
              textColor={Colors.textPrimary}
              theme={{
                colors: { primary: Colors.accent, outline: Colors.border },
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              left={
                <TextInput.Icon
                  icon="email-outline"
                  color={Colors.textTertiary}
                />
              }
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrorMsg("");
                setErrCode(null);
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              textColor={Colors.textPrimary}
              theme={{
                colors: { primary: Colors.accent, outline: Colors.border },
              }}
              left={
                <TextInput.Icon
                  icon="lock-outline"
                  color={Colors.textTertiary}
                />
              }
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off-outline" : "eye-outline"}
                  color={Colors.textTertiary}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={resetLoading}
              style={{
                alignSelf: "flex-end",
                marginBottom: 20,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: Colors.textTertiary, fontSize: 13 }}>
                {resetLoading ? "Sending..." : "Forgot password?"}
              </Text>
            </TouchableOpacity>

            {/* Error / Success */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                  {errCode ? (
                    <Text style={styles.errorCodeText}>code: {errCode}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {resetSent ? (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.successText}>
                  Reset email sent! Check your inbox.
                </Text>
              </View>
            ) : null}

            {/* Login Button */}
            <GradientButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 4 }}
            />
          </Animated.View>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Signup")}
            style={{ marginTop: 24, alignItems: "center" }}
          >
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              Don't have an account?{" "}
              <Text style={{ color: Colors.accent, fontWeight: "700" }}>
                Create one
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = {
  bgOrbTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  bgOrbBottom: {
    position: "absolute",
    bottom: 60,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    gap: 8,
  },
  featureTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    marginBottom: 16,
    height: 48,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  errorCodeText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
  successText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
};
