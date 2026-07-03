import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, IconButton, Switch, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
            setSnackbarMsg("Watch Area successfully added!");
            setSnackbarVisible(true);
            fetchWatchAreas();
        } catch (error) {
            console.error("Error saving area:", error);
            setLoading(false);
        }
    };

    const handleDeleteArea = async (id) => {
        try {
            await deleteDoc(doc(db, 'watchAreas', id));
            setSnackbarMsg("Watch Area removed.");
            setSnackbarVisible(true);
            setWatchAreas(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting area:", error);
        }
    };

    const toggleAreaStatus = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        // Optimistic update
        setWatchAreas(prev => prev.map(a => a.id === id ? { ...a, active: newStatus } : a));
        try {
            await updateDoc(doc(db, 'watchAreas', id), { active: newStatus });
        } catch (error) {
            console.error('Error toggling watch area:', error);
            // Revert on failure
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
                
                <Text style={styles.helperText}>Map selection not supported on web mockup.</Text>

                <View style={styles.mapContainer}>
                    <View style={{ flex: 1, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary }}>Interactive Map requires Native App.</Text>
                        <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>Will save to default location.</Text>
                    </View>
                </View>

                <View style={styles.controlsContainer}>
                    <Text style={styles.label}>Alert Radius: {(radius / 1000).toFixed(1)} km</Text>
                    <View style={styles.radiusButtons}>
                        {[1000, 2000, 5000, 10000].map((r) => (
                            <Button 
                                key={r}
                                mode={radius === r ? "contained" : "outlined"}
                                onPress={() => setRadius(r)}
                                buttonColor={radius === r ? Colors.accent : undefined}
                                textColor={radius === r ? "#FFF" : Colors.textSecondary}
                                style={styles.radiusBtn}
                            >
                                {r/1000}km
                            </Button>
                        ))}
                    </View>

                    <Button 
                        mode="contained" 
                        onPress={handleSaveArea}
                        buttonColor={Colors.success}
                        style={styles.saveBtn}
                        labelStyle={{ fontSize: 16, fontWeight: '700' }}
                    >
                        Confirm Area
                    </Button>
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

            <ScrollView style={styles.listContainer}>
                <Text style={styles.description}>
                    Receive alerts when critical issues are reported in your tracked neighborhoods.
                </Text>

                {watchAreas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: Spacing.lg }}>📍</Text>
                        <Text style={styles.emptyTitle}>No Watch Areas</Text>
                        <Text style={styles.emptyDesc}>Set up areas like "Home" or "Office" to stay informed about local issues.</Text>
                    </View>
                ) : (
                    watchAreas.map((area) => (
                        <Card key={area.id} style={styles.areaCard}>
                            <Card.Content style={styles.areaContent}>
                                <View style={styles.areaInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <MaterialCommunityIcons name="map-marker-radius" size={20} color={Colors.accentLight} />
                                        <Text style={styles.areaTitle}> Tracked Area</Text>
                                    </View>
                                    <Text style={styles.areaSub}>Radius: {(area.radius / 1000).toFixed(1)} km</Text>
                                    <Text style={styles.areaSub}>Lat: {area.latitude.toFixed(3)}, Lng: {area.longitude.toFixed(3)}</Text>
                                </View>
                                <View style={styles.areaActions}>
                                    <Switch 
                                        value={area.active} 
                                        onValueChange={() => toggleAreaStatus(area.id, area.active)} 
                                        color={Colors.success}
                                    />
                                    <IconButton 
                                        icon="trash-can-outline" 
                                        iconColor={Colors.error} 
                                        size={20} 
                                        onPress={() => handleDeleteArea(area.id)} 
                                    />
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}

                <Button 
                    mode="contained" 
                    icon="plus" 
                    onPress={() => setIsCreating(true)}
                    buttonColor={Colors.accent}
                    style={styles.addBtn}
                >
                    Add Watch Area
                </Button>
            </ScrollView>
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
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    listContainer: {
        flex: 1,
        padding: Spacing.lg,
    },
    description: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: Spacing.xxl,
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
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
        paddingHorizontal: 32,
    },
    addBtn: {
        borderRadius: Radius.md,
        paddingVertical: 6,
        marginTop: Spacing.sm,
    },
    areaCard: {
        backgroundColor: Colors.surface,
        marginBottom: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    areaContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    areaInfo: {
        flex: 1,
    },
    areaTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    areaSub: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    areaActions: {
        alignItems: 'center',
        flexDirection: 'row',
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
    },
    label: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: Spacing.md,
    },
    radiusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xxl,
    },
    radiusBtn: {
        borderRadius: Radius.xl,
    },
    saveBtn: {
        borderRadius: Radius.md,
        paddingVertical: 8,
    },
});
