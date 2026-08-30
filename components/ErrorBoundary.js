import { Component } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import * as Sentry from "@sentry/react-native";

import { Colors, Spacing, Radius } from "../theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    Sentry.captureException(error);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      const { error, showDetails } = this.state;
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={48}
                color={Colors.error}
              />
            </View>
            <Text style={styles.title}>Oops! Something went wrong.</Text>
            <Text style={styles.subtitle}>
              Please try again. If it keeps happening, restart the app.
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.resetError}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            {error != null && (
              <View style={styles.detailsWrap}>
                <TouchableOpacity
                  onPress={() =>
                    this.setState((s) => ({ showDetails: !s.showDetails }))
                  }
                >
                  <Text style={styles.detailsToggle}>
                    {showDetails ? "Hide details" : "View details"}
                  </Text>
                </TouchableOpacity>
                {showDetails && (
                  <ScrollView
                    style={styles.detailsBox}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                  >
                    <Text style={styles.detailsText}>
                      {String(
                        error && error.message ? error.message : error,
                      )}
                      {"\n"}
                      {String(
                        error && error.componentStack
                          ? error.componentStack
                          : "",
                      )}
                    </Text>
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSurface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  detailsWrap: {
    width: "100%",
    marginTop: Spacing.md,
    alignItems: "center",
  },
  detailsToggle: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 8,
  },
  detailsBox: {
    width: "100%",
    maxHeight: 180,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  detailsText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: undefined,
  },
});
