const fs = require('fs');

function fixFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [old, newStr] of replacements) {
    content = content.replace(old, newStr);
  }
  fs.writeFileSync(file, content);
}

fixFile('screens/WatchAreaScreen.js', [
  ['import React, { useState, useEffect, useRef } from "react";\r\n', 'import { useState, useEffect, useRef } from "react";\n'],
  ['import React, { useState, useEffect, useRef } from "react";\n', 'import { useState, useEffect, useRef } from "react";\n'],
  ['ScrollView,\r\n', ''],
  ['ScrollView,\n', ''],
  ['  Card,\r\n  Button,\r\n', ''],
  ['  Card,\n  Button,\n', ''],
  ['{ area, index }', '{ area }'],
  ['{ area, index }', '{ area }'],
  ['{ item, index }', '{ item }'],
  ['{item, index}', '{item}']
]);

fixFile('screens/WatchAreaScreen.web.js', [
  ['import React, { useState, useEffect } from "react";\r\n', 'import { useState, useEffect } from "react";\n'],
  ['import React, { useState, useEffect } from "react";\n', 'import { useState, useEffect } from "react";\n'],
  ['TouchableOpacity,\r\n', ''],
  ['TouchableOpacity,\n', ''],
  ['import { Alert } from "react-native";\r\n', ''],
  ['import { Alert } from "react-native";\n', ''],
  ['const [newAreaCoords, setNewAreaCoords] = useState({\r\n    latitude: 29.0588, // Default Haryana region\r\n    longitude: 76.0856,\r\n    latitudeDelta: 0.0922,\r\n    longitudeDelta: 0.0421,\r\n  });\r\n', ''],
  ['const [newAreaCoords, setNewAreaCoords] = useState({\n    latitude: 29.0588, // Default Haryana region\n    longitude: 76.0856,\n    latitudeDelta: 0.0922,\n    longitudeDelta: 0.0421,\n  });\n', '']
]);

console.log("Done WatchAreaScreens");
