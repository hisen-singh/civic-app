import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { Colors, Spacing, Radius } from '../theme';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        Sentry.captureException(error);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.error} />
                        </View>
                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.subtitle}>
                            We've been notified about this issue. Please try again.
                        </Text>
                        <TouchableOpacity style={styles.button} onPress={this.resetError}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: Radius.lg,
        backgroundColor: Colors.errorSurface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
        lineHeight: 22,
    },
    button: {
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: 14,
        borderRadius: Radius.md,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
