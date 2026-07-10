import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { auth } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import GradientButton from '../components/ui/GradientButton';
import { Colors, Gradients, Radius, Spacing } from '../theme';

export default function VerifyEmailScreen() {
    const { user, reloadUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleCheckVerification = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            await reloadUser();
            if (!auth.currentUser?.emailVerified) {
                setErrorMsg('Your email is not yet verified. Please check your inbox.');
            }
            // If verified, AuthContext's onAuthStateChanged or a re-render will catch the updated user state
            // Actually, we might need to force a context update or just let the app state handle it.
            // When user.reload() finishes, the user object mutates. If we use the same user object, 
            // React might not re-render AppContent. 
            // We can just rely on the component using user.emailVerified.
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            await AuthService.resendVerificationEmail();
            setSuccessMsg('Verification email sent! Check your inbox.');
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setResendLoading(false);
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
    };

    return (
        <LinearGradient colors={Gradients.authBg} style={{ flex: 1 }}>
            <View style={styles.bgOrbTop} />
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.xl }}
                >
                    <View style={{ alignItems: 'center', marginBottom: 40 }}>
                        <MaterialCommunityIcons name="email-check-outline" size={64} color={Colors.accentLight} style={{ marginBottom: 16 }} />
                        <Text style={styles.title}>Verify your email</Text>
                        <Text style={styles.subtitle}>
                            We sent a verification link to <Text style={{ color: Colors.accent, fontWeight: '700' }}>{user?.email}</Text>. 
                            Please check your inbox (and spam folder) and click the link to continue.
                        </Text>
                    </View>

                    <View style={styles.card}>
                        {errorMsg ? (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}
                        
                        {successMsg ? (
                            <View style={styles.successBanner}>
                                <Text style={styles.successText}>{successMsg}</Text>
                            </View>
                        ) : null}

                        <GradientButton
                            label="I've verified my email"
                            onPress={handleCheckVerification}
                            loading={loading}
                        />

                        <GradientButton
                            label="Resend Email"
                            onPress={handleResend}
                            loading={resendLoading}
                            variant="outlined"
                            style={{ marginTop: 16 }}
                        />

                        <GradientButton
                            label="Sign Out"
                            onPress={handleLogout}
                            variant="text"
                            style={{ marginTop: 16 }}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = {
    bgOrbTop: {
        position: 'absolute',
        top: -80,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    errorBanner: {
        backgroundColor: Colors.errorSurface,
        padding: 12,
        borderRadius: Radius.sm,
        marginBottom: 16,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    successBanner: {
        backgroundColor: Colors.successSurface,
        padding: 12,
        borderRadius: Radius.sm,
        marginBottom: 16,
    },
    successText: {
        color: Colors.success,
        fontSize: 13,
    },
};
