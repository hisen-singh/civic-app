import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/AuthService';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Spacing, theme } from '../theme';

export default function EditProfileScreen({ navigation }) {
  const { user, reloadUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    successAnim.setValue(0);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setSuccessMsg(''));
  };

  const pickAvatar = () => {
    Alert.alert('Change Photo', 'Choose your profile photo', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) setLocalPhoto(result.assets[0]);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });
          if (!result.canceled) setLocalPhoto(result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      let newPhotoURL = photoURL;
      if (localPhoto?.uri) {
        const response = await fetch(localPhoto.uri);
        const blob = await response.blob();
        const avatarRef = ref(storage, `avatars/${user.uid}.jpg`);
        await uploadBytes(avatarRef, blob);
        newPhotoURL = await getDownloadURL(avatarRef);
      }
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
      });
      const profilePayload = {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), profilePayload, { merge: true });
      await setDoc(
        doc(db, 'users', user.uid, 'publicProfile', 'profile'),
        profilePayload,
        { merge: true },
      );
      setPhotoURL(newPhotoURL);
      setLocalPhoto(null);
      if (reloadUser) await reloadUser();
      showSuccess('Profile updated!');
    } catch (error) {
      console.error('[EditProfile] Save failed:', error);
      setErrorMsg(error.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await AuthService.resendVerificationEmail();
      showSuccess('Verification email sent!');
    } catch (error) {
      setErrorMsg(error.message || 'Failed to send verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const avatarSource = localPhoto?.uri || photoURL;
  const initials = (displayName || user?.email || 'U')
    .substring(0, 2)
    .toUpperCase();
  const isVerified = user?.emailVerified;
  const hasChanges =
    displayName.trim() !== (user?.displayName || '') || localPhoto !== null;

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        opacity: fadeAnim,
      }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ padding: 8 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !hasChanges}
          activeOpacity={0.7}
          style={{ padding: 8 }}
        >
          <Text
            style={[
              styles.saveBtn,
              (!hasChanges || saving) && { opacity: 0.35 },
            ]}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {successMsg ? (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: successAnim,
              transform: [
                {
                  translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={theme.colors.accentBrand}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: theme.colors.accentBrand,
              fontSize: 13,
              fontWeight: '800',
              textTransform: 'uppercase',
            }}
          >
            {successMsg}
          </Text>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <MaterialCommunityIcons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setErrorMsg('');
              }}
              mode="outlined"
              style={styles.input}
              textColor={theme.colors.textPrimary}
              theme={{
                colors: {
                  primary: theme.colors.accentBrand,
                  outline: theme.colors.border,
                },
                roundness: 0,
              }}
              left={
                <TextInput.Icon
                  icon="account-outline"
                  color={theme.colors.textMuted}
                />
              }
              maxLength={50}
            />
          </View>

          {/* Email + Verification */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={styles.readOnlyField}>
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={theme.colors.textMuted}
                style={{ marginRight: 12 }}
              />
              <Text style={styles.readOnlyText} numberOfLines={1}>
                {user?.email || ''}
              </Text>
              <View
                style={[
                  styles.verifiedBadge,
                  isVerified ? styles.verifiedActive : styles.verifiedInactive,
                ]}
              >
                <MaterialCommunityIcons
                  name={isVerified ? 'check-decagram' : 'alert-circle-outline'}
                  size={12}
                  color={
                    isVerified
                      ? theme.colors.accentBrand
                      : theme.colors.textMuted
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: isVerified
                      ? theme.colors.accentBrand
                      : theme.colors.textMuted,
                    textTransform: 'uppercase',
                  }}
                >
                  {isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                </Text>
              </View>
            </View>
            {!isVerified && (
              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={resendingEmail}
                activeOpacity={0.7}
                style={styles.resendBtn}
              >
                {resendingEmail ? (
                  <ActivityIndicator
                    size={14}
                    color={theme.colors.accentBrand}
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="email-edit-outline"
                    size={16}
                    color={theme.colors.accentBrand}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.resendText}>
                  {resendingEmail ? 'SENDING...' : 'RESEND VERIFICATION EMAIL'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Info */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>ACCOUNT</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.infoLabel}>JOINED</Text>
                <Text style={styles.infoValue}>
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString(
                        'en-US',
                        { month: 'long', day: 'numeric', year: 'numeric' },
                      )
                    : 'Unknown'}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.infoLabel}>USER ID</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      fontSize: 11,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {user?.uid?.substring(0, 16)}...
                </Text>
              </View>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={theme.colors.accentBrand}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: theme.colors.accentBrand,
                  fontSize: 13,
                  flex: 1,
                  fontWeight: '700',
                }}
              >
                {errorMsg}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.headerTop + 4,
    paddingBottom: Spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  saveBtn: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.accentBrand,
    textTransform: 'uppercase',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: 0,
  },
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.accentBrand,
  },
  avatarInitials: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  cameraIcon: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 0,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  changePhotoText: {
    color: theme.colors.accentBrand,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  fieldSection: { marginBottom: 28 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: { backgroundColor: theme.colors.surface, borderRadius: 0 },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  readOnlyText: { flex: 1, color: theme.colors.textPrimary, fontSize: 14 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  verifiedActive: { backgroundColor: theme.colors.surface },
  verifiedInactive: { backgroundColor: theme.colors.surface },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  resendText: {
    color: theme.colors.accentBrand,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: Spacing.lg,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  infoDivider: {
    height: 2,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accentBrand,
    padding: 12,
    borderRadius: 0,
    marginBottom: 16,
  },
};
