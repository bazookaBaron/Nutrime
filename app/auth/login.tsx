/**
 * login.tsx — Standalone auth screen
 *
 * Uses Clerk hooks directly. Never calls router.push — routing is reactive and
 * handled entirely by _layout.tsx watching isSignedIn + hasCompletedOnboarding.
 *
 * Flows:
 *  1. Email/password login   (+ optional TOTP 2FA)
 *  2. Email/password sign-up (+ OTP email verification)
 *  3. Google OAuth
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator, Animated,
} from 'react-native';
import { useSignIn, useSignUp, useOAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { usePostHog } from 'posthog-react-native';
import { Mail, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

type Screen = 'login' | 'signup' | 'otp' | 'twofa';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FieldProps {
    icon: React.ReactNode;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'number-pad';
    autoCapitalize?: 'none' | 'sentences';
    autoFocus?: boolean;
    rightElement?: React.ReactNode;
}

function Field({
    icon, placeholder, value, onChangeText,
    secureTextEntry = false, keyboardType = 'default',
    autoCapitalize = 'sentences', autoFocus = false, rightElement,
}: FieldProps) {
    return (
        <View style={styles.inputRow}>
            <View style={styles.inputIcon}>{icon}</View>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#6b7280"
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoFocus={autoFocus}
            />
            {rightElement}
        </View>
    );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function LoginScreen() {
    const posthog = usePostHog();
    const convex = useConvex();

    const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

    // Screen state
    const [screen, setScreen] = useState<Screen>('login');

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [code, setCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Loading states
    const [submitting, setSubmitting] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // -------------------------------------------------------------------------
    // Ensure Convex profile after successful auth
    // -------------------------------------------------------------------------
    const ensureProfile = useCallback(async (
        userId: string,
        userEmail?: string | null,
        name?: string | null,
        uname?: string | null,
    ) => {
        try {
            await convex.mutation(api.users.ensureProfile, {
                userId,
                email: userEmail ?? undefined,
                full_name: name ?? undefined,
                username: uname ?? undefined,
            });
        } catch (err) {
            console.warn('[LoginScreen] ensureProfile failed (non-fatal):', err);
        }
    }, [convex]);

    // -------------------------------------------------------------------------
    // Google OAuth
    // -------------------------------------------------------------------------
    const handleGoogleAuth = useCallback(async () => {
        setGoogleLoading(true);
        try {
            // redirectUrl tells Clerk where to deep-link back after the browser flow.
            // Without this, the OAuth callback hits an unknown route in Expo Router.
            const redirectUrl = Linking.createURL('/');
            const { createdSessionId, setActive } = await startOAuthFlow({ redirectUrl });
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                posthog.capture('user_google_auth');
                // _layout.tsx will redirect automatically once isSignedIn becomes true.
                // useEnsureProfile in UserContext handles DB profile creation/lookup.
            }
        } catch (err: any) {
            console.error('[LoginScreen] Google OAuth error:', err);
            showAlert('Google Sign-In Failed', err?.message ?? 'Something went wrong.');
        } finally {
            setGoogleLoading(false);
        }
    }, [startOAuthFlow]);

    // -------------------------------------------------------------------------
    // Email / Password Login
    // -------------------------------------------------------------------------
    const handleLogin = async () => {
        if (!isSignInLoaded || !signIn) return;
        if (!email.trim() || !password) {
            showAlert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await signIn.create({
                identifier: email.trim().toLowerCase(),
                password,
            });

            // Debug: log status so we can see exactly what Clerk returns
            console.log('[Login] Clerk signIn status:', result.status);

            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId });
                posthog.identify(email.trim(), { $set: { email: email.trim() } });
                posthog.capture('user_logged_in', { email: email.trim() });
            } else if (result.status === 'needs_second_factor') {
                // This user account has MFA personally enrolled, even though
                // global MFA is disabled. It must be removed on the specific user
                // in the Clerk dashboard: Users → [user] → Multi-factor → Remove
                showAlert(
                    'MFA Still Active',
                    'Your account still has MFA enrolled. Go to Clerk Dashboard → Users → select your user → MFA tab → Remove the enrollment. Then try again.'
                );
            } else if (result.status === 'needs_first_factor') {
                setCode('');
                setScreen('otp');
            } else {
                showAlert('Sign In Failed', `Unexpected Clerk status: "${result.status}". Check the debug console for details.`);
            }
        } catch (err: any) {
            console.error('[LoginScreen] Login error:', err);
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Login failed. Please try again.';
            posthog.capture('$exception', { $exception_list: [{ type: 'LoginError', value: msg }] });
            showAlert('Sign In Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------------------------------------------------------
    // TOTP 2FA Verification (for login)
    // -------------------------------------------------------------------------
    const handleVerify2FA = async () => {
        if (!isSignInLoaded || !signIn) return;
        if (!code.trim()) {
            showAlert('Error', 'Please enter your 2FA code.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await signIn.attemptSecondFactor({ strategy: 'totp', code: code.trim() });
            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId });
                // ensureProfile handled by useEnsureProfile hook in UserContext
                posthog.capture('user_logged_in_2fa', { email: email.trim() });
            } else {
                showAlert('2FA Failed', `Status: ${result.status}`);
            }
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? '2FA verification failed.';
            showAlert('Verification Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------------------------------------------------------
    // Sign Up
    // -------------------------------------------------------------------------
    const handleSignUp = async () => {
        if (!isSignUpLoaded || !signUp) return;
        if (!email.trim() || !password || !fullName.trim() || !username.trim()) {
            showAlert('Missing Fields', 'Please fill in all fields to create an account.');
            return;
        }
        setSubmitting(true);
        try {
            // Create the sign-up attempt with only email + password.
            // username / names are saved to Convex after OTP verification.
            // Passing unsupported fields here causes "No sign up attempt found".
            const result = await signUp.create({
                emailAddress: email.trim().toLowerCase(),
                password,
            });

            if (result.status === 'complete') {
                // If Clerk doesn't require verification (settings changed in dashboard)
                await setSignUpActive({ session: result.createdSessionId });
                if (result.createdUserId) {
                    await ensureProfile(
                        result.createdUserId,
                        result.emailAddress || email.trim(),
                        fullName.trim(),
                        username.trim().toLowerCase(),
                    );
                }
                posthog.capture('user_signed_up_complete', { email: email.trim() });
            } else if (result.status === 'missing_requirements') {
                // Normal OTP verification flow
                await result.prepareEmailAddressVerification({ strategy: 'email_code' });
                posthog.identify(email.trim(), {
                    $set: { email: email.trim(), full_name: fullName.trim(), username: username.trim() },
                    $set_once: { signup_date: new Date().toISOString() },
                });
                posthog.capture('user_signed_up_needs_otp', { email: email.trim() });
                setCode('');
                setScreen('otp');
            } else {
                showAlert('Sign Up', `Status: ${result.status}`);
            }
        } catch (err: any) {
            console.error('[LoginScreen] SignUp error:', err);
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Sign up failed. Please try again.';
            showAlert('Sign Up Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------------------------------------------------------
    // OTP Email Verification (for sign-up)
    // -------------------------------------------------------------------------
    const handleVerifyOTP = async () => {
        if (!isSignUpLoaded || !signUp) return;
        if (!code.trim()) {
            showAlert('Error', 'Please enter the verification code from your email.');
            return;
        }
        setSubmitting(true);
        try {
            let result = await signUp.attemptEmailAddressVerification({ code: code.trim() });

            // After email verification, Clerk may return 'missing_requirements' because
            // we deferred username/name fields during signUp.create(). We finish the
            // sign-up by calling update() with those fields now.
            if (result.status === 'missing_requirements') {
                const nameParts = fullName.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                result = await signUp.update({
                    username: username.trim().toLowerCase(),
                    firstName,
                    lastName,
                });
            }

            if (result.status === 'complete') {
                await setSignUpActive({ session: result.createdSessionId });
                if (result.createdUserId) {
                    await ensureProfile(
                        result.createdUserId,
                        result.emailAddress,
                        fullName.trim(),
                        username.trim().toLowerCase(),
                    );
                }
                posthog.capture('user_verified_signup', { email: email.trim() });
                // _layout.tsx will redirect to onboarding
            } else {
                showAlert('Verification Failed', `Status: ${result.status}`);
            }
        } catch (err: any) {
            console.error('[LoginScreen] OTP verify error:', err);
            const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Verification failed.';
            showAlert('Verification Failed', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------------------------------------------------------------
    // Resend OTP
    // -------------------------------------------------------------------------
    const handleResendOTP = async () => {
        if (!isSignUpLoaded || !signUp) return;
        try {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            showAlert('Code Sent', 'A new verification code has been sent to your email.');
        } catch (err: any) {
            showAlert('Error', err?.message ?? 'Could not resend code.');
        }
    };

    // -------------------------------------------------------------------------
    // Dispatch
    // -------------------------------------------------------------------------
    const handleSubmit = () => {
        switch (screen) {
            case 'login': return handleLogin();
            case 'signup': return handleSignUp();
            case 'otp': return handleVerifyOTP();
            case 'twofa': return handleVerify2FA();
        }
    };

    // -------------------------------------------------------------------------
    // Copy for each screen
    // -------------------------------------------------------------------------
    const copy = {
        login: { title: 'Welcome Back', subtitle: 'Sign in to continue your journey', cta: 'Sign In' },
        signup: { title: 'Create Account', subtitle: 'Start your transformation today', cta: 'Create Account' },
        otp: { title: 'Check Your Email', subtitle: `We sent a code to ${email}`, cta: 'Verify Email' },
        twofa: { title: 'Two-Factor Auth', subtitle: 'Enter the code from your 2FA app', cta: 'Verify Code' },
    };
    const { title, subtitle, cta } = copy[screen];
    const isLoading = submitting || googleLoading;

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Header ---- */}
                <View style={styles.header}>
                    <View style={styles.logoBg}>
                        <Text style={styles.logoText}>N</Text>
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                {/* ---- Form ---- */}
                <View style={styles.form}>

                    {/* Google Button — only on login/signup screens */}
                    {(screen === 'login' || screen === 'signup') && (
                        <>
                            <TouchableOpacity
                                style={[styles.googleButton, isLoading && styles.disabled]}
                                onPress={handleGoogleAuth}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <View style={styles.googleLogo}>
                                            <Text style={styles.googleLogoText}>G</Text>
                                        </View>
                                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.dividerLine} />
                            </View>
                        </>
                    )}

                    {/* OTP / 2FA code input */}
                    {(screen === 'otp' || screen === 'twofa') && (
                        <Field
                            icon={<ShieldCheck size={20} color="#6b7280" />}
                            placeholder={screen === 'twofa' ? 'Authenticator Code' : 'Verification Code'}
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            autoCapitalize="none"
                            autoFocus
                        />
                    )}

                    {/* Sign-up only fields */}
                    {screen === 'signup' && (
                        <>
                            <Field
                                icon={<User size={20} color="#6b7280" />}
                                placeholder="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                            <Field
                                icon={<User size={20} color="#6b7280" />}
                                placeholder="Username (e.g. fituser99)"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </>
                    )}

                    {/* Email + Password — login & signup */}
                    {(screen === 'login' || screen === 'signup') && (
                        <>
                            <Field
                                icon={<Mail size={20} color="#6b7280" />}
                                placeholder="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Field
                                icon={<Lock size={20} color="#6b7280" />}
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                rightElement={
                                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                                        {showPassword
                                            ? <EyeOff size={18} color="#6b7280" />
                                            : <Eye size={18} color="#6b7280" />
                                        }
                                    </TouchableOpacity>
                                }
                            />
                        </>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.disabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.submitButtonText}>{cta}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer links */}
                    {screen === 'login' && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?  </Text>
                            <TouchableOpacity onPress={() => { setScreen('signup'); setCode(''); }}>
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {screen === 'signup' && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?  </Text>
                            <TouchableOpacity onPress={() => { setScreen('login'); setCode(''); }}>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {screen === 'otp' && (
                        <View style={styles.otpFooter}>
                            <TouchableOpacity onPress={() => setScreen('signup')}>
                                <Text style={styles.footerLink}>← Back to Sign Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleResendOTP}>
                                <Text style={styles.footerLink}>Resend Code</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {screen === 'twofa' && (
                        <TouchableOpacity style={styles.footer} onPress={() => setScreen('login')}>
                            <Text style={styles.footerLink}>← Back to Sign In</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBg: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(190, 242, 100, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(190, 242, 100, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#bef264',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: -0.5,
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
        borderRadius: 14,
        height: 56,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2e2e2e',
        gap: 12,
    },
    googleLogo: {
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
        backgroundColor: '#1e1e1e',
    },
    dividerText: {
        color: '#4b5563',
        fontSize: 14,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 14,
        marginBottom: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    eyeButton: {
        padding: 4,
    },
    submitButton: {
        backgroundColor: '#bef264',
        borderRadius: 14,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    submitButtonText: {
        color: '#000',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    disabled: {
        opacity: 0.6,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
