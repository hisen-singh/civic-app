import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { URGENCY_LEVELS } from '../../utils/urgencyDetector';
import { Colors } from '../../theme';

export default function UrgencySelector({ urgency, setUrgency }) {
  return (
    <View style={styles.container}>
      {URGENCY_LEVELS.map((level) => {
        const isActive = urgency === level.id;
        return (
          <TouchableOpacity
            key={level.id}
            onPress={() => setUrgency(level.id)}
            activeOpacity={0.7}
            style={[
              styles.urgencyRow,
              isActive && {
                backgroundColor: level.color,
                borderColor: '#FFFFFF',
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Select urgency: ${level.label}. ${level.desc}`}
          >
            <View
              style={[
                styles.urgencyIconWrap,
                {
                  backgroundColor: isActive
                    ? '#000000'
                    : Colors.surfaceElevated,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={level.icon}
                size={18}
                color={isActive ? level.color : Colors.textTertiary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.urgencyLabel, isActive && { color: '#000000' }]}
              >
                {level.label}
              </Text>
              <Text
                style={[styles.urgencyDesc, isActive && { color: '#000000' }]}
              >
                {level.desc}
              </Text>
            </View>
            {isActive && (
              <View
                style={[styles.urgencyCheck, { backgroundColor: '#000000' }]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={12}
                  color={level.color}
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 14,
    minHeight: 64, // Ensures touch target size
    borderRadius: 0, // Sharp brutalist corners
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF', // High-contrast border
    flexWrap: 'wrap', // Allows text to flow to next line if scaled
  },
  urgencyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 14,
    fontWeight: '800', // Heavy font
    color: '#FFFFFF',
    marginBottom: 4,
    flexShrink: 1,
  },
  urgencyDesc: {
    fontSize: 12,
    color: '#A0AAB5',
    flexShrink: 1,
  },
  urgencyCheck: {
    width: 22,
    height: 22,
    borderRadius: 0, // Sharp
    justifyContent: 'center',
    alignItems: 'center',
  },
});
