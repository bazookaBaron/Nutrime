import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { Check, ArrowRight } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

export default function Step4Result() {
    const { nutritionTargets, completeOnboarding, userProfile } = useUser();
    const router = useRouter();
    const posthog = usePostHog();
    const [isFinishing, setIsFinishing] = React.useState(false);

    const handleFinish = async () => {
        setIsFinishing(true);
        posthog.capture('onboarding_completed', {
            goal: userProfile?.goal,
            daily_calories_target: nutritionTargets.calories,
            activity_level: userProfile?.activity_level,
            target_duration_weeks: userProfile?.target_duration_weeks,
        });
        try {
            await completeOnboarding();
            // We intentionally do not call router.replace() here.
            // _layout.tsx will detect that hasCompletedOnboarding is true and auto-route to /(tabs)
        } catch (e) {
            console.error(e);
            setIsFinishing(false);
        }
    };

    const { calories, mealSplit } = nutritionTargets;

    // Calculate daily burn target based on user goal
    const calculateDailyBurn = () => {
        if (!userProfile) return 0;

        const weightDiff = Math.abs((userProfile.weight || 70) - (userProfile.target_weight || 70));
        const durationWeeks = userProfile.target_duration_weeks || 4;
        const durationDays = durationWeeks * 7;

        // 1 kg = 7700 kcal
        const totalCaloriesDiff = weightDiff * 7700;
        const dailyBurn = Math.round(totalCaloriesDiff / durationDays);

        // Cap between 200-1000 kcal
        return Math.max(200, Math.min(1000, dailyBurn));
    };

    const dailyBurnTarget = calculateDailyBurn();

    return (
        <View style={styles.container}>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={styles.successIcon}>
                        <Check size={40} color="#0a0a0a" />
                    </View>
                    <Text style={styles.title}>Your Plan is Ready!</Text>
                    <Text style={styles.subtitle}>Based on your goals and stats, here are your daily targets.</Text>
                </View>

                <View style={styles.targetsRow}>
                    <View style={[styles.targetCard, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.cardLabel}>Daily Intake</Text>
                        <Text style={styles.cardValue}>{calories}</Text>
                        <Text style={styles.cardUnit}>kcal</Text>
                    </View>

                    <View style={[styles.targetCard, { flex: 1, marginLeft: 8, borderColor: '#3f3f46' }]}>
                        <Text style={styles.cardLabel}>Daily Burn</Text>
                        <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{dailyBurnTarget}</Text>
                        <Text style={styles.cardUnit}>kcal</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Meal Breakdown</Text>
                <View style={styles.mealContainer}>
                    <MealRow
                        label="Breakfast"
                        calories={Math.round(calories * mealSplit.breakfast)}
                        color="#0369a1"
                        percent="25%"
                    />
                    <MealRow
                        label="Lunch"
                        calories={Math.round(calories * mealSplit.lunch)}
                        color="#b45309"
                        percent="35%"
                    />
                    <MealRow
                        label="Snacks"
                        calories={Math.round(calories * mealSplit.snack)}
                        color="#be185d"
                        percent="10%"
                    />
                    <MealRow
                        label="Dinner"
                        calories={Math.round(calories * mealSplit.dinner)}
                        color="#15803d"
                        percent="30%"
                    />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, isFinishing && { opacity: 0.7 }]}
                    onPress={handleFinish}
                    disabled={isFinishing}
                >
                    <Text style={styles.buttonText}>
                        {isFinishing ? 'Preparing your plan...' : 'Start Tracking'}
                    </Text>
                    {!isFinishing && <ArrowRight size={20} color="#000" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const MealRow = ({ label, calories, color, percent }) => (
    <View style={styles.mealRow}>
        <View style={[styles.mealIcon, { backgroundColor: color }]}>
            <Text style={[styles.mealPercent, { color: '#fff' }]}>{percent}</Text>
        </View>
        <View style={styles.mealInfo}>
            <Text style={styles.mealLabel}>{label}</Text>
            <Text style={styles.mealCalories}>{calories} - {calories + 100} kcal</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    content: {
        padding: 24,
        paddingTop: 80,
        paddingBottom: 100,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#bef264',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#bef264',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    targetsRow: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 20,
    },
    targetCard: {
        backgroundColor: '#1a1a1a',
        width: '100%',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    cardLabel: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cardValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    cardUnit: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '500',
    },
    sectionTitle: {
        width: '100%',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        paddingLeft: 5,
    },
    mealContainer: {
        width: '100%',
        gap: 15,
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 16,
    },
    mealIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    mealPercent: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
    },
    mealInfo: {
        flex: 1,
    },
    mealLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    mealCalories: {
        fontSize: 14,
        color: '#6b7280',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#0a0a0a',
    },
    button: {
        backgroundColor: '#bef264',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
