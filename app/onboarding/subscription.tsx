import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { Check } from 'lucide-react-native';
import Purchases from 'react-native-purchases';

const FEATURES = [
    'Log & track daily food + water',
    'Customized gym workout schedule',
    'Customized home workout schedule',
    'Compete with others via live leaderboard (state/country)',
    'Advanced analytics with macro distribution'
];

export default function Subscription() {
    const { completeOnboarding } = useUser();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubscribe = async () => {
        setIsProcessing(true);
        try {
            // Note: Replace with actual RevenueCat implementation later
            // const pkg = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
            // await Purchases.purchasePackage(pkg);

            // Simulating a successful purchase for now
            await new Promise(resolve => setTimeout(resolve, 1500));

            await completeOnboarding();
            // UserContext state update will trigger layout redirect
        } catch (e) {
            console.error("Subscription Error:", e);
            // Handle error UI if needed
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top || 40, paddingBottom: insets.bottom || 20 }]}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Unlock Your Full Potential</Text>
                    <Text style={styles.subtitle}>Get the premium tools you need to crush your fitness goals.</Text>
                </View>

                {/* Pricing Toggle */}
                <View style={styles.toggleContainer}>
                    <View style={styles.toggleBg}>
                        {/* Animated slider background could go here, using simple buttons for now */}
                        <TouchableOpacity
                            style={[styles.toggleButton, selectedPlan === 'monthly' && styles.toggleButtonActive]}
                            onPress={() => setSelectedPlan('monthly')}
                        >
                            <Text style={[styles.toggleText, selectedPlan === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toggleButton, selectedPlan === 'yearly' && styles.toggleButtonActive]}
                            onPress={() => setSelectedPlan('yearly')}
                        >
                            <Text style={[styles.toggleText, selectedPlan === 'yearly' && styles.toggleTextActive]}>Yearly</Text>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeText}>Save 38%</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Price Display */}
                <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                        {selectedPlan === 'yearly' ? '$89.00' : '$11.99'}
                    </Text>
                    <Text style={styles.pricePeriod}>
                        /{selectedPlan === 'yearly' ? 'year' : 'month'}
                    </Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresContainer}>
                    {FEATURES.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <View style={styles.iconContainer}>
                                <Check size={20} color="#bef264" strokeWidth={3} />
                            </View>
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>

                {/* Disclaimer/Terms */}
                <Text style={styles.disclaimerText}>
                    By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
                </Text>

            </ScrollView>

            {/* Sticky Subscribe Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.subscribeButton, isProcessing && { opacity: 0.7 }]}
                    onPress={handleSubscribe}
                    disabled={isProcessing}
                >
                    <Text style={styles.subscribeButtonText}>
                        {isProcessing ? 'Processing...' : 'Subscribe & Continue'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 24,
    },
    toggleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    toggleBg: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 30,
        padding: 4,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        width: '100%',
        maxWidth: 340,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 26,
        position: 'relative',
    },
    toggleButtonActive: {
        backgroundColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '700',
    },
    toggleTextActive: {
        color: '#fff',
    },
    badgeContainer: {
        position: 'absolute',
        top: -12,
        right: -5,
        backgroundColor: '#bef264',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0a0a0a',
        zIndex: 10,
    },
    badgeText: {
        color: '#0a0a0a',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 30,
    },
    priceText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
    },
    pricePeriod: {
        fontSize: 18,
        color: '#9ca3af',
        fontWeight: '600',
        marginLeft: 4,
    },
    featuresContainer: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(190, 242, 100, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        marginTop: 2,
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        color: '#e5e7eb',
        lineHeight: 24,
        fontWeight: '500',
    },
    disclaimerText: {
        fontSize: 12,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 10,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
    },
    subscribeButton: {
        backgroundColor: '#bef264',
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#bef264',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    subscribeButtonText: {
        color: '#0a0a0a',
        fontSize: 18,
        fontWeight: '800',
    },
});
