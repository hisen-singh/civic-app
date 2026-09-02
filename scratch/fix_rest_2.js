const fs = require('fs');

function fixFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [old, newStr] of replacements) {
    content = content.replace(old, newStr);
  }
  fs.writeFileSync(file, content);
}

// IssueCard.js
fixFile('components/IssueCard.js', [
  [/const \[menuVisible, setMenuVisible\] = useState\(false\);\r?\n/, ''],
  [/const openMenu = \(\) => setMenuVisible\(true\);\r?\n/, ''],
  [/const closeMenu = \(\) => setMenuVisible\(false\);\r?\n/, ''],
  [/\} catch \(e\) \{/, '} catch {'],
  [/  const handleDelete = \(\) => \{[\s\S]*?    \);\r?\n  \};\r?\n/, '']
]);

// CommentBottomSheet.js
fixFile('components/CommentBottomSheet.js', [
  [/alert\(/g, 'Alert.alert('],
  [/import \{ Colors, Spacing, Radius, Typography \} from "\.\.\/theme";/, 'import { Colors, Spacing, Typography } from "../theme";'],
  [/import \{\r?\n  View,\r?\n  TextInput,\r?\n  TouchableOpacity,\r?\n  StyleSheet,\r?\n  KeyboardAvoidingView,\r?\n  Platform,\r?\n  FlatList,\r?\n\} from "react-native";/, 'import {\n  View,\n  TextInput,\n  TouchableOpacity,\n  StyleSheet,\n  KeyboardAvoidingView,\n  Platform,\n  FlatList,\n  Alert,\n} from "react-native";']
]);

// AchievementService.js
fixFile('services/AchievementService.js', [
  [/const earnedIds = userDocs\.map\(\(doc\) => doc\.data\(\)\.achievementId\);\r?\n/, '']
]);

// SyncService.js
fixFile('services/SyncService.js', [
  [/const \{ _queuedAt, \.\.\.cleanPayload \} = payload;/, 'const { _queuedAt: _ignore, ...cleanPayload } = payload;']
]);

console.log("Done");
