import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function MapScreen() {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🗺️</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' }}>Map Unavailable on Web</Text>
            <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>
                The interactive Snap Map requires native device capabilities to render Google/Apple Maps. 
                Please run the app on an iOS or Android emulator/device to view it!
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B1120',
    }
});
