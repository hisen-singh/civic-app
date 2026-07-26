import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CATEGORIES } from "../../data/categories";
import { Colors } from "../../theme";

export default function CategoryGrid({ category, setCategory }) {
  return (
    <View style={styles.categoryGrid}>
      {CATEGORIES.map((c) => {
        const isActive = category === c.name;
        return (
          <TouchableOpacity
            key={c.name}
            onPress={() => setCategory(c.name)}
            activeOpacity={0.7}
            style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Select category: ${c.name}`}
          >
            <View
              style={[
                styles.categoryIconWrap,
                isActive && styles.categoryIconWrapActive,
              ]}
            >
              <MaterialCommunityIcons
                name={c.icon}
                size={18}
                color={isActive ? "#FFF" : Colors.textTertiary}
              />
            </View>
            <Text
              style={[
                styles.categoryText,
                isActive && styles.categoryTextActive,
              ]}
              numberOfLines={1}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000", // Absolute Black
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 0, // Sharp corners
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF", // High-contrast border
  },
  categoryChipActive: {
    backgroundColor: "#FF4500", // Electric Orange
    borderColor: "#FF4500",
  },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 0, // Sharp
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryIconWrapActive: {
    backgroundColor: "#000000", // Inner black
  },
  categoryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
