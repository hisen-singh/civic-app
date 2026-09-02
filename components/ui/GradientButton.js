import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedPressable from "./AnimatedPressable";
import { theme } from "../../theme";

export default function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = "md",
}) {
  const paddingVertical = size === "sm" ? 10 : size === "lg" ? 16 : 14;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          borderRadius: theme.radius.md,
          overflow: "hidden",
          backgroundColor: disabled
            ? theme.colors.surfaceElevated
            : theme.colors.accentBrand,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical,
          paddingHorizontal: 24,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size={20} />
        ) : (
          <>
            {icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
            ) : null}
            <Text
              style={[
                {
                  color: disabled ? theme.colors.textMuted : "#FFF",
                  fontSize,
                  fontFamily: theme.type?.meta?.fontFamily,
                  fontWeight: "600",
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}
