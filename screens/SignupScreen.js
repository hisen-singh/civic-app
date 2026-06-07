import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { Colors, Gradients, Radius, Spacing } from '../theme';

export default function SignupScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
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

    const handleSignup = async () => {
        // ─── Input Validation ────────────────────────────────────────────
        if (!name.trim()) {
            setErrorMsg('Please enter your name.');
            shake();
            return;
        }
        if (name.trim().length < 2) {
            setErrorMsg('Name must be at least 2 characters.');
            shake();
            return;
        }
        if (!email.trim()) {
            setErrorMsg('Please enter your email address.');
            shake();
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMsg('Please enter a valid email address.');
            shake();
            return;
        }
        if (!password) {
            setErrorMsg('Please create a password.');
            shake();
            return;
        }
        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters.');
            shake();
            return;
        }
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            setErrorMsg('Password must contain both letters and numbers.');
            shake();
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            await AuthService.signup(name.trim(), email.trim(), password);
            // Signup successful — AuthContext will detect the new user
            // and automatically navigate to the main app
        } catch (error) {
            const msg = error.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
                        error.code === 'auth/weak-password' ? 'Password is too weak. Use at least 6 characters.' :
                        error.code === 'auth/invalid-email' ? 'Invalid email format.' :
                        error.message || 'Signup failed. Please try again.';
            setErrorMsg(msg);
            shake();
        } finally {
            setLoading(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { label: '', color: 'transparent', width: '0%' };
        if (password.length < 6) return { label: 'Too short', color: Colors.error, width: '20%' };
        const hasLetters = /[A-Za-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        const score = (hasLetters ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSpecial ? 1 : 0) + (password.length >= 8 ? 1 : 0);
        if (score <= 1) return { label: 'Weak', color: Colors.error, width: '33%' };
        if (score <= 2) return { label: 'Fair', color: Colors.warning, width: '55%' };
        if (score <= 3) return { label: 'Good', color: Colors.success, width: '80%' };
        return { label: 'Strong', color: Colors.success, width: '100%' };
    };
    const strength = getPasswordStrength();


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
                    <View style={{ alignItems: 'center', marginBottom: 40 }}>
                        <View style={styles.logoContainer}>
                            <MaterialCommunityIcons name="account-plus" size={32} color={Colors.success} />
                        </View>
                        <Text style={styles.headlineText}>Create Account</Text>
                        <Text style={styles.subtitle}>Join your community on Civic</Text>
                    </View>

                    {/* Form Card */}
                    <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
                        <TextInput
                            label="Full Name"
                            value={name}
                            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
                            mode="outlined"
                            style={styles.input}
                            textColor={Colors.textPrimary}
                            theme={{ colors: { primary: Colors.accent, outline: Colors.border } }}
                            left={<TextInput.Icon icon="account-outline" color={Colors.textTertiary} />}
                        />
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

                        {/* Password Strength Bar */}
                        {password.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <View style={styles.strengthBarBg}>
                                    <Animated.View style={[styles.strengthBarFill, { width: strength.width, backgroundColor: strength.color }]} />
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                            </View>
                        )}

                        {/* Error */}
                        {errorMsg ? (
                            <View style={styles.errorBanner}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.error} style={{ marginRight: 8 }} />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        {/* Signup Button */}
                        <TouchableOpacity
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.85}
                            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" size={20} />
                            ) : (
                                <Text style={styles.primaryBtnText}>Create Account</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Login Link */}
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
                            Already have an account?{' '}
                            <Text style={{ color: Colors.accent, fontWeight: '700' }}>Sign In</Text>
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
        backgroundColor: Colors.successSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headlineText: {
        fontSize: 30,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
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
    strengthBarBg: {
        height: 4,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 4,
    },
    strengthBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'right',
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
    primaryBtn: {
        flexDirection: 'row',
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
