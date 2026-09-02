const fs = require('fs');
const path = require('path');

const replacements = {
  'screens/IssueDetailScreen.js': [
    ['View, ScrollView, StyleSheet', 'View, StyleSheet']
  ],
  'screens/LeaderboardScreen.js': [
    ['Spacing, Radius, Shadows, Typography', 'Spacing, Radius, Typography']
  ],
  'screens/LoginScreen.js': [
    ['Text, ActivityIndicator }', 'Text }']
  ],
  'screens/MapScreen.js': [
    ['Platform, StyleSheet', 'StyleSheet'],
    ['import { Avatar } from \'react-native-paper\';\n', ''],
    ['import { Avatar } from \'react-native-paper\';\r\n', ''],
    ['const { user } = useAuth();\n', ''],
    ['const { user } = useAuth();\r\n', ''],
    ['import { useAuth } from "../contexts/AuthContext";\n', ''],
    ['import { useAuth } from "../contexts/AuthContext";\r\n', ''],
    ['import { useAuth } from \'../contexts/AuthContext\';\n', ''],
    ['import { useAuth } from \'../contexts/AuthContext\';\r\n', '']
  ],
  'screens/NotificationsScreen.js': [
    ['View, ScrollView, Animated', 'View, Animated']
  ],
  'screens/ReportIssueScreen.js': [
    ['ScrollView, KeyboardAvoidingView', 'KeyboardAvoidingView'],
    ['Spacing, Radius, Shadows, Gradients', 'Spacing, Radius, Shadows']
  ],
  'screens/SettingsScreen.js': [
    ['const { t } = useTranslation();\n', ''],
    ['const { t } = useTranslation();\r\n', ''],
    ['const [emailVerified, setEmailVerified] = useState(false);\n', ''],
    ['const [emailVerified, setEmailVerified] = useState(false);\r\n', ''],
    ['} catch (err) {', '} catch {'],
    ['import { useTranslation } from "react-i18next";\n', ''],
    ['import { useTranslation } from "react-i18next";\r\n', '']
  ],
  'screens/SignupScreen.js': [
    ['Text, ActivityIndicator }', 'Text }']
  ],
  'screens/SolveScreen.js': [
    ['Spacing, Radius, Typography, Shadows', 'Spacing, Radius, Typography'],
    ['const { issueId, name } = route.params;', 'const { issueId } = route.params;'],
    ['const isJoined = ', 'const _isJoined = '],
    ['{item, index}', '{item}']
  ],
  'screens/WatchAreaScreen.js': [
    ['Text, ActivityIndicator, ScrollView }', 'Text, ActivityIndicator }'],
    ['import { Card, Button } from \'react-native-paper\';\n', ''],
    ['import { Card, Button } from \'react-native-paper\';\r\n', ''],
    ['{item, index}', '{item}']
  ],
  'screens/WatchAreaScreen.web.js': [
    ['TouchableOpacity, StyleSheet', 'StyleSheet'],
    ['import { Alert } from \'react-native\';\n', ''],
    ['import { Alert } from \'react-native\';\r\n', ''],
    ['const [newAreaCoords, setNewAreaCoords] = useState(null);\n', ''],
    ['const [newAreaCoords, setNewAreaCoords] = useState(null);\r\n', '']
  ]
};

for (const [file, reps] of Object.entries(replacements)) {
  const p = path.join(__dirname, '..', file);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  for (const [search, replacement] of reps) {
    content = content.replace(search, replacement);
  }
  fs.writeFileSync(p, content);
}
console.log('Done fixing screens');
