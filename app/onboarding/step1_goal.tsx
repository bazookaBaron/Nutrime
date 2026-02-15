import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Target, TrendingUp, Heart, Zap } from 'lucide-react-native';

const goals = [
    { id: 'lose_weight', title: 'Lose Weight', description: 'Get leaner and fitter', icon: Target, color: '#fee2e2' },
    { id: 'build_muscle', title: 'Build Muscle', description: 'Gain strength & mass', icon: TrendingUp, color: '#f3e8ff' },
    { id: 'maintain', title: 'Maintain Health', description: 'Stay active & healthy', icon: Heart, color: '#e0f2fe' },
    { id: 'improve_perf', title: 'Improve Performance', description: 'Enhance athletic ability', icon: Zap, color: '#fef3c7' },
];

export default function Step1Goal() {
    const [selectedGoal, setSelectedGoal] = useState(null);
    const { updateProfile } = useUser();
    const router = useRouter();

    const handleNext = () => {
        if (selectedGoal) {
            updateProfile({ goal: selectedGoal });
            router.push('/onboarding/step2_stats');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step 1 of 4</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '25%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>What is your primary goal?</Text>
                <Text style={styles.subtitle}>This helps us personalize your daily nutrition plan.</Text>

                <View style={styles.optionsContainer}>
                    {goals.map((goal) => {
                        const Icon = goal.icon;
                        const isSelected = selectedGoal === goal.id;
                        return (
                            <TouchableOpacity
                                key={goal.id}
                                style={[
                                    styles.optionCard,
                                    isSelected && styles.optionCardSelected
                                ]}
                                onPress={() => setSelectedGoal(goal.id)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: goal.color }]}>
                                    <Icon size={24} color="#1f2937" opacity={0.8} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.optionTitle}>{goal.title}</Text>
                                    <Text style={styles.optionDesc}>{goal.description}</Text>
                                </View>
                                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, !selectedGoal && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!selectedGoal}
                >
                    <Text style={styles.buttonText}>Continue</Text>
                    <ArrowRight size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    backButton: {
        padding: 8,
    },
    stepText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    skipText: {
        fontSize: 14,
        color: '#6b7280',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 30,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#bef264', // Lime green
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 30,
        lineHeight: 24,
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    optionCardSelected: {
        borderColor: '#bef264', // Lime green
        backgroundColor: '#f7fee7',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 14,
        color: '#6b7280',
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#bef264',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#bef264',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    button: {
        backgroundColor: '#1f2937', // Dark/Black button
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonDisabled: {
        backgroundColor: '#d1d5db',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
