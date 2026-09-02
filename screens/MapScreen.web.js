import { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Colors, Spacing, theme } from "../theme";
import { IssueService } from "../services/IssueService";
import IssueCard from "../components/IssueCard";

export default function MapScreen() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const { data } = await IssueService.getIssuesPaginated(50, null, "All");
        setIssues(data);
      } catch (error) {
        console.error("Failed to load issues for web fallback", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Issue Directory</Text>
        <Text style={styles.headerSub}>Map is unsupported on web. Showing list view instead.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.accentBrand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IssueCard issue={item} />}
          contentContainerStyle={{ paddingBottom: 100, maxWidth: 800, alignSelf: "center", width: "100%", marginTop: Spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: theme.type?.display?.fontFamily,
    fontWeight: theme.type?.display?.fontWeight,
    color: theme.colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
