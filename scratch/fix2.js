const fs = require('fs');

const replaces = [
  { f: 'components/CommentBottomSheet.js', r: [/import \{ Colors, Radius, Shadows \}/g, 'import { Colors, Shadows }'], r2: [/alert\(/g, 'console.warn('] },
  { f: 'components/IssueCard.js', r: [/, openMenu, closeMenu \}/g, ', closeMenu }'], r2: [/, menuVisible \}/g, ' }'], r3: [/\(e\) => \{\n\s*e\.stopPropagation\(\);\n\s*handleDelete\(\);\n\s*\}/g, '() => handleDelete()'], r4: [/const handleDelete = .*?;\n/gs, ''] },
  { f: 'config/firebaseConfig.js', r: [/, getAnalytics \}/g, ' }'], r2: [/, fetchAndActivate \}/g, ' }'] },
  { f: 'functions/index.js', r: [/\(_, context\)/g, '(_data, context)'], r2: [/const user = await userDoc\.get\(\);/g, 'await userDoc.get();'], r3: [/const reaction = await reactionRef\.get\(\);/g, 'await reactionRef.get();'], r4: [/const queryConstraints = \[\];/g, ''], r5: [/const period = data\.period \|\| "all_time";/g, ''], r6: [/const category = data\.category \|\| null;/g, ''] },
  { f: 'index.js', r: [/\(e\) \{/g, '() {'] },
  { f: 'screens/AchievementsScreen.js', r: [/, TouchableOpacity /g, ' '], r2: [/const \{ t \} = useTranslation\(\);/g, ''] },
  { f: 'screens/AnalyticsScreen.js', r: [/import \{ View, Text, ScrollView, Dimensions, StyleSheet \} from "react-native";/g, 'import { View, Text, StyleSheet } from "react-native";'], r2: [/, Gradients /g, ' '] },
  { f: 'screens/FollowListScreen.js', r: [/, Radius /g, ' '], r2: [/const \{ t \} = useTranslation\(\);/g, ''], r3: [/const isOwnProfile = profileId === currentUser\?.uid;/g, ''] },
  { f: 'screens/HomeScreen.js', r: [/import \{ collection, query, where, getDocs \} from "firebase\/firestore";/g, ''], r2: [/, db /g, ' '], r3: [/import \* as Notifications from "expo-notifications";/g, ''], r4: [/\.catch\(\(e\) =>/g, '.catch(() =>'], r5: [/let isMounted = true;/g, ''], r6: [/isMounted = false;/g, ''] },
  { f: 'screens/IssueDetailScreen.js', r: [/, ScrollView /g, ' '] },
  { f: 'screens/LeaderboardScreen.js', r: [/, Shadows /g, ' '] },
  { f: 'screens/LoginScreen.js', r: [/, ActivityIndicator /g, ' '] },
  { f: 'screens/MapScreen.js', r: [/, Platform /g, ' '], r2: [/, Avatar /g, ' '], r3: [/const \{ user \} = useAuth\(\);/g, ''] },
  { f: 'screens/NotificationsScreen.js', r: [/, ScrollView /g, ' '] },
  { f: 'screens/ReportIssueScreen.js', r: [/, ScrollView /g, ' '], r2: [/import \{ CATEGORY_GROUPS, getCategoriesByGroup \} from "..\/constants\/categories";/g, ''], r3: [/, Gradients /g, ' '], r4: [/const \[expandedGroup, setExpandedGroup\] = useState\(null\);/g, ''] },
  { f: 'screens/SettingsScreen.js', r: [/const \{ t \} = useTranslation\(\);/g, ''], r2: [/const \[emailVerified, setEmailVerified\] = useState\(user\?.emailVerified \|\| false\);/g, ''], r3: [/catch \(err\)/g, 'catch (_err)'] },
  { f: 'screens/SignupScreen.js', r: [/, ActivityIndicator /g, ' '] },
  { f: 'screens/SolveScreen.js', r: [/, Shadows /g, ' '], r2: [/const \{ name \} = route\.params;/g, ''], r3: [/const isJoined = /g, ''], r4: [/\(\(step, index\) =>/g, '((step) =>'] },
  { f: 'screens/VerifyEmailScreen.js', r: [/, ActivityIndicator /g, ' '] },
  { f: 'screens/WatchAreaScreen.js', r: [/, ScrollView /g, ' '], r2: [/import \{ Card, Button \} from "react-native-paper";/g, ''], r3: [/\(\(loc, index\)/g, '((loc)'] },
  { f: 'screens/WatchAreaScreen.web.js', r: [/, TouchableOpacity, Alert /g, ' '], r2: [/const \[newAreaCoords, setNewAreaCoords\] = useState\(null\);/g, ''] },
  { f: 'scripts/pre-build-check.js', r: [/\(error\)/g, '()'] },
  { f: 'services/AchievementService.js', r: [/const earnedIds = new Set\(userAchievements\.map\(\(a\) => a\.id\)\);/g, ''] },
  { f: 'services/FeedService.js', r: [/import \{ doc, getDoc \} from "firebase\/firestore";/g, ''] },
  { f: 'services/LeaderboardService.js', r: [/, where /g, ' '] },
  { f: 'services/SyncService.js', r: [/const \{ _queuedAt, \.\.\.cleanIssue \} = issueData;/g, 'const cleanIssue = issueData;'] },
  { f: 'services/UserService.js', r: [/, serverTimestamp, increment /g, ' '], r2: [/catch \(error\)/g, 'catch (_error)'] }
];

replaces.forEach(({ f, ...repls }) => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    Object.values(repls).forEach(repl => {
      content = content.replace(repl[0], repl[1]);
    });
    fs.writeFileSync(f, content);
  }
});
