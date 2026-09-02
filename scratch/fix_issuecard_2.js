const fs = require('fs');

let content = fs.readFileSync('components/IssueCard.js', 'utf8');

content = content.replace('import React, { useState, useRef } from "react";\n', 'import { useState, useRef } from "react";\n');
content = content.replace('import React, { useState, useRef } from "react";\r\n', 'import { useState, useRef } from "react";\n');

content = content.replace(/const \[menuVisible, setMenuVisible\] = useState\(false\);\r?\n/, '');
content = content.replace(/const openMenu = \(\) => setMenuVisible\(true\);\r?\n/, '');
content = content.replace(/const closeMenu = \(\) => setMenuVisible\(false\);\r?\n/, '');
content = content.replace(/\} catch \(e\) \{/g, '} catch {');

// Remove handleDelete block completely
const deleteBlockRegex = /  const handleDelete = \(\) => \{[\s\S]*?\};/;
content = content.replace(deleteBlockRegex, '');

fs.writeFileSync('components/IssueCard.js', content);

console.log("Fixed IssueCard.js");
