import React from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { Colors, Radius, Shadows } from '../../theme';

export default function GradientButton({
    label,
    onPress,
    loading = false,
    disabled = false,
    icon,
    colors = [Colors.accentDark, Colors.accent, Colors.accentLight],
    style,
    textStyle,
    size = 'md',
}) {
    const paddingVertical = size === 'sm' ? 10 : size === 'lg' ? 16 : 14;
    const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={disabled || loading}
            style={[{ borderRadius: Radius.lg, overflow: 'hidden', ...Shadows.subtle }, style]}
        >
            <LinearGradient
                colors={disabled ? [Colors.surfaceElevated, Colors.surfaceElevated] : colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical,
                    paddingHorizontal: 24,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" size={20} />
                ) : (
                    <>
                        {icon ? (
                            <MaterialCommunityIcons
                                name={icon}
                                size={20}
                                color="#FFF"
                                style={{ marginRight: 8 }}
                            />
                        ) : null}
                        <Text
                            style={[
                                { color: disabled ? Colors.textTertiary : '#FFF', fontSize, fontWeight: '700' },
                                textStyle,
                            ]}
                        >
                            {label}
                        </Text>
                    </>
                )}
            </LinearGradient>
        </AnimatedPressable>
    );
}
