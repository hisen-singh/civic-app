import React, { useState, useRef } from 'react';
import { View, Image, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../theme';

const CARD_HEIGHT = 280;

export default function BeforeAfterCard({ beforePhoto, afterPhoto, title }) {
    const [showAfter, setShowAfter] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        const toValue = showAfter ? 0 : 1;
        setShowAfter(!showAfter);
        Animated.spring(slideAnim, { toValue, friction: 8, tension: 60, useNativeDriver: true }).start();
    };

    if (!beforePhoto || !afterPhoto) return null;

    const beforeOpacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const afterOpacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.solvedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.success} style={{ marginRight: 6 }} />
                    <Text style={styles.solvedText}>RESOLVED</Text>
                </View>
                {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
            </View>

            <TouchableOpacity activeOpacity={0.95} onPress={toggle} style={styles.imageContainer}>
                <Animated.View style={[styles.imageLayer, { opacity: beforeOpacity }]}>
                    <Image source={{ uri: beforePhoto }} style={styles.image} resizeMode="cover" />
                    <View style={[styles.label, styles.labelBefore]}>
                        <Text style={styles.labelText}>BEFORE</Text>
                    </View>
                </Animated.View>
                <Animated.View style={[styles.imageLayer, styles.imageLayerAbsolute, { opacity: afterOpacity }]}>
                    <Image source={{ uri: afterPhoto }} style={styles.image} resizeMode="cover" />
                    <View style={[styles.label, styles.labelAfter]}>
                        <Text style={styles.labelText}>AFTER</Text>
                    </View>
                </Animated.View>
                <View style={styles.tapHint}>
                    <MaterialCommunityIcons name="gesture-tap" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.tapText}>Tap to compare</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.toggleRow}>
                <TouchableOpacity onPress={() => { if (showAfter) toggle(); }} activeOpacity={0.7} style={[styles.togglePill, !showAfter && styles.togglePillActive]}>
                    <Text style={[styles.toggleText, !showAfter && styles.toggleTextActive]}>Before</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (!showAfter) toggle(); }} activeOpacity={0.7} style={[styles.togglePill, showAfter && styles.togglePillActive]}>
                    <Text style={[styles.toggleText, showAfter && styles.toggleTextActive]}>After</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = {
    container: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    headerRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    solvedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    solvedText: { fontSize: 10, fontWeight: '800', color: Colors.success, letterSpacing: 0.5 },
    title: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginLeft: 12 },
    imageContainer: { height: CARD_HEIGHT, position: 'relative', backgroundColor: Colors.surfaceElevated },
    imageLayer: { width: '100%', height: '100%' },
    imageLayerAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    image: { width: '100%', height: '100%' },
    label: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    labelBefore: { backgroundColor: 'rgba(239, 68, 68, 0.85)' },
    labelAfter: { backgroundColor: 'rgba(16, 185, 129, 0.85)' },
    labelText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    tapHint: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
    tapText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginLeft: 6 },
    toggleRow: { flexDirection: 'row', padding: Spacing.sm, backgroundColor: Colors.surfaceElevated },
    togglePill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm, marginHorizontal: 4 },
    togglePillActive: { backgroundColor: Colors.accent },
    toggleText: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary },
    toggleTextActive: { color: '#FFF' },
};
