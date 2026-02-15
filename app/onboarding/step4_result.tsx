import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ArrowRight } from 'lucide-react-native';

export default function Step4Result() {
    const { nutritionTargets, completeOnboarding } = useUser();
    const router = useRouter();

    const handleFinish = async () => {
        await completeOnboarding();
        router.replace('/(tabs)');
    };

    const { calories, mealSplit } = nutritionTargets;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#f7fee7', '#fff']}
                style={styles.background}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={styles.successIcon}>
                        <Check size={40} color="#fff" />
                    </View>
                    <Text style={styles.title}>Your Plan is Ready!</Text>
                    <Text style={styles.subtitle}>Based on your goals and stats, here is your daily nutritional target.</Text>
                </View>

                <View style={styles.targetCard}>
                    <Text style={styles.cardLabel}>Daily Target</Text>
                    <Text style={styles.cardValue}>{calories}</Text>
                    <Text style={styles.cardUnit}>Calories / Day</Text>
                </View>

                <Text style={styles.sectionTitle}>Meal Breakdown</Text>
                <View style={styles.mealContainer}>
                    <MealRow
                        label="Breakfast"
                        calories={Math.round(calories * mealSplit.breakfast)}
                        color="#e0f2fe"
                        percent="25%"
                    />
                    <MealRow
                        label="Lunch"
                        calories={Math.round(calories * mealSplit.lunch)}
                        color="#fef3c7"
                        percent="35%"
                    />
                    <MealRow
                        label="Snacks"
                        calories={Math.round(calories * mealSplit.snack)}
                        color="#fce7f3"
                        percent="10%"
                    />
                    <MealRow
                        label="Dinner"
                        calories={Math.round(calories * mealSplit.dinner)}
                        color="#dcfce7"
                        percent="30%"
                    />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handleFinish}>
                    <Text style={styles.buttonText}>Start Tracking</Text>
                    <ArrowRight size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const MealRow = ({ label, calories, color, percent }) => (
    <View style={styles.mealRow}>
        <View style={[styles.mealIcon, { backgroundColor: color }]}>
            <Text style={styles.mealPercent}>{percent}</Text>
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
        backgroundColor: '#fff',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '40%',
    },
    content: {
        padding: 24,
        paddingTop: 80,
        paddingBottom: 100,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#bef264',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#bef264',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
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
    targetCard: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f3f4f6',
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
        fontSize: 56,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 5,
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
        color: '#1f2937',
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
        backgroundColor: '#f9fafb',
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
        color: '#1f2937',
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
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
