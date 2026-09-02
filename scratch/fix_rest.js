const fs = require('fs');

function fixFile(file, replacements) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  for (const [old, newStr] of replacements) {
    if (old instanceof RegExp) {
      content = content.replace(old, newStr);
    } else {
      content = content.replace(old, newStr);
    }
  }
  fs.writeFileSync(file, content);
}

// CommentBottomSheet.js: alert -> Alert.alert, Radius
fixFile('components/CommentBottomSheet.js', [
  [/Colors, Spacing, Radius, Typography/, 'Colors, Spacing, Typography'],
  [/alert\(/g, 'Alert.alert(']
]);

// IssueCard.js: menuVisible, openMenu, e, handleDelete
fixFile('components/IssueCard.js', [
  [/const \[menuVisible, setMenuVisible\] = useState\(false\);\r?\n/, ''],
  [/const openMenu = \(\) => setMenuVisible\(true\);\r?\n/, ''],
  [/const closeMenu = \(\) => setMenuVisible\(false\);\r?\n/, ''],
  [/const handleDelete = async \(\) => \{[\s\S]*?\};\r?\n\r?\n/, ''],
  [/\(e\) => \{/, '() => {']
]);

// AchievementService.js: earnedIds
fixFile('services/AchievementService.js', [
  [/const earnedIds = userDocs\.map\(\(doc\) => doc\.data\(\)\.achievementId\);\r?\n/, '']
]);

// FeedService.js: doc, getDoc
fixFile('services/FeedService.js', [
  [/doc,\r?\n  getDoc,\r?\n/, '']
]);

// LeaderboardService.js: where
fixFile('services/LeaderboardService.js', [
  [/where,\r?\n/, '']
]);

// SyncService.js: _queuedAt
fixFile('services/SyncService.js', [
  [/const \{ _queuedAt, \.\.\.cleanPayload \} = payload;/, 'const { _queuedAt: _ignore, ...cleanPayload } = payload;']
]);

// UserService.js: serverTimestamp, increment, error
fixFile('services/UserService.js', [
  [/serverTimestamp,\r?\n  increment,\r?\n/, ''],
  [/} catch \(error\) \{/, '} catch {']
]);

console.log("Done fixing rest");
