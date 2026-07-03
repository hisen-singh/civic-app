import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

export default function AnimatedPressable({
    children,
    onPress,
    style,
    disabled,
    activeScale = 0.97,
    ...props
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: activeScale,
            useNativeDriver: true,
            friction: 8,
            tension: 200,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
            tension: 200,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={1}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}
