import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated } from "react-native";
import Constants from "expo-constants";
import { AuthService } from "../services/AuthService";
import { useAuth } from "../contexts/AuthContext";
import { Colors, Spacing, Radius, Typography } from "../theme";

export default function SettingsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [emailVerified] = useState(user?.emailVerified || false);
  const [loggingOut, setLoggingOut] = useState(false);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of Civic?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await AuthService.logout();
          } catch {
            Alert.alert("Error", "Failed to log out. Please try again.");
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Linking.openURL(
              "mailto:support@civic.app?subject=Delete%20Account",
            );
          },
        },
      ],
    );
  };

  const SettingRow = ({ icon, title, subtitle, onPress, right, danger }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={danger ? Colors.error : Colors.accent}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right ||
        (onPress && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={Colors.textTertiary}
          />
        ))}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingRow
            icon="account-outline"
            title={user?.displayName || "Civic User"}
            subtitle={user?.email || ""}
          />
          <SettingRow
            icon="email-check-outline"
            title="Email Verification"
            subtitle={emailVerified ? "Verified" : "Not verified"}
            right={
              <View
                style={[
                  styles.badge,
                  emailVerified ? styles.badgeGreen : styles.badgeYellow,
                ]}
              >
                <Text style={styles.badgeText}>
                  {emailVerified ? "✓ Verified" : "⚠ Pending"}
                </Text>
              </View>
            }
          />
          <SettingRow
            icon="numeric"
            title="App Version"
            subtitle={`v${Constants.expoConfig?.version || "1.0.0"} (${Constants.expoConfig?.android?.versionCode || "1"})`}
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="PRIVACY" />
        <View style={styles.section}>
          <SettingRow
            icon="map-marker-outline"
            title="Location Access"
            subtitle="Required for watch areas and nearby issues"
            right={
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ true: Colors.accent, false: Colors.border }}
                thumbColor="#FFF"
              />
            }
          />
          <SettingRow
            icon="bell-outline"
            title="Push Notifications"
            subtitle="Get notified about your issues and followers"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: Colors.accent, false: Colors.border }}
                thumbColor="#FFF"
              />
            }
          />
        </View>

        {/* Support */}
        <SectionHeader title="SUPPORT" />
        <View style={styles.section}>
          <SettingRow
            icon="file-document-outline"
            title="Terms of Service"
            onPress={() => Linking.openURL("https://civic.app/terms")}
          />
          <SettingRow
            icon="shield-lock-outline"
            title="Privacy Policy"
            onPress={() => Linking.openURL("https://civic.app/privacy")}
          />
          <SettingRow
            icon="help-circle-outline"
            title="Help & FAQ"
            onPress={() => Linking.openURL("https://civic.app/help")}
          />
          <SettingRow
            icon="email-outline"
            title="Contact Support"
            onPress={() => Linking.openURL("mailto:support@civic.app")}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="DANGER ZONE" />
        <View style={styles.section}>
          <SettingRow
            icon="delete-outline"
            title="Delete Account"
            subtitle="Permanently remove your account and data"
            onPress={handleDeleteAccount}
            danger
          />
          <SettingRow
            icon="logout"
            title="Log Out"
            subtitle="Sign out of Civic"
            onPress={handleLogout}
            right={
              loggingOut ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.error}
                />
              )
            }
            danger
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sectionHeader: {
    ...Typography.overline,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentSurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  rowIconDanger: { backgroundColor: Colors.errorSurface },
  rowContent: { flex: 1 },
  rowTitle: { ...Typography.body, color: Colors.textPrimary },
  rowTitleDanger: { color: Colors.error },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  badgeGreen: { backgroundColor: Colors.successSurface },
  badgeYellow: { backgroundColor: Colors.warningSurface },
  badgeText: { ...Typography.caption, color: Colors.textPrimary },
});
