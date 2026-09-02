const fs = require('fs');

function fixFile(file, replacements) {
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

// IssueCard.js: restore `e` where it's used
let ic = fs.readFileSync('components/IssueCard.js', 'utf8');
ic = ic.replace(/\} catch \{\r?\n      console\.error\("Failed to upvote:", e\);/g, '} catch (e) {\n      console.error("Failed to upvote:", e);');
ic = ic.replace(/\} catch \{\r?\n      console\.error\("Failed to join issue:", e\);/g, '} catch (e) {\n      console.error("Failed to join issue:", e);');
ic = ic.replace(/\} catch \{\r?\n      console\.error\("Failed to update status:", e\);/g, '} catch (e) {\n      console.error("Failed to update status:", e);');

// Remove setIsDeleted
ic = ic.replace(/const \[isDeleted, setIsDeleted\] = useState\(false\);\r?\n/, '');
ic = ic.replace(/if \(isDeleted\) return null;\r?\n/, '');

fs.writeFileSync('components/IssueCard.js', ic);

// AchievementService.js
fixFile('services/AchievementService.js', [
  [/const earnedIds = userDocs\.map\(\(doc\) => doc\.data\(\)\.achievementId\);\r?\n/, '']
]);

// SyncService.js
fixFile('services/SyncService.js', [
  [/const \{ _queuedAt, \.\.\.cleanPayload \} = payload;/, 'const { _queuedAt: _ignore, ...cleanPayload } = payload;']
]);

console.log("Done");
