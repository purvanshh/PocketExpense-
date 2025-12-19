import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { Button } from '../../src/components/common/Button';
import apiClient from '../../src/store/api/apiClient';
import { setCredentials, setError } from '../../src/store/slices/authSlice';
import { borderRadius, colors, shadows, spacing, typography } from '../../src/theme';

export default function LoginScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.post('/auth/login', {
                email: email.toLowerCase().trim(),
                password,
            });

            const { _id, name, email: userEmail, budgetLimit, currency, avatar, token } = response.data;

            dispatch(
                setCredentials({
                    user: { _id, name, email: userEmail, budgetLimit, currency, avatar },
                    token,
                })
            );

            router.replace('/(tabs)');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed. Please try again.';
            Alert.alert('Error', message);
            dispatch(setError(message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoEmoji}>💰</Text>
                    </View>
                    <Text style={styles.title}>PocketExpense+</Text>
                    <Text style={styles.subtitle}>Track your expenses smartly</Text>
                </LinearGradient>

                {/* Form */}
                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>Welcome Back</Text>
                    <Text style={styles.formSubtitle}>Sign in to continue</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.textLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.textLight}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={isLoading}
                        style={styles.button}
                    />

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>Don't have an account? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.registerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingVertical: 60,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...shadows.cardHeavy,
    },
    logoEmoji: {
        fontSize: 40,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: colors.textMain,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textMain,
        opacity: 0.8,
    },
    formContainer: {
        flex: 1,
        padding: spacing.xl,
        paddingTop: spacing.xxxl,
    },
    formTitle: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: colors.textMain,
        marginBottom: spacing.xs,
    },
    formSubtitle: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
        marginBottom: spacing.xxxl,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: colors.textMain,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textMain,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: spacing.lg,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    eyeIcon: {
        fontSize: 20,
    },
    button: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    registerLink: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.primary,
    },
});
