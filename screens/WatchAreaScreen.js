import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from "react-native";
import {
  Text,
  Card,
  Button,
  IconButton,
  Switch,
  ActivityIndicator,
  Snackbar,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { useAuth } from "../contexts/AuthContext";
import MapView, { Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { Spacing, theme } from "../theme";

export default function WatchAreaScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [watchAreas, setWatchAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [newAreaCoords, setNewAreaCoords] = useState({
    latitude: 29.0588,
    longitude: 76.0856,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [radius, setRadius] = useState(2000);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      fetchWatchAreas();
    }
  }, [user]);

  const fetchWatchAreas = async () => {
    try {
      const q = query(
        collection(db, "watchAreas"),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      const areas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWatchAreas(areas);
    } catch (error) {
      console.error("Error fetching watch areas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArea = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "watchAreas"), {
        userId: user.uid,
        latitude: newAreaCoords.latitude,
        longitude: newAreaCoords.longitude,
        radius: radius,
        active: true,
        createdAt: new Date().toISOString(),
      });
      setIsCreating(false);
      setSnackbarMsg("Watch area saved successfully");
      setSnackbarVisible(true);
      fetchWatchAreas();
    } catch (error) {
      console.error("Error saving area:", error);
      setLoading(false);
    }
  };

  const handleDeleteArea = async (id) => {
    Alert.alert(
      "Remove Watch Area",
      "You'll stop receiving alerts for this area.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "watchAreas", id));
              setSnackbarMsg("Watch area removed");
              setSnackbarVisible(true);
              setWatchAreas((prev) => prev.filter((a) => a.id !== id));
            } catch (error) {
              console.error("Error deleting area:", error);
            }
          },
        },
      ],
    );
  };

  const toggleAreaStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setWatchAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: newStatus } : a)),
    );
    try {
      await updateDoc(doc(db, "watchAreas", id), { active: newStatus });
    } catch (error) {
      console.error("Error toggling watch area:", error);
      setWatchAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: currentStatus } : a)),
      );
    }
  };

  if (loading && !isCreating) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.accentBrand} />
      </View>
    );
  }

  if (isCreating) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            iconColor={theme.colors.textPrimary}
            size={24}
            onPress={() => setIsCreating(false)}
          />
          <Text style={styles.headerTitle}>SET WATCH AREA</Text>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.helperText}>
          Drag the map to position the center of your alert zone.
        </Text>

        <View style={styles.mapContainer}>
          {Platform.OS === "web" ? (
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={48}
                color={theme.colors.textMuted}
              />
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  marginTop: 12,
                  fontWeight: "700",
                }}
              >
                Map preview not available on web.
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  marginTop: 4,
                  fontSize: 12,
                }}
              >
                Area will be saved to default coordinates.
              </Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={newAreaCoords}
              onRegionChangeComplete={(region) => setNewAreaCoords(region)}
            >
              <Circle
                center={newAreaCoords}
                radius={radius}
                strokeWidth={2}
                strokeColor={theme.colors.accentBrand}
                fillColor="rgba(255, 69, 0, 0.15)"
              />
            </MapView>
          )}
          <View style={styles.mapCenterMarker}>
            <View style={styles.crosshairOuter}>
              <View style={styles.crosshairInner} />
            </View>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <Text style={styles.label}>Alert Radius</Text>
          <Text style={styles.radiusValue}>
            {(radius / 1000).toFixed(1)} km
          </Text>
          <View style={styles.radiusButtons}>
            {[1000, 2000, 5000, 10000].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRadius(r)}
                activeOpacity={0.7}
                style={[
                  styles.radiusChip,
                  radius === r && styles.radiusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    radius === r && styles.radiusChipTextActive,
                  ]}
                >
                  {r / 1000} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSaveArea}
            activeOpacity={0.8}
            style={styles.confirmBtn}
          >
            <MaterialCommunityIcons
              name="check"
              size={20}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.confirmBtnText}>CONFIRM AREA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          iconColor={theme.colors.textPrimary}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>WATCH AREAS</Text>
        <View style={{ width: 48 }} />
      </View>

      <Animated.ScrollView
        style={[styles.listContainer, { opacity: fadeAnim }]}
      >
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={20}
            color={theme.colors.accentBrand}
            style={{ marginRight: 12 }}
          />
          <Text style={styles.description}>
            GET NOTIFIED WHEN CRITICAL ISSUES ARE REPORTED IN YOUR TRACKED
            NEIGHBORHOODS.
          </Text>
        </View>

        {watchAreas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons
                name="map-marker-plus-outline"
                size={40}
                color={theme.colors.accentBrand}
              />
            </View>
            <Text style={styles.emptyTitle}>NO WATCH AREAS YET</Text>
            <Text style={styles.emptyDesc}>
              ADD YOUR HOME, OFFICE, OR ANY NEIGHBORHOOD YOU WANT TO KEEP AN EYE
              ON.
            </Text>
          </View>
        ) : (
          watchAreas.map((area, index) => (
            <Animated.View
              key={area.id}
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <View
                style={[
                  styles.areaCard,
                  !area.active && styles.areaCardInactive,
                ]}
              >
                <View style={styles.areaContent}>
                  <View style={styles.areaIconWrap}>
                    <MaterialCommunityIcons
                      name="map-marker-radius"
                      size={22}
                      color={
                        area.active
                          ? theme.colors.accentBrand
                          : theme.colors.textMuted
                      }
                    />
                  </View>
                  <View style={styles.areaInfo}>
                    <Text style={styles.areaTitle}>TRACKED AREA</Text>
                    <Text style={styles.areaSub}>
                      {(area.radius / 1000).toFixed(1)} KM RADIUS ·{" "}
                      {area.latitude.toFixed(3)}°, {area.longitude.toFixed(3)}°
                    </Text>
                  </View>
                  <View style={styles.areaActions}>
                    <Switch
                      value={area.active}
                      onValueChange={() =>
                        toggleAreaStatus(area.id, area.active)
                      }
                      color={theme.colors.accentBrand}
                      style={{
                        transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteArea(area.id)}
                      activeOpacity={0.6}
                      style={styles.deleteBtn}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={theme.colors.accentBrand}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))
        )}

        <TouchableOpacity
          onPress={() => setIsCreating(true)}
          activeOpacity={0.7}
          style={styles.addBtn}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={theme.colors.accentBrand}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.addBtnText}>ADD WATCH AREA</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 0,
          borderWidth: 2,
          borderColor: theme.colors.border,
        }}
      >
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontWeight: "700",
            textTransform: "uppercase",
          }}
        >
          {snackbarMsg}
        </Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: Spacing.lg,
    borderRadius: 0,
    marginBottom: Spacing.xxl,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
  },
  description: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    marginBottom: Spacing.xxl,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  addBtnText: {
    color: theme.colors.accentBrand,
    fontSize: 15,
    fontWeight: "900",
  },
  areaCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: Spacing.md,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  areaCardInactive: {
    opacity: 0.6,
  },
  areaContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  areaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  areaInfo: {
    flex: 1,
  },
  areaTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  areaSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  areaActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    borderRadius: 0,
    overflow: "hidden",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  map: {
    flex: 1,
  },
  mapCenterMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -16,
    marginTop: -16,
  },
  crosshairOuter: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  crosshairInner: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: theme.colors.accentBrand,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    padding: Spacing.lg,
    textTransform: "uppercase",
  },
  controlsContainer: {
    padding: Spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 2,
    borderColor: theme.colors.border,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  radiusValue: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: Spacing.lg,
  },
  radiusButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xxl,
  },
  radiusChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  radiusChipActive: {
    borderColor: theme.colors.accentBrand,
    backgroundColor: theme.colors.accentBrand,
  },
  radiusChipText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  radiusChipTextActive: {
    color: "#FFF",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 0,
    backgroundColor: theme.colors.accentBrand,
  },
  confirmBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
