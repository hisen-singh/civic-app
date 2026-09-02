import "react-native-gesture-handler";
import "./config/i18n";
import { useRef, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn(
    "Failed to set notification handler (likely missing google-services.json on native Android build):",
    e,
  );
}
import { View, Text, Animated, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  NavigationContainer,
  DarkTheme as NavDarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import {
  Provider as PaperProvider,
  ActivityIndicator,
} from "react-native-paper";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Font from "expo-font";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Colors, theme } from "./theme";

// Screens
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ReportIssueScreen from "./screens/ReportIssueScreen";
import IssueDetailScreen from "./screens/IssueDetailScreen";
import SolveScreen from "./screens/SolveScreen";
import WatchAreaScreen from "./screens/WatchAreaScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import PublicProfileScreen from "./screens/PublicProfileScreen";
import SearchScreen from "./screens/SearchScreen";

// Auth
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const navTheme = {
  ...NavDarkTheme,
  dark: true,
  colors: {
    ...NavDarkTheme.colors,
    primary: theme.colors.accentBrand,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    notification: theme.colors.accentBrand,
  },
};

import ErrorBoundary from "./components/ErrorBoundary";
import NetworkBanner from "./components/NetworkBanner";

// ─── Custom Tab Bar Icon with Active Indicator ────────────────────────────────
function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <MaterialCommunityIcons
        name={name}
        color={focused ? theme.colors.accentBrand : theme.colors.textMuted}
        size={22}
      />
    </View>
  );
}

const withErrorBoundary = (Component) => (props) => (
  <ErrorBoundary>
    <Component {...props} />
  </ErrorBoundary>
);

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 66 + Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: tabBarHeight,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            paddingHorizontal: 8,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={{ flex: 1 }}
            />
          ),
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: theme.type?.meta?.fontFamily,
            fontWeight: "500",
            marginTop: 2,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="Home"
          component={withErrorBoundary(HomeScreen)}
          options={{
            tabBarLabel: "Feed",
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home-variant" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={withErrorBoundary(MapScreen)}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="map-marker-radius" focused={focused} />
            ),
          }}
        />

        <Tab.Screen
          name="Add"
          component={HomeScreen} // Dummy component
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("ReportIssue");
            },
          })}
          options={{
            tabBarLabel: "",
            tabBarIcon: () => (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  marginTop: -12,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.colors.accentBrand,
                  borderWidth: 2,
                  borderColor: theme.colors.background,
                }}
              >
                <MaterialCommunityIcons name="plus" color="#FFF" size={26} />
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Solve"
          component={withErrorBoundary(SolveScreen)}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="hand-heart-outline" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={withErrorBoundary(ProfileScreen)}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="account-circle-outline" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="WatchArea" component={WatchAreaScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  );
}

// ─── Splash Screen (shown during auth/font loading) ──────────────────────────
function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background,
      }}
    >
      <Animated.View style={{ opacity: pulseAnim, alignItems: "center" }}>
        <Image
          source={require("./assets/logo.jpg")}
          style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 16 }}
        />
        <Text
          style={{
            fontSize: 42,
            fontWeight: "800",
            color: Colors.textPrimary,
            letterSpacing: -1.5,
            marginBottom: 8,
          }}
        >
          Civic
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.textTertiary,
            letterSpacing: 0.5,
          }}
        >
          Your community platform
        </Text>
      </Animated.View>
      <ActivityIndicator
        size="small"
        color={Colors.accent}
        style={{ marginTop: 32 }}
      />
    </View>
  );
}

import VerifyEmailScreen from "./screens/VerifyEmailScreen";

function AppContent() {
  const { user, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Small delay to let the app tree mount before animating in
      const timer = setTimeout(() => {
        setShowApp(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || !showApp) {
    return <SplashScreen />;
  }

  // Auth Guard: Enforce email verification
  if (user && !user.emailVerified) {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <VerifyEmailScreen />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <NavigationContainer theme={navTheme}>
        <AppStack />
      </NavigationContainer>
    </Animated.View>
  );
}

function App() {
  const [fontsLoaded, fontError] = Font.useFonts({
    ...MaterialCommunityIcons.font,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  // Proceed if fonts loaded OR if there was an error (don't block forever)
  if (!fontsLoaded && !fontError) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NetworkBanner />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
