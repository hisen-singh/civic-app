const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, '..', 'screens', 'ProfileScreen.js');
let content = fs.readFileSync(profilePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// Add Dimensions import if missing
if (!content.includes('Dimensions')) {
  content = content.replace('import {', 'import {\n  Dimensions,');
}

// Find the start of the return statement in ProfileScreen
const returnMatch = content.match(/  return \(\n    <Animated\.ScrollView/);
if (!returnMatch) {
  console.error("Could not find start of return statement.");
  process.exit(1);
}
const returnStart = returnMatch.index;

// Ensure safe bounds
const beforeReturn = content.substring(0, returnStart);

const newRender = `  const { width } = Dimensions.get('window');
  // 3-column grid width calculation
  const gridItemSize = (Math.min(width, 800) - (Spacing.xl * 2) - (Spacing.sm * 2)) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarName}>{displayName}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons name="cog-outline" size={26} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentBrand}
            colors={[theme.colors.accentBrand]}
            progressBackgroundColor={theme.colors.background}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
          maxWidth: 800,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* Profile Info (Instagram Style) */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statBox} onPress={scrollToReports}>
              <Text style={styles.statNum}>{stats.reported}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.solved}</Text>
              <Text style={styles.statLabel}>Solved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.rank}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioName}>{displayName}</Text>
          <Text style={styles.bioDesc}>Member since {joinDate}</Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("EditProfile")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate("Analytics")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            setReportsY(layout.y);
          }}
          style={styles.tabContainer}
        >
          <TouchableOpacity 
            onPress={() => setActiveTab("reports")} 
            style={[styles.tabButton, activeTab === "reports" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons 
              name="grid" 
              size={24} 
              color={activeTab === "reports" ? theme.colors.textPrimary : theme.colors.textMuted} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab("saved")}
            style={[styles.tabButton, activeTab === "saved" && styles.tabButtonActive]}
          >
            <MaterialCommunityIcons 
              name="bookmark-outline" 
              size={24} 
              color={activeTab === "saved" ? theme.colors.textPrimary : theme.colors.textMuted} 
            />
          </TouchableOpacity>
        </View>

        {/* Grid Feed */}
        <View style={styles.gridContainer}>
          {activeTab === "reports" ? (
            myIssues.length === 0 ? (
              <View style={styles.emptyFeed}>
                <MaterialCommunityIcons name="image-off-outline" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyFeedText}>No posts yet</Text>
              </View>
            ) : (
              myIssues.map((issue) => (
                <TouchableOpacity 
                  key={issue.id} 
                  style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
                  onPress={() => navigation.navigate("IssueDetail", { id: issue.id, issue })}
                  activeOpacity={0.9}
                >
                  {issue.photo ? (
                    <Image source={{ uri: issue.photo }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridFallback}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )
          ) : (
            savedIssues.length === 0 ? (
              <View style={styles.emptyFeed}>
                <MaterialCommunityIcons name="bookmark-off-outline" size={32} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyFeedText}>No saved posts</Text>
              </View>
            ) : (
              savedIssues.map((issue) => (
                <TouchableOpacity 
                  key={\`saved-\${issue.id}\`} 
                  style={[styles.gridItem, { width: gridItemSize, height: gridItemSize }]}
                  onPress={() => navigation.navigate("IssueDetail", { id: issue.id, issue })}
                  activeOpacity={0.9}
                >
                  {issue.photo ? (
                    <Image source={{ uri: issue.photo }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridFallback}>
                      <MaterialCommunityIcons name="bookmark-outline" size={32} color={theme.colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )
          )}
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = {
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.md,
    backgroundColor: theme.colors.background,
  },
  topBarName: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileHeader: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: Spacing.xl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: theme.colors.surfaceSubtle,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statBox: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  bioName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  bioDesc: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.textPrimary,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  gridItem: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
  },
  emptyFeed: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyFeedText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
};
`;

const newContent = beforeReturn + newRender;

fs.writeFileSync(profilePath, newContent);
console.log("Successfully updated ProfileScreen.js");
