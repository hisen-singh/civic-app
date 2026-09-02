const fs = require('fs');

let content = fs.readFileSync('screens/ProfileScreen.js', 'utf8');

const oldReturn = `  return (
    <Animated.ScrollView`;

const newReturn = `  return (
    <View style={{ flex: 1 }}>
      {/* Back button for stack presentation */}
      {isStackProfile && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: Spacing.lg,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      )}
      <Animated.ScrollView`;

content = content.replace(oldReturn, newReturn);

const deleteBlock = `      {/* Back button for stack presentation */}
      {isStackProfile && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: Spacing.lg,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      )}
`;

content = content.replace(deleteBlock, '');

// The end of the file is:
//     </Animated.ScrollView>
//   );
// }
const oldEnd = `    </Animated.ScrollView>
  );
}`;

const newEnd = `    </Animated.ScrollView>
    </View>
  );
}`;

content = content.replace(oldEnd, newEnd);

fs.writeFileSync('screens/ProfileScreen.js', content);
console.log('Fixed ProfileScreen.js');
