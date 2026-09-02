import { ScrollView, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedPressable from "./AnimatedPressable";
import { theme, Spacing } from "../../theme";

export default function FilterPills({
  items,
  selected,
  onSelect,
  style,
  contentStyle,
  variant = "pill",
}) {
  const pillItems = items || [];

  if (variant === "underline") {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ paddingHorizontal: Spacing.lg }, contentStyle]}
        style={style}
      >
        {pillItems.map((cat) => {
          const isSelected = selected === cat.id;
          const label = cat.title || cat.label;

          return (
            <AnimatedPressable
              key={cat.id}
              onPress={() => onSelect(cat.id)}
              activeScale={0.95}
              style={{ marginRight: Spacing.xl, alignItems: "stretch" }}
            >
              <Text
                style={{
                  color: isSelected
                    ? theme.colors.textPrimary
                    : theme.colors.textMuted,
                  fontSize: 16,
                  fontFamily: theme.type?.meta?.fontFamily,
                  fontWeight: isSelected ? "600" : "400",
                  paddingBottom: 7,
                  textAlign: "center",
                }}
              >
                {label}
              </Text>
              <View
                style={{
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: isSelected
                    ? theme.colors.accentBrand
                    : "transparent",
                }}
              />
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: Spacing.lg }, contentStyle]}
      style={style}
    >
      {pillItems.map((cat) => {
        const isSelected = selected === cat.id;
        const label = cat.title || cat.label;

        return (
          <AnimatedPressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            activeScale={0.95}
            style={{ marginRight: 8 }}
          >
            <View
              style={[{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.accentBrand : theme.colors.borderSubtle,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: theme.radius.xl,
              }]}
            >
              <MaterialCommunityIcons
                name={cat.icon}
                size={14}
                color={isSelected ? theme.colors.accentBrand : theme.colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: isSelected ? theme.colors.textPrimary : theme.colors.textMuted,
                  fontSize: 13,
                  fontFamily: theme.type?.meta?.fontFamily,
                  fontWeight: "600",
                }}
              >
                {label}
              </Text>
              {cat.badge != null && cat.badge > 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.statusCritical,
                    borderRadius: 6,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    marginLeft: 6,
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}
                  >
                    {cat.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}
