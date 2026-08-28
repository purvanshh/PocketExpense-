import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
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
import { borderRadius, elevation, makeStyles, spacing, typography, useTheme } from '../../src/theme';

export default function LoginScreen() {
    const styles = useStyles();
    const { colors } = useTheme();
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
        console.log('🚀 Starting login...');
        console.log('📧 Email:', email.toLowerCase().trim());

        try {
            console.log('📡 Making API request to /auth/login...');
            const response = await apiClient.post('/auth/login', {
                email: email.toLowerCase().trim(),
                password,
            });

            console.log('✅ Login successful!');
            console.log('📦 Response data:', JSON.stringify(response.data, null, 2));

            const { _id, name, email: userEmail, budgetLimit, currency, avatar, token } = response.data.data;

            dispatch(
                setCredentials({
                    user: { _id, name, email: userEmail, budgetLimit, currency, avatar },
                    token,
                })
            );

            router.replace('/(tabs)');
        } catch (error: any) {
            console.log('❌ Login failed!');
            console.log('🔴 Error object:', error);
            console.log('🔴 Error message:', error.message);
            console.log('🔴 Error code:', error.code);
            console.log('🔴 Error response status:', error.response?.status);
            console.log('🔴 Error response data:', JSON.stringify(error.response?.data, null, 2));
            console.log('🔴 Error request:', error.request ? 'Request was made but no response' : 'Request failed to send');

            let message = 'Login failed. Please try again.';

            if (error.code === 'ECONNABORTED') {
                message = 'Connection timed out. Check if the server is running.';
            } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                message = 'Network error. Check your connection and server IP address.';
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

            Alert.alert('Login Error', `${message}\n\nDetails: ${error.message}`);
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
                        <Text style={styles.registerText}>Don&apos;t have an account? </Text>
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

const useStyles = makeStyles((c, isDark) => ({
    container: {
        flex: 1,
        backgroundColor: c.background,
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
        backgroundColor: c.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...elevation(isDark).cardHeavy,
    },
    logoEmoji: {
        fontSize: 40,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        fontSize: typography.sizes.xxl,
        color: c.textMain,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
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
        color: c.textMain,
        marginBottom: spacing.xs,
    },
    formSubtitle: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textSecondary,
        marginBottom: spacing.xxxl,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.sm,
        color: c.textMain,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
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
        color: c.textSecondary,
    },
    registerLink: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.primary,
    },
}));
