import React, { useState, useRef } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IssueService } from '../services/IssueService';
import { SyncService } from '../services/SyncService';
import { useAuth } from '../contexts/AuthContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { CATEGORIES, CATEGORY_GROUPS, getCategoriesByGroup } from '../data/categories';
import { Colors, Gradients, Radius, Spacing, Shadows } from '../theme';
import { detectUrgency, URGENCY_LEVELS } from '../utils/urgencyDetector';

export default function ReportIssueScreen({ navigation }) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [category, setCategory] = useState('Pothole');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [locationStr, setLocationStr] = useState('');
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [coords, setCoords] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [urgency, setUrgency] = useState('medium');
    const [autoDetected, setAutoDetected] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const submitScale = useRef(new Animated.Value(1)).current;
    const [expandedGroup, setExpandedGroup] = useState('infrastructure');

    // Auto-detect urgency from title + description
    React.useEffect(() => {
        if (title.length >= 3 || description.length >= 5) {
            const result = detectUrgency(title, description);
            setAutoDetected(result);
            if (result.confidence !== 'low') {
                setUrgency(result.urgency);
            }
        } else {
            setAutoDetected(null);
        }
    }, [title, description]);

    React.useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });
        if (!result.canceled) {
            setPhoto(result.assets[0]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });
        if (!result.canceled) {
            setPhoto(result.assets[0]);
        }
    };

    const fetchLocation = async () => {
        setIsFetchingLocation(true);
        setLocationStr('Detecting...');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationStr('');
                Alert.alert('Permission Required', 'Location access is needed to tag your report.');
                setIsFetchingLocation(false);
                return;
            }
            
            // Try cached location first (fast)
            let location = null;
            try {
                location = await Location.getLastKnownPositionAsync({});
            } catch (e) {
                console.warn('[ReportIssue] getLastKnownPosition failed:', e);
            }

            if (!location) {
                try {
                    // Timeout after 10s to prevent app freeze
                    const locationPromise = Location.getCurrentPositionAsync({ 
                        accuracy: Location.Accuracy.Balanced 
                    });
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Location timeout')), 10000)
                    );
                    location = await Promise.race([locationPromise, timeoutPromise]);
                } catch (e) {
                    console.warn('[ReportIssue] getCurrentPosition failed/timed out:', e);
                    setLocationStr('');
                    Alert.alert('Location Unavailable', 'Could not detect your location. You can type it manually.');
                    setIsFetchingLocation(false);
                    return;
                }
            }

            if (!location) {
                setLocationStr('');
                Alert.alert('Location Unavailable', 'Could not detect your location. You can type it manually.');
                setIsFetchingLocation(false);
                return;
            }
            
            setCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            try {
                const [address] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (address) {
                    const parts = [
                        address.street || address.name,
                        address.city || address.district || address.subregion,
                        address.region
                    ].filter(Boolean);
                    
                    const uniqueParts = [...new Set(parts)];
                    setLocationStr(uniqueParts.length > 0 ? uniqueParts.join(', ') : 'Location detected');
                } else {
                    setLocationStr(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
                }
            } catch (geocodeError) {
                console.warn('[ReportIssue] Reverse geocode failed:', geocodeError);
                // Still have coordinates, just show them directly
                setLocationStr(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
            }
        } catch (error) {
            console.error("[ReportIssue] Location error:", error);
            setLocationStr('');
            Alert.alert('Error', 'Unable to fetch location. You can type it manually.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const categories = CATEGORIES;

    // Progress calculation
    const getProgress = () => {
        let filled = 0;
        if (category) filled++;
        if (title.trim().length >= 5) filled++;
        if (locationStr.trim()) filled++;
        if (description.trim().length >= 10) filled++;
        if (photo || youtubeUrl.trim()) filled++;
        return filled;
    };
    const progress = getProgress();
    const totalSteps = 5;

    const handleSubmit = async () => {
        if (!title.trim()) {
            setErrorMsg('Please provide a title for the issue.');
            return;
        }
        if (title.trim().length < 5) {
            setErrorMsg('Title should be at least 5 characters.');
            return;
        }
        if (!description.trim()) {
            setErrorMsg('Please describe the issue.');
            return;
        }
        if (description.trim().length < 10) {
            setErrorMsg('Description should be at least 10 characters.');
            return;
        }

        // Animate button
        Animated.sequence([
            Animated.timing(submitScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.spring(submitScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        setLoading(true);
        setErrorMsg('');

        try {
            const netState = await NetInfo.fetch();
            const isOffline = !netState.isConnected;

            const issueData = {
                title: title.trim(),
                description: description.trim(),
                category,
                status: 'Open',
                urgency: urgency,
                location: locationStr,
                latitude: coords ? coords.latitude : null,
                longitude: coords ? coords.longitude : null,
                authorId: user?.uid || 'anonymous',
                authorName: user?.displayName || 'Citizen',
                youtubeUrl: youtubeUrl.trim(),
                photo: photo ? photo.uri : null,
            };

            if (isOffline) {
                await SyncService.enqueueIssue(issueData);
                Alert.alert("Saved Offline", "You appear to be offline. Your issue has been saved and will sync automatically when you reconnect.");
                navigation.goBack();
                return;
            }

            try {
                if (photo && photo.uri && !photo.uri.startsWith('http')) {
                    issueData.photo = await IssueService.uploadImage(photo.uri);
                }
                await IssueService.addIssue(issueData);
            } catch (networkError) {
                console.log("Upload failed, queueing offline:", networkError);
                issueData.photo = photo ? photo.uri : null;
                await SyncService.enqueueIssue(issueData);
                Alert.alert("Saved Offline", "We couldn't reach the server right now. Your issue has been saved and will sync automatically when you reconnect.");
            }

            navigation.goBack();
        } catch (error) {
            setErrorMsg(error.message || 'Failed to submit. Please try again.');
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: Colors.background }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>New Report</Text>
                </View>
                <TouchableOpacity 
                    onPress={handleSubmit} 
                    disabled={loading || progress < 3}
                    activeOpacity={0.7}
                    style={{ padding: 8 }}
                >
                    <Text style={[styles.submitHeaderText, (loading || progress < 3) && { opacity: 0.35 }]}>Post</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: `${(progress / totalSteps) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}/{totalSteps} completed</Text>
            </View>

            <Animated.ScrollView 
                style={{ flex: 1, opacity: fadeAnim }} 
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Section: Category */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, progress >= 1 && styles.sectionDotActive]} />
                        <Text style={styles.sectionLabel}>Category</Text>
                    </View>
                    <View style={styles.categoryGrid}>
                        {categories.map((c) => {
                            const isActive = category === c.name;
                            return (
                                <TouchableOpacity
                                    key={c.name}
                                    onPress={() => setCategory(c.name)}
                                    activeOpacity={0.7}
                                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                >
                                    <View style={[styles.categoryIconWrap, isActive && styles.categoryIconWrapActive]}>
                                        <MaterialCommunityIcons 
                                            name={c.icon} 
                                            size={18} 
                                            color={isActive ? '#FFF' : Colors.textTertiary} 
                                        />
                                    </View>
                                    <Text style={[styles.categoryText, isActive && styles.categoryTextActive]} numberOfLines={1}>
                                        {c.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Section: Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, progress >= 2 && styles.sectionDotActive]} />
                        <Text style={styles.sectionLabel}>Issue Details</Text>
                    </View>
                    <TextInput
                        value={title}
                        onChangeText={(t) => { setTitle(t); setErrorMsg(''); }}
                        mode="outlined"
                        style={styles.input}
                        textColor={Colors.textPrimary}
                        theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                        placeholder="What's the issue? (e.g. Deep pothole on Main St.)"
                        placeholderTextColor={Colors.textTertiary}
                        maxLength={200}
                    />
                    <TextInput
                        value={description}
                        onChangeText={(t) => { setDescription(t); setErrorMsg(''); }}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={[styles.input, { minHeight: 100 }]}
                        textColor={Colors.textPrimary}
                        theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                        placeholder="Describe the issue and its exact location..."
                        placeholderTextColor={Colors.textTertiary}
                    />
                    <View style={styles.charCount}>
                        <Text style={styles.charCountText}>{description.length} characters</Text>
                    </View>
                </View>

                {/* Section: Urgency */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, urgency !== 'low' && styles.sectionDotActive]} />
                        <Text style={styles.sectionLabel}>Urgency Level</Text>
                        {autoDetected && autoDetected.confidence !== 'low' && (
                            <View style={styles.autoDetectBadge}>
                                <MaterialCommunityIcons name="lightning-bolt" size={10} color={Colors.warning} style={{ marginRight: 3 }} />
                                <Text style={styles.autoDetectText}>AUTO-DETECTED</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ marginBottom: Spacing.sm }}>
                        {URGENCY_LEVELS.map((level) => {
                            const isActive = urgency === level.id;
                            return (
                                <TouchableOpacity
                                    key={level.id}
                                    onPress={() => setUrgency(level.id)}
                                    activeOpacity={0.7}
                                    style={[styles.urgencyRow, isActive && { backgroundColor: level.bg, borderColor: level.color + '40' }]}
                                >
                                    <View style={[styles.urgencyIconWrap, { backgroundColor: isActive ? level.bg : Colors.surfaceElevated }]}>
                                        <MaterialCommunityIcons name={level.icon} size={18} color={isActive ? level.color : Colors.textTertiary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.urgencyLabel, isActive && { color: level.color }]}>{level.label}</Text>
                                        <Text style={styles.urgencyDesc}>{level.desc}</Text>
                                    </View>
                                    {isActive && (
                                        <View style={[styles.urgencyCheck, { backgroundColor: level.color }]}>
                                            <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {autoDetected && autoDetected.matchedKeyword && (
                        <View style={styles.detectedHint}>
                            <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textTertiary} style={{ marginRight: 6 }} />
                            <Text style={styles.detectedHintText}>
                                Detected keyword: "{autoDetected.matchedKeyword}"
                            </Text>
                        </View>
                    )}
                </View>

                {/* Section: Location */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, progress >= 3 && styles.sectionDotActive]} />
                        <Text style={styles.sectionLabel}>Location</Text>
                    </View>
                    <TextInput
                        value={locationStr}
                        onChangeText={setLocationStr}
                        mode="outlined"
                        style={styles.input}
                        textColor={Colors.textPrimary}
                        theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                        placeholder="Enter location manually..."
                        placeholderTextColor={Colors.textTertiary}
                        left={<TextInput.Icon icon="map-marker-outline" color={Colors.textTertiary} />}
                    />
                    <TouchableOpacity 
                        onPress={fetchLocation}
                        disabled={isFetchingLocation}
                        activeOpacity={0.7}
                        style={styles.gpsBtn}
                    >
                        <View style={styles.gpsBtnIconWrap}>
                            <MaterialCommunityIcons 
                                name="crosshairs-gps" 
                                size={16} 
                                color={isFetchingLocation ? Colors.textTertiary : Colors.accent} 
                            />
                        </View>
                        <Text style={[styles.gpsBtnText, isFetchingLocation && { color: Colors.textTertiary }]}>
                            {isFetchingLocation ? 'Detecting location...' : 'Use Current Location'}
                        </Text>
                        {isFetchingLocation && <ActivityIndicator size={14} color={Colors.textTertiary} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                </View>

                {/* Section: Media */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionDot, progress >= 5 && styles.sectionDotActive]} />
                        <Text style={styles.sectionLabel}>Evidence</Text>
                        <Text style={styles.optionalBadge}>Optional</Text>
                    </View>

                    {photo ? (
                        <View style={styles.photoPreviewWrap}>
                            <Image
                                source={{ uri: photo.uri }}
                                style={styles.photoPreview}
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                onPress={() => setPhoto(null)}
                                activeOpacity={0.7}
                                style={styles.removePhotoBtn}
                            >
                                <MaterialCommunityIcons name="close-circle" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', marginBottom: Spacing.lg }}>
                            <TouchableOpacity onPress={takePhoto} style={[styles.photoBtn, { marginRight: Spacing.md }]} activeOpacity={0.7}>
                                <View style={styles.photoBtnIcon}>
                                    <MaterialCommunityIcons name="camera" size={24} color={Colors.accent} />
                                </View>
                                <Text style={styles.photoBtnTitle}>Camera</Text>
                                <Text style={styles.photoBtnSub}>Take a photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage} style={styles.photoBtn} activeOpacity={0.7}>
                                <View style={styles.photoBtnIcon}>
                                    <MaterialCommunityIcons name="image-multiple" size={24} color={Colors.accent} />
                                </View>
                                <Text style={styles.photoBtnTitle}>Gallery</Text>
                                <Text style={styles.photoBtnSub}>Choose file</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* YouTube Link */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or add a video</Text>
                        <View style={styles.dividerLine} />
                    </View>
                    <TextInput
                        value={youtubeUrl}
                        onChangeText={setYoutubeUrl}
                        mode="outlined"
                        style={styles.input}
                        textColor={Colors.textPrimary}
                        theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                        placeholder="Paste YouTube link..."
                        placeholderTextColor={Colors.textTertiary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        left={<TextInput.Icon icon="youtube" color="#FF0000" />}
                    />
                </View>

                {/* Error */}
                {errorMsg ? (
                    <View style={styles.errorBanner}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.error} style={{ marginRight: 8 }} />
                        <Text style={{ color: Colors.error, fontSize: 13, flex: 1 }}>{errorMsg}</Text>
                    </View>
                ) : null}

                {/* Submit */}
                <View style={{ paddingHorizontal: Spacing.xl }}>
                    <Animated.View style={{ transform: [{ scale: submitScale }] }}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.85}
                            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size={20} />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.submitBtnText}>Submit Report</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.disclaimer}>
                        Your report will be visible to the community and help improve your neighborhood.
                    </Text>
                </View>
            </Animated.ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = {
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.headerTop + 4,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    submitHeaderText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.accent,
    },
    progressContainer: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    progressTrack: {
        height: 3,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: 2,
    },
    progressText: {
        fontSize: 11,
        color: Colors.textTertiary,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    sectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.surfaceElevated,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    sectionDotActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    optionalBadge: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.textTertiary,
        marginLeft: 'auto',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: Radius.sm,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    categoryChipActive: {
        backgroundColor: Colors.accentSurface,
        borderColor: Colors.accent,
    },
    categoryIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: Colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    categoryIconWrapActive: {
        backgroundColor: Colors.accent,
    },
    categoryText: {
        color: Colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    categoryTextActive: {
        color: Colors.accent,
        fontWeight: '700',
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        marginBottom: Spacing.md,
    },
    charCount: {
        alignItems: 'flex-end',
        marginTop: -4,
        marginBottom: 4,
    },
    charCountText: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    gpsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    gpsBtnIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: Colors.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    gpsBtnText: {
        color: Colors.accent,
        fontSize: 13,
        fontWeight: '600',
    },
    photoPreviewWrap: {
        position: 'relative',
        marginBottom: Spacing.lg,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    photoPreview: {
        width: '100%',
        height: 220,
        borderRadius: Radius.lg,
        backgroundColor: Colors.surfaceElevated,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoBtn: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        paddingVertical: 20,
        alignItems: 'center',
    },
    photoBtnIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    photoBtnTitle: {
        color: Colors.textPrimary,
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 2,
    },
    photoBtnSub: {
        color: Colors.textTertiary,
        fontSize: 11,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        color: Colors.textTertiary,
        fontSize: 11,
        fontWeight: '600',
        marginHorizontal: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.errorSurface,
        padding: 12,
        borderRadius: Radius.sm,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    submitBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.fab,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disclaimer: {
        color: Colors.textTertiary,
        fontSize: 11,
        textAlign: 'center',
        marginTop: Spacing.md,
        lineHeight: 16,
    },
    urgencyRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, padding: 14, borderRadius: Radius.sm,
        marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    },
    urgencyIconWrap: {
        width: 32, height: 32, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    urgencyLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 1 },
    urgencyDesc: { fontSize: 11, color: Colors.textTertiary },
    urgencyCheck: {
        width: 22, height: 22, borderRadius: 7,
        justifyContent: 'center', alignItems: 'center',
    },
    autoDetectBadge: {
        flexDirection: 'row', alignItems: 'center', marginLeft: 'auto',
        backgroundColor: Colors.warningSurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    autoDetectText: { fontSize: 9, fontWeight: '800', color: Colors.warning, letterSpacing: 0.5 },
    detectedHint: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceElevated, padding: 10, borderRadius: Radius.sm,
    },
    detectedHintText: { fontSize: 12, color: Colors.textTertiary, fontStyle: 'italic' },
};
