import 'react-native-gesture-handler';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://d5b01a64380af12501ef47bdc7b3df95@o4511522407383040.ingest.us.sentry.io/4511522411511808', // Get from sentry.io (free tier)
  enableInExpoDevelopment: false,
  debug: false,
});
import { View, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Colors, Radius } from './theme';

// Screens
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ReportIssueScreen from './screens/ReportIssueScreen';
import IssueDetailScreen from './screens/IssueDetailScreen';
import WatchAreaScreen from './screens/WatchAreaScreen';
import NotificationsScreen from './screens/NotificationsScreen';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Theme Configuration — unified with theme.js
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.textPrimary,
    secondary: Colors.textSecondary,
    tertiary: Colors.success,
    background: Colors.background,
    surface: Colors.surface,
    onSurface: Colors.textPrimary,
    onBackground: Colors.textPrimary,
  },
};

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Catches render-time JS crashes so the whole app doesn't die
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 32 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color={Colors.error} style={{ marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            The app encountered an unexpected error. Please restart.
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textTertiary, textAlign: 'center', fontFamily: 'monospace' }}>
            {this.state.error?.message?.substring(0, 120)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Custom Tab Bar Icon with Active Indicator ────────────────────────────────
function TabIcon({ name, color, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={name} color={color} size={26} />
      {focused && (
        <View style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: Colors.accent,
          marginTop: 4,
        }} />
      )}
    </View>
  );
}

import { useNavigation } from '@react-navigation/native';

function MainTabs() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.background,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            elevation: 0,
            height: 68,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.textPrimary,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 0,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home-variant" color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="map-marker-radius" color={color} focused={focused} />
            ),
          }}
        />

        <Tab.Screen
          name="Impact"
          component={LeaderboardScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="chart-timeline-variant-shimmer" color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="account-circle-outline" color={color} focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
      <Stack.Screen name="WatchArea" component={WatchAreaScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// ─── Splash Screen (shown during auth/font loading) ──────────────────────────
function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <Animated.View style={{ opacity: pulseAnim, alignItems: 'center' }}>
        <Text style={{ fontSize: 42, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1.5, marginBottom: 8 }}>
          Civic
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textTertiary, letterSpacing: 0.5 }}>
          Your community platform
        </Text>
      </Animated.View>
      <ActivityIndicator size="small" color={Colors.accent} style={{ marginTop: 32 }} />
    </View>
  );
}

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

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <NavigationContainer>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </Animated.View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = Font.useFonts({
    ...MaterialCommunityIcons.font,
  });

  // Proceed if fonts loaded OR if there was an error (don't block forever)
  if (!fontsLoaded && !fontError) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

