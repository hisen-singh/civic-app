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

// IssueCard.js: restore handleDelete and fix the broken syntax.
let ic = fs.readFileSync('components/IssueCard.js', 'utf8');
const badBlock = `    Alert.alert(
      "Delete Report",
      "This action cannot be undone. The report will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await IssueService.deleteIssue(issue.id);
              setIsDeleted(true);
            } catch (e) {
              console.error("Failed to delete issue:", e);
              Alert.alert("Error", "Could not delete issue. Please try again.");
            }
          },
        },
      ],
    );
  };`;

ic = ic.replace(badBlock, '');
fs.writeFileSync('components/IssueCard.js', ic);

// CommentBottomSheet.js: import Alert
fixFile('components/CommentBottomSheet.js', [
  ['import {\n  View,\n  TextInput,\n  TouchableOpacity,\n  StyleSheet,\n  KeyboardAvoidingView,\n  Platform,\n  FlatList,\n} from "react-native";', 'import {\n  View,\n  TextInput,\n  TouchableOpacity,\n  StyleSheet,\n  KeyboardAvoidingView,\n  Platform,\n  FlatList,\n  Alert,\n} from "react-native";']
]);

console.log("Done");
