const fs = require('fs');
const path = require('path');

const fix = (file, replacements) => {
  const p = path.join(__dirname, '..', file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  for (const [s, r] of replacements) {
    // If it's a regex
    if (s instanceof RegExp) {
      content = content.replace(s, r);
    } else {
      content = content.replace(s, r);
    }
  }
  fs.writeFileSync(p, content);
};

// FollowListScreen.js: Parsing error: Identifier 'Animated' has already been declared
fix('screens/FollowListScreen.js', [
  [/import \{ Animated \} from "react-native";\r?\n/, '']
]);

// IssueDetailScreen.js: 'ScrollView' is defined but never used
fix('screens/IssueDetailScreen.js', [
  [/View, ScrollView, StyleSheet/, 'View, StyleSheet'],
  [/View, ScrollView, Animated, StyleSheet/, 'View, Animated, StyleSheet']
]);

// LeaderboardScreen.js: 'Shadows' is defined but never used
fix('screens/LeaderboardScreen.js', [
  [/Spacing, Radius, Shadows, Typography/, 'Spacing, Radius, Typography']
]);

// LoginScreen.js: 'ActivityIndicator' is defined but never used
fix('screens/LoginScreen.js', [
  [/Text, ActivityIndicator \}/, 'Text }']
]);

// MapScreen.js: 'Platform', 'Avatar'
fix('screens/MapScreen.js', [
  [/Platform, StyleSheet/, 'StyleSheet'],
  [/import \{ Avatar \} from 'react-native-paper';\r?\n/, '']
]);

// NotificationsScreen.js: 'ScrollView'
fix('screens/NotificationsScreen.js', [
  [/View, ScrollView, Animated/, 'View, Animated']
]);

// ReportIssueScreen.js: ScrollView, CATEGORY_GROUPS, getCategoriesByGroup, Gradients, expandedGroup, setExpandedGroup
fix('screens/ReportIssueScreen.js', [
  [/ScrollView, KeyboardAvoidingView/, 'KeyboardAvoidingView'],
  [/Spacing, Radius, Shadows, Gradients/, 'Spacing, Radius, Shadows'],
  [/const CATEGORY_GROUPS = \[[\s\S]*?\];\r?\n\r?\n/, ''],
  [/const getCategoriesByGroup = \(\) => \{[\s\S]*?\};\r?\n\r?\n/, ''],
  [/const \[expandedGroup, setExpandedGroup\] = useState\(null\);\r?\n/, '']
]);

// SettingsScreen.js: setEmailVerified, _err
fix('screens/SettingsScreen.js', [
  [/const \[emailVerified, setEmailVerified\] = useState\(false\);\r?\n/, ''],
  [/\} catch \(_err\) \{/, '} catch {']
]);

// SignupScreen.js: ActivityIndicator
fix('screens/SignupScreen.js', [
  [/Text, ActivityIndicator \}/, 'Text }']
]);

// SolveScreen.js: Shadows, name, index, _isJoined
fix('screens/SolveScreen.js', [
  [/Spacing, Radius, Typography, Shadows/, 'Spacing, Radius, Typography'],
  [/const \{ issueId, name \} = route\.params;/, 'const { issueId } = route.params;'],
  [/const _isJoined = [\s\S]*?;\r?\n/, ''],
  [/\{item, index\}/g, '{item}']
]);

// WatchAreaScreen.js: ScrollView, Card, Button, index
fix('screens/WatchAreaScreen.js', [
  [/Text, ActivityIndicator, ScrollView \}/, 'Text, ActivityIndicator }'],
  [/import \{ Card, Button \} from 'react-native-paper';\r?\n/, ''],
  [/\{item, index\}/g, '{item}']
]);

// WatchAreaScreen.web.js: TouchableOpacity, Alert, setNewAreaCoords
fix('screens/WatchAreaScreen.web.js', [
  [/TouchableOpacity, StyleSheet/, 'StyleSheet'],
  [/import \{ Alert \} from 'react-native';\r?\n/, ''],
  [/const \[newAreaCoords, setNewAreaCoords\] = useState\(null\);\r?\n/, '']
]);

console.log('Fixed screens');
