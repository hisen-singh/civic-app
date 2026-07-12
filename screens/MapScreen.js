import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { IssueService } from '../services/IssueService';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Spacing, Radius, Shadows } from '../theme';

const { width, height } = Dimensions.get('window');

// Dark map theme matching our design system
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#131925" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0A0E1A" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#CBD5E1" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#0A0E1A" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1A2133" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#0A0E1A" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0A0E1A" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#0A0E1A" }] }
];

export default function MapScreen({ navigation }) {
    const { user } = useAuth();
    const mapRef = useRef(null);
    const [issues, setIssues] = useState([]);
    const [location, setLocation] = useState(null);

    const [locationLoaded, setLocationLoaded] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const fetchIssues = async () => {
                try {
                    const allIssues = await IssueService.getAllIssues();
                    
                    // Use user's location or fallback
                    const baseLat = location ? location.latitude : 28.4595;
                    const baseLng = location ? location.longitude : 77.0266;
                    
                    const mapIssues = allIssues.map((issue) => {
                        if (!issue.latitude || !issue.longitude) {
                            // Stable pseudo-random offset based on issue ID
                            let hash = 0;
                            for (let i = 0; i < issue.id.length; i++) {
                                hash = issue.id.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const pseudoRandom1 = (Math.abs(hash) % 100) / 100;
                            const pseudoRandom2 = (Math.abs(hash >> 8) % 100) / 100;
                            
                            return {
                                ...issue,
                                latitude: baseLat + (pseudoRandom1 - 0.5) * 0.04,
                                longitude: baseLng + (pseudoRandom2 - 0.5) * 0.04,
                            };
                        }
                        return issue;
                    });
                    
                    setIssues(mapIssues);
                } catch (error) {
                    console.error('[MapScreen] Error fetching issues:', error);
                }
            };
            fetchIssues();
        }, [locationLoaded, location]) // Added location to dependencies
    );

    useEffect(() => {
        let isMounted = true;

        const getLocation = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (isMounted) {
                        setLocation({ latitude: 28.4595, longitude: 77.0266 });
                        setLocationLoaded(true);
                    }
                    return;
                }
                
                // Try cached location first (fast), then fall back to live location with timeout
                let loc = null;
                try {
                    loc = await Location.getLastKnownPositionAsync({});
                } catch (e) {
                    console.warn('[MapScreen] getLastKnownPosition failed:', e);
                }

                if (!loc) {
                    try {
                        // Add a timeout so the app doesn't hang forever
                        const locationPromise = Location.getCurrentPositionAsync({ 
                            accuracy: Location.Accuracy.Balanced 
                        });
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Location timeout')), 10000)
                        );
                        loc = await Promise.race([locationPromise, timeoutPromise]);
                    } catch (e) {
                        console.warn('[MapScreen] getCurrentPosition failed/timed out:', e);
                    }
                }
                
                if (isMounted && loc) {
                    setLocation(loc.coords);
                    mapRef.current?.animateToRegion({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                } else if (isMounted) {
                    // Fallback if location couldn't be determined
                    setLocation({ latitude: 28.4595, longitude: 77.0266 });
                }
            } catch (error) {
                console.error('[MapScreen] Location error:', error);
                if (isMounted) {
                    setLocation({ latitude: 28.4595, longitude: 77.0266 });
                }
            } finally {
                if (isMounted) {
                    setLocationLoaded(true);
                }
            }
        };

        getLocation();

        return () => { isMounted = false; };
    }, []);

    const getCategoryIcon = (cat) => {
        const icons = { 
            'Pothole': 'road-variant', 'Graffiti': 'spray', 'Litter': 'trash-can-outline', 
            'Lighting': 'lightbulb-outline', 'Safety': 'shield-alert-outline', 
            'Environment': 'tree-outline', 'Roads': 'road-variant', 'Infrastructure': 'office-building-outline',
            'Sanitation': 'broom', 'Water Supply': 'water-outline', 'Sewage': 'pipe-leak',
            'Women Safety': 'shield-alert-outline',
        };
        return icons[cat] || 'map-marker';
    };

    // Filter out issues with invalid coordinates to prevent crashes
    const validIssues = issues.filter(issue => 
        issue.latitude != null && issue.longitude != null && 
        !isNaN(issue.latitude) && !isNaN(issue.longitude)
    );

    // Show loading while location is being determined
    if (!locationLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="map-search-outline" size={48} color={Colors.textTertiary} style={{ marginBottom: 16 }} />
                <Text style={{ color: Colors.textSecondary, fontSize: 15, fontWeight: '600' }}>Loading Map...</Text>
                <Text style={{ color: Colors.textTertiary, fontSize: 12, marginTop: 4 }}>Detecting your location</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={darkMapStyle}
                showsUserLocation={true}
                initialRegion={{
                    latitude: location ? location.latitude : 28.4595,
                    longitude: location ? location.longitude : 77.0266,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {validIssues.map((issue) => (
                    <Marker
                        key={issue.id}
                        coordinate={{ latitude: Number(issue.latitude), longitude: Number(issue.longitude) }}
                        onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                        tracksViewChanges={false}
                    >
                        <View style={styles.markerContainer}>
                            <View style={[
                                styles.bubble, 
                                { borderColor: issue.status === 'Solved' ? Colors.success : Colors.accent }
                            ]}>
                                <MaterialCommunityIcons 
                                    name={getCategoryIcon(issue.category)} 
                                    size={20} 
                                    color={issue.status === 'Solved' ? Colors.success : Colors.textPrimary} 
                                />
                            </View>
                            <View style={[
                                styles.triangle, 
                                { borderTopColor: issue.status === 'Solved' ? Colors.success : Colors.accent }
                            ]} />
                        </View>
                    </Marker>
                ))}
                
                {/* Heatmap zones */}
                {validIssues.map((issue) => (
                    <Circle
                        key={`zone-${issue.id}`}
                        center={{ latitude: Number(issue.latitude), longitude: Number(issue.longitude) }}
                        radius={500}
                        fillColor={issue.status === 'Solved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}
                        strokeWidth={0}
                    />
                ))}
            </MapView>

            {/* Top Gradient Overlay */}
            <LinearGradient
                colors={Gradients.mapOverlay}
                style={styles.headerOverlay}
                pointerEvents="none"
            >
                <Text style={styles.headerTitle}>Issue Map</Text>
                <Text style={styles.headerSub}>Tap a marker to view details</Text>
            </LinearGradient>

            {/* Issue count badge */}
            <View style={styles.countBadge}>
                <MaterialCommunityIcons name="map-marker-multiple" size={16} color={Colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.countText}>{issues.length} issues</Text>
            </View>
            
            {/* Recenter Button */}
            <TouchableOpacity 
                style={styles.recenterBtn}
                activeOpacity={0.8}
                onPress={() => {
                    if (location && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                    }
                }}
            >
                <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    map: {
        width: width,
        height: height,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.headerTop + 4,
        paddingBottom: 60,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    countBadge: {
        position: 'absolute',
        top: Spacing.headerTop + 60,
        left: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    countText: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 60,
    },
    bubble: {
        width: 42,
        height: 42,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.subtle,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 0,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
    recenterBtn: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.subtle,
    },
});
