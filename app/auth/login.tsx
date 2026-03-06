import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator, Animated, Keyboard
} from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { usePostHog } from 'posthog-react-native';
import { Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react-native';
import { useAlert } from '../../context/AlertContext';

WebBrowser.maybeCompleteAuthSession();

// Helpers
// Helper removed in favor of context-aware version inside component

export default function AuthScreen() {
    const posthog = usePostHog();
    const { showAlert: contextShowAlert } = useAlert();

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
        else contextShowAlert(title, message);
    };

    const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

    // UX State
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [step, setStep] = useState<'form' | 'otp'>('form');

    // Reset forms when switching modes
    const toggleMode = (newMode: 'login' | 'register') => {
        setMode(newMode);
        setStep('form');
        setOtpCode('');
        setIsProcessing(false);
    };

    // Global Loading State - freezes UI while Clerk API calls process
    const [isProcessing, setIsProcessing] = useState(false);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [otpCode, setOtpCode] = useState('');

    // --- Google OAuth ---
    const handleGoogle = async () => {
        setIsProcessing(true);
        try {
            const redirectUrl = Linking.createURL('/');
            const { createdSessionId, setActive, signUp: googleSignUp } = await startOAuthFlow({ redirectUrl });

            if (createdSessionId && setActive) {
                // Success
                await setActive({ session: createdSessionId });
                posthog.capture('user_google_auth');
                // Deliberately keep isProcessing = true while _layout hands off routing.
            } else if (googleSignUp?.status === 'missing_requirements') {
                // Generate username for Clerk
                const rawName = ((googleSignUp.firstName || '') + (googleSignUp.lastName || '')).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const randomId = Math.floor(1000 + Math.random() * 9000).toString();
                const fallbackUsername = (rawName ? rawName.slice(0, 11) + randomId : `user${randomId}`).toLowerCase();

                const updatePayload: any = { username: fallbackUsername };
                if (googleSignUp.firstName) updatePayload.firstName = googleSignUp.firstName;
                if (googleSignUp.lastName) updatePayload.lastName = googleSignUp.lastName;

                const finalResult = await googleSignUp.update(updatePayload);

                if (finalResult.status === 'complete' && finalResult.createdSessionId && setActive) {
                    await setActive({ session: finalResult.createdSessionId });
                    posthog.capture('user_google_auth');
                    // Success, keep isProcessing true
                } else {
                    throw new Error(`Unexpected status: ${finalResult.status}`);
                }
            } else {
                throw new Error('Google Sign-In failed or was cancelled.');
            }
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            // If they just closed the browser, don't show a massive error
            if (err?.code !== 'session_exists') {
                showAlert('Authentication Error', err?.errors?.[0]?.longMessage || err?.message || 'Something went wrong.');
            }
            setIsProcessing(false);
        }
    };

    // --- Email & Password ---
    const handleSubmit = async () => {
        if (step === 'otp') {
            await handleVerifyOTP();
            return;
        }

        if (mode === 'login') {
            await handleLogin();
        } else {
            await handleRegister();
        }
    };

    const handleLogin = async () => {
        if (!isSignInLoaded) return;
        if (!email.trim() || !password) return showAlert('Missing Fields', 'Please enter email and password.');

        setIsProcessing(true);
        try {
            const result = await signIn.create({
                identifier: email.trim().toLowerCase(),
                password,
            });
            console.log(result);
            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId });
                posthog.identify(email.trim(), { $set: { email: email.trim() } });
                posthog.capture('user_logged_in', { email: email.trim() });
                // keep isProcessing true for handoff
            } else if (result.status === 'needs_first_factor') {
                // E.g. Password verified, but email not verified
                const firstFactor = result.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code') as any;
                if (firstFactor) {
                    await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: firstFactor.emailAddressId });
                    setStep('otp');
                } else {
                    showAlert('Authentication Error', 'No supported verification method found.');
                }
                setIsProcessing(false);
            } else if (result.status === 'needs_second_factor') {
                // E.g. 2FA enabled
                const secondFactor = result.supportedSecondFactors?.find((f: any) => f.strategy === 'email_code') as any;
                if (secondFactor) {
                    await signIn.prepareSecondFactor({ strategy: 'email_code' });
                    setStep('otp');
                } else {
                    showAlert('Authentication Error', 'No supported 2FA method found.');
                }
                setIsProcessing(false);
            } else if (result.status === 'needs_identifier') {
                setIsProcessing(false);
                showAlert('Login Failed', 'Identifier not found. Please sign up.');
            } else if (result.status === 'needs_new_password') {
                setIsProcessing(false);
                showAlert('Password Reset Required', 'Please reset your password to continue.');
            } else {
                setIsProcessing(false);
                showAlert('Login Failed', `Account status: ${result.status}. Please check your credentials.`);
            }
        } catch (err: any) {
            setIsProcessing(false);
            const msg = err?.errors?.[0]?.longMessage || err?.message || 'Login failed.';
            showAlert('Login Failed', msg);
        }
    };

    const handleRegister = async () => {
        if (!isSignUpLoaded) return;
        if (!email.trim() || !password || !fullName.trim() || !username.trim()) {
            return showAlert('Missing Fields', 'Please fill all fields.');
        }

        setIsProcessing(true);
        try {
            await signUp.create({
                emailAddress: email.trim().toLowerCase(),
                password,
            });

            // Always prepare verification after creating the signup attempt
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setStep('otp');
            setIsProcessing(false); // Free UI for OTP input
        } catch (err: any) {
            setIsProcessing(false);
            const msg = err?.errors?.[0]?.longMessage || err?.message || 'Sign up failed.';
            showAlert('Sign Up Failed', msg);
        }
    };

    const handleVerifyOTP = async () => {
        if (!isSignUpLoaded || !isSignInLoaded) return;
        if (!otpCode.trim()) return showAlert('Missing OTP', 'Please enter the code sent to your email.');

        setIsProcessing(true);
        try {
            if (mode === 'login') {
                // Handle Sign In MFA/Verification
                // Try second factor first (MFA)
                let result;
                if (signIn.status === 'needs_second_factor') {
                    result = await signIn.attemptSecondFactor({
                        strategy: 'email_code',
                        code: otpCode.trim(),
                    });
                } else {
                    // Try first factor (Email verification)
                    result = await signIn.attemptFirstFactor({
                        strategy: 'email_code',
                        code: otpCode.trim(),
                    });
                }

                if (result.status === 'complete') {
                    await setSignInActive({ session: result.createdSessionId });
                    posthog.capture('user_logged_in_mfa', { email: email.trim() });
                } else {
                    setIsProcessing(false);
                    showAlert('Login Error', `Status: ${result.status}`);
                }
            } else {
                // Handle Sign Up (Register) Verification
                let result = await signUp.attemptEmailAddressVerification({ code: otpCode.trim() });

                if (result.status === 'missing_requirements') {
                    const nameParts = fullName.trim().split(' ');
                    const fName = nameParts[0] || '';
                    const lName = nameParts.slice(1).join(' ') || '';

                    result = await signUp.update({
                        username: username.trim().toLowerCase(),
                        firstName: fName,
                        lastName: lName,
                    });
                }

                if (result.status === 'complete') {
                    await setSignUpActive({ session: result.createdSessionId });
                    posthog.capture('user_verified_signup', { email: email.trim() });
                    // keep isProcessing true
                } else {
                    setIsProcessing(false);
                    showAlert('Error', `Status: ${result.status}`);
                }
            }
        } catch (err: any) {
            setIsProcessing(false);
            const msg = err?.errors?.[0]?.longMessage || err?.message || 'Verification failed.';
            showAlert('Verification Failed', msg);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.contentWrapper}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.iconText}>N</Text>
                        </View>
                        <Text style={styles.title}>Nutrient Tracker</Text>
                        <Text style={styles.subtitle}>
                            {step === 'otp' ? `We sent a code to ${email}` : 'Log your journey, reach your goals'}
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.card}>
                        {step === 'form' && (
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                                    onPress={() => toggleMode('login')}
                                >
                                    <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Sign In</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
                                    onPress={() => toggleMode('register')}
                                >
                                    <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 'otp' ? (
                            <View style={styles.inputGroup}>
                                <View style={styles.inputField}>
                                    <Lock color="#6b7280" size={20} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="6-Digit OTP Code"
                                        placeholderTextColor="#6b7280"
                                        value={otpCode}
                                        onChangeText={setOtpCode}
                                        keyboardType="number-pad"
                                        autoFocus
                                    />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                {mode === 'register' && (
                                    <>
                                        <View style={styles.inputField}>
                                            <User color="#6b7280" size={20} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Full Name"
                                                placeholderTextColor="#6b7280"
                                                value={fullName}
                                                onChangeText={setFullName}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                        <View style={styles.inputField}>
                                            <User color="#6b7280" size={20} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Username (e.g. johndoe123)"
                                                placeholderTextColor="#6b7280"
                                                value={username}
                                                onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15))}
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    </>
                                )}
                                <View style={styles.inputField}>
                                    <Mail color="#6b7280" size={20} />
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
                                <View style={styles.inputField}>
                                    <Lock color="#6b7280" size={20} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        placeholderTextColor="#6b7280"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.mainButton, isProcessing && styles.mainButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="#0f172a" />
                            ) : (
                                <>
                                    <Text style={styles.mainButtonText}>
                                        {step === 'otp' ? 'Verify Details' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                    </Text>
                                    <ArrowRight color="#0f172a" size={20} />
                                </>
                            )}
                        </TouchableOpacity>

                        {step === 'form' && (
                            <View style={styles.oauthSection}>
                                <View style={styles.divider}>
                                    <View style={styles.line} />
                                    <Text style={styles.dividerText}>OR</Text>
                                    <View style={styles.line} />
                                </View>

                                <TouchableOpacity
                                    style={styles.oauthBtn}
                                    onPress={handleGoogle}
                                    disabled={isProcessing}
                                >
                                    <Chrome color="#fff" size={20} />
                                    <Text style={styles.oauthText}>Continue with Google</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 'otp' && (
                            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('form')} disabled={isProcessing}>
                                <Text style={styles.backBtnText}>Change Email or Sign In</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Global Loader Overlay if they are navigating away */}
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#bef264" />
                    <Text style={styles.processingText}>Authenticating securely...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    contentWrapper: {
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(190, 242, 100, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(190, 242, 100, 0.2)',
    },
    iconText: {
        fontSize: 36,
        fontWeight: '900',
        color: '#bef264',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleBtnActive: {
        backgroundColor: '#1e293b',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    toggleTextActive: {
        color: '#f8fafc',
    },
    inputGroup: {
        gap: 16,
        marginBottom: 24,
    },
    inputField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#334155',
    },
    input: {
        flex: 1,
        color: '#f8fafc',
        fontSize: 16,
        marginLeft: 12,
    },
    mainButton: {
        backgroundColor: '#bef264',
        borderRadius: 16,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    mainButtonDisabled: {
        backgroundColor: '#84cc16',
        opacity: 0.7,
    },
    mainButtonText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '700',
    },
    oauthSection: {
        marginTop: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#334155',
    },
    dividerText: {
        color: '#64748b',
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '700',
    },
    oauthBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155',
        borderRadius: 16,
        height: 56,
        gap: 12,
    },
    oauthText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    backBtnText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '500',
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    processingText: {
        color: '#f8fafc',
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
    }
});
