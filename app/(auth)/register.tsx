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

export default function RegisterScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        console.log('🚀 Starting registration...');
        console.log('📧 Email:', email.toLowerCase().trim());
        console.log('👤 Name:', name.trim());

        try {
            console.log('📡 Making API request to /auth/register...');
            const response = await apiClient.post('/auth/register', {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
            });

            console.log('✅ Registration successful!');
            console.log('📦 Response data:', JSON.stringify(response.data, null, 2));

            const { _id, name: userName, email: userEmail, budgetLimit, currency, token } = response.data;

            dispatch(
                setCredentials({
                    user: { _id, name: userName, email: userEmail, budgetLimit, currency },
                    token,
                })
            );

            router.replace('/(tabs)');
        } catch (error: any) {
            console.log('❌ Registration failed!');
            console.log('🔴 Error object:', error);
            console.log('🔴 Error message:', error.message);
            console.log('🔴 Error code:', error.code);
            console.log('🔴 Error response status:', error.response?.status);
            console.log('🔴 Error response data:', JSON.stringify(error.response?.data, null, 2));
            console.log('🔴 Error request:', error.request ? 'Request was made but no response' : 'Request failed to send');

            let message = 'Registration failed. Please try again.';

            if (error.code === 'ECONNABORTED') {
                message = 'Connection timed out. Check if the server is running.';
            } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                message = 'Network error. Check your connection and server IP address.';
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

            Alert.alert('Registration Error', `${message}\n\nDetails: ${error.message}`);
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
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Start tracking your expenses</Text>
                </LinearGradient>

                {/* Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor={colors.textLight}
                            value={name}
                            onChangeText={setName}
                            autoComplete="name"
                        />
                    </View>

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
                                placeholder="Create a password"
                                placeholderTextColor={colors.textLight}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password-new"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm your password"
                            placeholderTextColor={colors.textLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    <Button
                        title="Create Account"
                        onPress={handleRegister}
                        loading={isLoading}
                        style={styles.button}
                    />

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.loginLink}>Sign In</Text>
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
        paddingVertical: 50,
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
        paddingTop: spacing.xxl,
    },
    inputContainer: {
        marginBottom: spacing.md,
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: colors.textSecondary,
    },
    loginLink: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: colors.primary,
    },
});
