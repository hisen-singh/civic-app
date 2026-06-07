import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { Colors, Gradients, Radius, Spacing } from '../theme';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setErrorMsg('Please enter both email and password.');
            shake();
            return;
        }
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMsg('Please enter a valid email address.');
            shake();
            return;
        }
        setLoading(true);
        setErrorMsg('');
        setResetSent(false);
        try {
            await AuthService.login(email.trim(), password);
        } catch (error) {
            const msg = error.code === 'auth/user-not-found' ? 'No account found with this email.' :
                        error.code === 'auth/wrong-password' ? 'Incorrect password. Try again.' :
                        error.code === 'auth/too-many-requests' ? 'Too many attempts. Please wait.' :
                        error.code === 'auth/invalid-credential' ? 'Invalid email or password.' :
                        error.message || 'Login failed. Please try again.';
            setErrorMsg(msg);
            shake();
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setErrorMsg('Enter your email address first, then tap Reset.');
            shake();
            return;
        }
        setResetLoading(true);
        setErrorMsg('');
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetSent(true);
        } catch (error) {
            const msg = error.code === 'auth/user-not-found' ? 'No account found with this email.' :
                        error.message || 'Failed to send reset email.';
            setErrorMsg(msg);
            shake();
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <LinearGradient colors={Gradients.authBg} style={{ flex: 1 }}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.xl }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Branding */}
                    <View style={{ alignItems: 'center', marginBottom: 48 }}>
                        <View style={styles.logoContainer}>
                            <MaterialCommunityIcons name="shield-check" size={32} color={Colors.accent} />
                        </View>
                        <Text style={styles.logoText}>Civic</Text>
                        <Text style={styles.subtitle}>Sign in to your community</Text>
                    </View>

                    {/* Form Card */}
                    <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                            mode="outlined"
                            style={styles.input}
                            textColor={Colors.textPrimary}
                            theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            left={<TextInput.Icon icon="email-outline" color={Colors.textTertiary} />}
                        />
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                label="Password"
                                value={password}
                                onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                style={[styles.input, { marginBottom: 8 }]}
                                textColor={Colors.textPrimary}
                                theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                                left={<TextInput.Icon icon="lock-outline" color={Colors.textTertiary} />}
                                right={
                                    <TextInput.Icon 
                                        icon={showPassword ? "eye-off-outline" : "eye-outline"} 
                                        color={Colors.textTertiary}
                                        onPress={() => setShowPassword(!showPassword)}
                                    />
                                }
                            />
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity 
                            onPress={handleForgotPassword} 
                            disabled={resetLoading} 
                            style={{ alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 4 }}
                        >
                            <Text style={{ color: Colors.textTertiary, fontSize: 13 }}>
                                {resetLoading ? 'Sending...' : 'Forgot password?'}
                            </Text>
                        </TouchableOpacity>

                        {/* Error / Success */}
                        {errorMsg ? (
                            <View style={styles.errorBanner}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.error} style={{ marginRight: 8 }} />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}
                        {resetSent ? (
                            <View style={styles.successBanner}>
                                <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.success} style={{ marginRight: 8 }} />
                                <Text style={styles.successText}>Reset email sent! Check your inbox.</Text>
                            </View>
                        ) : null}


                        {/* Login Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size={20} />
                            ) : (
                                <Text style={styles.primaryBtnText}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sign Up Link */}
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginTop: 24, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
                            Don't have an account?{' '}
                            <Text style={{ color: Colors.accent, fontWeight: '700' }}>Create one</Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = {
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.accentSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 36,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
    formCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    input: {
        backgroundColor: Colors.surfaceElevated,
        marginBottom: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.errorSurface,
        padding: 12,
        borderRadius: Radius.sm,
        marginBottom: 16,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
        flex: 1,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successSurface,
        padding: 12,
        borderRadius: Radius.sm,
        marginBottom: 16,
    },
    successText: {
        color: Colors.success,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    primaryBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
};
