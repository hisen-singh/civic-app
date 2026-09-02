import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function WatchAreaScreen() {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color={theme.colors.textMuted} style={{ marginBottom: 16 }} />
      <Text style={styles.title}>Watch Areas Unavailable</Text>
      <Text style={styles.subtitle}>
        Setting up location-based Watch Areas requires native device capabilities. Please use the iOS or Android app to configure your alerts!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
