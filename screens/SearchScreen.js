import { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IssueService } from "../services/IssueService";
import IssueCard from "../components/IssueCard";
import { theme, Spacing } from "../theme";

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await IssueService.searchIssues(query);
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing.sm,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 12, padding: 4 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            paddingHorizontal: 16,
            height: 44,
          }}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={theme.colors.textMuted}
          />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              color: theme.colors.textPrimary,
              fontSize: 15,
              fontFamily: theme.font.body,
            }}
            placeholder="Search issues, locations..."
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.accentBrand} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IssueCard issue={item} />}
          contentContainerStyle={{
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + 80,
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", marginTop: 60 }}>
              <MaterialCommunityIcons
                name={query.length > 0 ? "text-box-search-outline" : "magnify"}
                size={48}
                color={theme.colors.textMuted}
                style={{ opacity: 0.5, marginBottom: 16 }}
              />
              <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>
                {query.length > 0
                  ? "No issues found matching your search."
                  : "Type to search for issues in your area."}
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
