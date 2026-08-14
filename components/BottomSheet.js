import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing } from '../theme';

export default function BottomSheet({
  visible,
  onClose,
  onSelectOption,
  issue,
}) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalWrapper}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>HELP SOLVE THIS ISSUE</Text>
              <Text style={styles.headerSubtitle}>
                CHOOSE HOW YOU WANT TO CONTRIBUTE
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={22} color="#F1F5F9" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Option 1: Money */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption('fund')}
            >
              <MaterialCommunityIcons
                name="currency-usd"
                size={24}
                color="#F1F5F9"
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>FUND THE FIX</Text>
                <Text style={styles.optionDescription}>
                  Contribute financial support toward materials or resources
                </Text>
              </View>
            </Pressable>

            {/* Option 2: Labor */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption('labor')}
            >
              <MaterialCommunityIcons
                name="hand-heart-outline"
                size={24}
                color="#F1F5F9"
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>PLEDGE YOUR TIME</Text>
                <Text style={styles.optionDescription}>
                  Volunteer on the ground to help fix this issue
                </Text>
              </View>
            </Pressable>

            {/* Option 3: Voice/Sharing */}
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.optionButtonPressed,
              ]}
              onPress={() => onSelectOption && onSelectOption('amplify')}
            >
              <MaterialCommunityIcons
                name="bullhorn-outline"
                size={24}
                color="#F1F5F9"
                style={styles.optionIcon}
              />
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>AMPLIFY ISSUE</Text>
                <Text style={styles.optionDescription}>
                  Share with neighbors and urge local authorities to act
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#121212',
    borderRadius: 0,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingHorizontal: Spacing.lg || 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F1F5F9',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 6,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: '#FF4500',
  },
  optionIcon: {
    marginRight: 16,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F1F5F9',
    letterSpacing: 0.5,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
});
