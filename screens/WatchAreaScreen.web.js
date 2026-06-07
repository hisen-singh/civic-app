import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, IconButton, Switch, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (isCreating) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" iconColor="#F8FAFC" size={24} onPress={() => setIsCreating(false)} />
                    <Text style={styles.headerTitle}>Set Watch Area</Text>
                    <View style={{ width: 48 }} />
                </View>
                
                <Text style={styles.helperText}>Map selection not supported on web mockup.</Text>

                <View style={styles.mapContainer}>
                    <View style={{ flex: 1, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8' }}>Interactive Map requires Native App.</Text>
                        <Text style={{ color: '#94A3B8', marginTop: 8 }}>Will save to default location.</Text>
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
                                buttonColor={radius === r ? "#3B82F6" : undefined}
                                textColor={radius === r ? "#FFF" : "#94A3B8"}
                                style={styles.radiusBtn}
                            >
                                {r/1000}km
                            </Button>
                        ))}
                    </View>

                    <Button 
                        mode="contained" 
                        onPress={handleSaveArea}
                        buttonColor="#10B981"
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
                <IconButton icon="arrow-left" iconColor="#F8FAFC" size={24} onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>My Watch Areas</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView style={styles.listContainer}>
                <Text style={styles.description}>
                    Receive alerts when critical issues are reported in your tracked neighborhoods.
                </Text>

                {watchAreas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>📍</Text>
                        <Text style={styles.emptyTitle}>No Watch Areas</Text>
                        <Text style={styles.emptyDesc}>Set up areas like "Home" or "Office" to stay informed about local issues.</Text>
                    </View>
                ) : (
                    watchAreas.map((area) => (
                        <Card key={area.id} style={styles.areaCard}>
                            <Card.Content style={styles.areaContent}>
                                <View style={styles.areaInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <MaterialCommunityIcons name="map-marker-radius" size={20} color="#818CF8" />
                                        <Text style={styles.areaTitle}> Tracked Area</Text>
                                    </View>
                                    <Text style={styles.areaSub}>Radius: {(area.radius / 1000).toFixed(1)} km</Text>
                                    <Text style={styles.areaSub}>Lat: {area.latitude.toFixed(3)}, Lng: {area.longitude.toFixed(3)}</Text>
                                </View>
                                <View style={styles.areaActions}>
                                    <Switch 
                                        value={area.active} 
                                        onValueChange={() => toggleAreaStatus(area.id, area.active)} 
                                        color="#10B981"
                                    />
                                    <IconButton 
                                        icon="trash-can-outline" 
                                        iconColor="#EF4444" 
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
                    buttonColor="#3B82F6"
                    style={styles.addBtn}
                >
                    Add Watch Area
                </Button>
            </ScrollView>
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                style={{ backgroundColor: '#1E293B' }}
            >
                {snackbarMsg}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 8,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    listContainer: {
        flex: 1,
        padding: 16,
    },
    description: {
        color: '#94A3B8',
        fontSize: 14,
        marginBottom: 24,
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    addBtn: {
        borderRadius: 12,
        paddingVertical: 6,
        marginTop: 8,
    },
    areaCard: {
        backgroundColor: '#1E293B',
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
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
        color: '#F8FAFC',
    },
    areaSub: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    areaActions: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    helperText: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        padding: 16,
    },
    controlsContainer: {
        padding: 24,
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    label: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    radiusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    radiusBtn: {
        borderRadius: 20,
    },
    saveBtn: {
        borderRadius: 12,
        paddingVertical: 8,
    }
});
