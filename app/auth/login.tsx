
import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { Mail, Lock, CheckCircle, User } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const { login, signUp, verifySignUp, loading: contextLoading } = useUser();
    const posthog = usePostHog();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [code, setCode] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleAuth = useCallback(async () => {
        setGoogleLoading(true);
        try {
            const { createdSessionId, setActive } = await startOAuthFlow();
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                posthog.capture('user_google_auth');
                router.replace('/(tabs)');
            }
        } catch (err) {
            console.error('Google OAuth error:', err);
            Alert.alert('Google Sign-In Error', (err as Error).message);
        } finally {
            setGoogleLoading(false);
        }
    }, [startOAuthFlow]);

    const handleAuth = async () => {
        if (verifying) {
            if (!code) {
                Alert.alert('Error', 'Please enter the verification code');
                return;
            }
            setLocalLoading(true);
            try {
                await verifySignUp(code, fullName, username);
                setVerifying(false);
                router.replace('/(tabs)');
            } catch (error) {
                console.error(error);
                Alert.alert('Verification Error', (error as Error).message);
            } finally {
                setLocalLoading(false);
            }
            return;
        }

        if (!email || !password || (!isLogin && (!fullName || !username))) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLocalLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                posthog.identify(email, { $set: { email } });
                posthog.capture('user_logged_in', { email });
                router.replace('/(tabs)');
            } else {
                await signUp(email, password, fullName, username);
                posthog.identify(email, {
                    $set: { email, full_name: fullName, username },
                    $set_once: { signup_date: new Date().toISOString() },
                });
                posthog.capture('user_signed_up', { email, username });
                setVerifying(true);
            }
        } catch (error) {
            console.error(error);
            const message = (error as Error).message;
            posthog.capture('$exception', {
                $exception_list: [{ type: 'AuthError', value: message }],
                $exception_source: 'login',
                action: isLogin ? 'login' : 'signup',
            });
            Alert.alert('Authentication Error', message);
        } finally {
            setLocalLoading(false);
        }
    };

    const isLoading = localLoading || contextLoading;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconBg}>
                        <CheckCircle size={40} color="#bef264" />
                    </View>
                    <Text style={styles.title}>
                        {verifying ? 'Verify Email' : (isLogin ? 'Welcome Back!' : 'Create Account')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {verifying
                            ? 'Enter the code sent to your email'
                            : (isLogin
                                ? 'Sign in to continue your healthy journey'
                                : 'Join us and start your transformation today')}
                    </Text>
                </View>

                <View style={styles.form}>
                    {!verifying && (
                        <>
                            {/* Google Sign-In Button */}
                            <TouchableOpacity
                                style={styles.googleButton}
                                onPress={handleGoogleAuth}
                                disabled={googleLoading || isLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        {/* Google G Logo */}
                                        <View style={styles.googleLogoContainer}>
                                            <Text style={styles.googleLogoText}>G</Text>
                                        </View>
                                        <Text style={styles.googleButtonText}>
                                            Continue with Google
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>
                        </>
                    )}

                    {/* Email/Password Form */}
                    {verifying ? (
                        <View style={styles.inputContainer}>
                            <CheckCircle size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Verification Code"
                                placeholderTextColor="#6b7280"
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                autoFocus
                            />
                        </View>
                    ) : (
                        <>
                            {!isLogin && (
                                <View style={styles.inputContainer}>
                                    <User size={20} color="#9ca3af" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Full Name"
                                        placeholderTextColor="#6b7280"
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>
                            )}

                            {!isLogin && (
                                <View style={styles.inputContainer}>
                                    <User size={20} color="#9ca3af" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username (e.g. fituser99)"
                                        placeholderTextColor="#6b7280"
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                    />
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <Mail size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Address"
                                    placeholderTextColor="#6b7280"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Lock size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#6b7280"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            {isLogin && (
                                <TouchableOpacity style={styles.forgotPassword}>
                                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.button, isLoading && { opacity: 0.7 }]}
                        onPress={handleAuth}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {verifying ? 'Verify Email' : (isLogin ? 'Sign In' : 'Sign Up')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {!verifying ? (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                            </Text>
                            <TouchableOpacity onPress={() => { setIsLogin(!isLogin); }}>
                                <Text style={styles.footerLink}>
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.footer} onPress={() => setVerifying(false)}>
                            <Text style={styles.footerLink}>← Back to Sign Up</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    iconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(190, 242, 100, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    form: {
        width: '100%',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        height: 56,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
        gap: 12,
    },
    googleLogoContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleLogoText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4285F4',
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#2a2a2a',
    },
    dividerText: {
        color: '#6b7280',
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        marginBottom: 14,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: -4,
    },
    forgotPasswordText: {
        color: '#bef264',
        fontSize: 14,
    },
    button: {
        backgroundColor: '#bef264',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    buttonText: {
        color: '#000',
        fontSize: 17,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#6b7280',
        fontSize: 14,
    },
    footerLink: {
        color: '#bef264',
        fontSize: 14,
        fontWeight: '600',
    },
});
