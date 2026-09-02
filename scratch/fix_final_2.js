const fs = require('fs');

function fixFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (const [old, newStr] of replacements) {
    content = content.replace(old, newStr);
  }
  fs.writeFileSync(file, content);
}

// SolveScreen.js: React, Shadows, name, isJoined
fixFile('screens/SolveScreen.js', [
  ['import React, { useState, useCallback, useRef, useEffect } from "react";', 'import { useState, useCallback, useRef, useEffect } from "react";'],
  ['import { Colors, Spacing, Radius, Shadows, Typography, Gradients } from "../theme";', 'import { Colors, Spacing, Radius, Typography, Gradients } from "../theme";'],
  ['      const uid = user?.uid;\r\n      const name = user?.displayName;\r\n', '      const uid = user?.uid;\r\n'],
  ['      const uid = user?.uid;\n      const name = user?.displayName;\n', '      const uid = user?.uid;\n'],
  ['    const isJoined = user ? (item.solvers || []).includes(user.uid) : false;\r\n', ''],
  ['    const isJoined = user ? (item.solvers || []).includes(user.uid) : false;\n', '']
]);

console.log("Done");
