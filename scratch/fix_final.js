const fs = require('fs');

function fixFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [old, newStr] of replacements) {
    content = content.replace(old, newStr);
  }
  fs.writeFileSync(file, content);
}

// SolveScreen.js: useRoute, index
fixFile('screens/SolveScreen.js', [
  ['useFocusEffect, useNavigation, useRoute', 'useFocusEffect, useNavigation'],
  ['{ item, index }', '{ item }']
]);

// WatchAreaScreen.js: index
fixFile('screens/WatchAreaScreen.js', [
  ['watchAreas.map((area, index) => (', 'watchAreas.map((area) => (']
]);

// WatchAreaScreen.web.js: Alert, setNewAreaCoords
fixFile('screens/WatchAreaScreen.web.js', [
  ['import { Alert } from "react-native";\r\n', ''],
  ['import { Alert } from "react-native";\n', ''],
  ['import { Alert } from \'react-native\';\r\n', ''],
  ['import { Alert } from \'react-native\';\n', ''],
  ['const [newAreaCoords, setNewAreaCoords] = useState(', 'const [newAreaCoords] = useState(']
]);

console.log("Done Final Fixes");
