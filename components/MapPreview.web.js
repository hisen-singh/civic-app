import React from "react";
import { View, Text } from "react-native";
import { theme } from "../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MapPreview({ latitude, longitude }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSubtle, justifyContent: "center", alignItems: "center" }}>
      <MaterialCommunityIcons name="map-marker-off-outline" size={24} color={theme.colors.textMuted} style={{ marginBottom: 4 }} />
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
        Map preview unavailable on Web
      </Text>
    </View>
  );
}
