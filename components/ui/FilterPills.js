import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { Colors, Radius, Spacing } from '../../theme';

export default function FilterPills({ items, selected, onSelect, style, contentStyle }) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[{ paddingHorizontal: Spacing.lg }, contentStyle]}
            style={style}
        >
            {items.map((cat) => {
                const isSelected = selected === cat.id;
                const label = cat.title || cat.label;

                return (
                    <AnimatedPressable
                        key={cat.id}
                        onPress={() => onSelect(cat.id)}
                        activeScale={0.95}
                        style={{ marginRight: 8 }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isSelected ? Colors.accentSurface : Colors.surface,
                                borderWidth: 1.5,
                                borderColor: isSelected ? Colors.accent : Colors.border,
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                borderRadius: Radius.pill,
                            }}
                        >
                            <MaterialCommunityIcons
                                name={cat.icon}
                                size={14}
                                color={isSelected ? Colors.accentLight : Colors.textTertiary}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={{
                                    color: isSelected ? Colors.textPrimary : Colors.textSecondary,
                                    fontSize: 13,
                                    fontWeight: '600',
                                }}
                            >
                                {label}
                            </Text>
                            {cat.badge != null && cat.badge > 0 ? (
                                <View
                                    style={{
                                        backgroundColor: Colors.critical,
                                        borderRadius: 6,
                                        paddingHorizontal: 5,
                                        paddingVertical: 1,
                                        marginLeft: 6,
                                    }}
                                >
                                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                                        {cat.badge}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </AnimatedPressable>
                );
            })}
        </ScrollView>
    );
}
