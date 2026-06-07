import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Animated } from 'react-native';
import { Text, Card, Button, IconButton, Switch, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import MapView, { Circle } from 'react-native-maps';
import { Colors, Radius, Spacing } from '../theme';

export default function WatchAreaScreen() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [watchAreas, setWatchAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // Create Mode State
    const [newAreaCoords, setNewAreaCoords] = useState({
        latitude: 29.0588, // Default Haryana region
        longitude: 76.0856,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [radius, setRadius] = useState(2000); // 2km default
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (user?.uid) {
            fetchWatchAreas();
        }
    }, [user]);

    const fetchWatchAreas = async () => {
        try {
            const q = query(collection(db, 'watchAreas'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const areas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
            await addDoc(collection(db, 'watchAreas'), {
                userId: user.uid,
                latitude: newAreaCoords.latitude,
                longitude: newAreaCoords.longitude,
                radius: radius,
                active: true,
                createdAt: new Date().toISOString()
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
                            await deleteDoc(doc(db, 'watchAreas', id));
                            setSnackbarMsg("Watch area removed");
                            setSnackbarVisible(true);
                            setWatchAreas(prev => prev.filter(a => a.id !== id));
                        } catch (error) {
                            console.error("Error deleting area:", error);
                        }
                    }
                }
            ]
        );
    };

    const toggleAreaStatus = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        setWatchAreas(prev => prev.map(a => a.id === id ? { ...a, active: newStatus } : a));
        try {
            await updateDoc(doc(db, 'watchAreas', id), { active: newStatus });
        } catch (error) {
            console.error('Error toggling watch area:', error);
            setWatchAreas(prev => prev.map(a => a.id === id ? { ...a, active: currentStatus } : a));
        }
    };

    if (loading && !isCreating) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.accent} />
            </View>
        );
    }

    if (isCreating) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" iconColor={Colors.textPrimary} size={24} onPress={() => setIsCreating(false)} />
                    <Text style={styles.headerTitle}>Set Watch Area</Text>
                    <View style={{ width: 48 }} />
                </View>
                
                <Text style={styles.helperText}>Drag the map to position the center of your alert zone.</Text>

                <View style={styles.mapContainer}>
                    {Platform.OS === 'web' ? (
                        <View style={{ flex: 1, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={48} color={Colors.textTertiary} />
                            <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Map preview not available on web.</Text>
                            <Text style={{ color: Colors.textTertiary, marginTop: 4, fontSize: 12 }}>Area will be saved to default coordinates.</Text>
                        </View>
                    ) : (
                        <MapView 
                            style={styles.map}
                            initialRegion={newAreaCoords}
                            onRegionChangeComplete={(region) => setNewAreaCoords(region)}
                        >
                            <Circle
                                center={newAreaCoords}
                                radius={radius}
                                strokeWidth={2}
                                strokeColor={Colors.accent}
                                fillColor="rgba(99, 102, 241, 0.15)"
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
                    <Text style={styles.radiusValue}>{(radius / 1000).toFixed(1)} km</Text>
                    <View style={styles.radiusButtons}>
                        {[1000, 2000, 5000, 10000].map((r) => (
                            <TouchableOpacity 
                                key={r}
                                onPress={() => setRadius(r)}
                                activeOpacity={0.7}
                                style={[
                                    styles.radiusChip,
                                    radius === r && styles.radiusChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.radiusChipText,
                                    radius === r && styles.radiusChipTextActive
                                ]}>{r/1000} km</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleSaveArea}
                        activeOpacity={0.8}
                        style={styles.confirmBtn}
                    >
                        <MaterialCommunityIcons name="check" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmBtnText}>Confirm Area</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor={Colors.textPrimary} size={24} onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Watch Areas</Text>
                <View style={{ width: 48 }} />
            </View>

            <Animated.ScrollView style={[styles.listContainer, { opacity: fadeAnim }]}>
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={20} color={Colors.accent} style={{ marginRight: 12 }} />
                    <Text style={styles.description}>
                        Get notified when critical issues are reported in your tracked neighborhoods.
                    </Text>
                </View>

                {watchAreas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <MaterialCommunityIcons name="map-marker-plus-outline" size={40} color={Colors.accent} />
                        </View>
                        <Text style={styles.emptyTitle}>No Watch Areas Yet</Text>
                        <Text style={styles.emptyDesc}>Add your home, office, or any neighborhood you want to keep an eye on.</Text>
                    </View>
                ) : (
                    watchAreas.map((area, index) => (
                        <Animated.View 
                            key={area.id}
                            style={{ 
                                opacity: fadeAnim,
                                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                            }}
                        >
                            <View style={[styles.areaCard, !area.active && styles.areaCardInactive]}>
                                <View style={styles.areaContent}>
                                    <View style={styles.areaIconWrap}>
                                        <MaterialCommunityIcons 
                                            name="map-marker-radius" 
                                            size={22} 
                                            color={area.active ? Colors.accent : Colors.textTertiary} 
                                        />
                                    </View>
                                    <View style={styles.areaInfo}>
                                        <Text style={styles.areaTitle}>Tracked Area</Text>
                                        <Text style={styles.areaSub}>
                                            {(area.radius / 1000).toFixed(1)} km radius · {area.latitude.toFixed(3)}°, {area.longitude.toFixed(3)}°
                                        </Text>
                                    </View>
                                    <View style={styles.areaActions}>
                                        <Switch 
                                            value={area.active} 
                                            onValueChange={() => toggleAreaStatus(area.id, area.active)} 
                                            color={Colors.success}
                                            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                                        />
                                        <TouchableOpacity 
                                            onPress={() => handleDeleteArea(area.id)}
                                            activeOpacity={0.6}
                                            style={styles.deleteBtn}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.error} />
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
                    <MaterialCommunityIcons name="plus" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
                    <Text style={styles.addBtnText}>Add Watch Area</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </Animated.ScrollView>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                style={{ backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md }}
            >
                <Text style={{ color: Colors.textPrimary }}>{snackbarMsg}</Text>
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.headerTop,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    listContainer: {
        flex: 1,
        padding: Spacing.lg,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.accentSurface,
        padding: Spacing.lg,
        borderRadius: Radius.md,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
    },
    description: {
        color: Colors.textSecondary,
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptyDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        borderColor: Colors.accent,
        borderStyle: 'dashed',
        marginTop: Spacing.sm,
    },
    addBtnText: {
        color: Colors.accent,
        fontSize: 15,
        fontWeight: '600',
    },
    areaCard: {
        backgroundColor: Colors.surface,
        marginBottom: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    areaCardInactive: {
        opacity: 0.6,
    },
    areaContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    areaIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    areaInfo: {
        flex: 1,
    },
    areaTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    areaSub: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    areaActions: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 4,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        borderRadius: Radius.lg,
        overflow: 'hidden',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    map: {
        flex: 1,
    },
    mapCenterMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -16,
        marginTop: -16,
    },
    crosshairOuter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    crosshairInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.accent,
    },
    helperText: {
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        padding: Spacing.lg,
    },
    controlsContainer: {
        padding: Spacing.xxl,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    radiusValue: {
        color: Colors.textPrimary,
        fontSize: 28,
        fontWeight: '800',
        marginBottom: Spacing.lg,
    },
    radiusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xxl,
    },
    radiusChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceElevated,
    },
    radiusChipActive: {
        borderColor: Colors.accent,
        backgroundColor: Colors.accentSurface,
    },
    radiusChipText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    radiusChipTextActive: {
        color: Colors.accent,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: Radius.md,
        backgroundColor: Colors.success,
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
