import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme';
import { SyncService } from '../services/SyncService';

export default function NetworkBanner() {
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? true);
            if (state.isConnected) {
                SyncService.processQueue();
            }
        });
        return unsubscribe;
    }, []);

    if (isConnected) return null;

    return (
        <View style={styles.banner}>
            <MaterialCommunityIcons name="wifi-off" size={16} color="#FFF" />
            <Text style={styles.text}>You are currently offline.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: Colors.error,
        paddingVertical: 6,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 44 : 0, // safe area padding handled elsewhere, but this is absolute
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    text: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 8,
    }
});
