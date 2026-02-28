import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { ArrowLeft, ArrowRight, Target, TrendingUp, Heart, Zap } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

const goals = [
    { id: 'lose_weight', title: 'Lose Weight', description: 'Get leaner and fitter', icon: Target, color: '#ffb3b3' },
    { id: 'build_muscle', title: 'Build Muscle', description: 'Gain strength & mass', icon: TrendingUp, color: '#eabfff' },
    { id: 'maintain', title: 'Maintain Health', description: 'Stay active & healthy', icon: Heart, color: '#bae6fd' },
    { id: 'improve_perf', title: 'Improve Performance', description: 'Enhance athletic ability', icon: Zap, color: '#fde68a' },
];

export default function Step1Goal() {
    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const { updateProfile } = useUser();
    const router = useRouter();
    const posthog = usePostHog();

    const handleNext = () => {
        if (selectedGoal) {
            posthog.capture('onboarding_goal_selected', {
                goal: selectedGoal,
                onboarding_step: 1,
            });
            updateProfile({ goal: selectedGoal });
            router.push('/onboarding/step2_stats');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
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
                                    <Icon size={24} color="#0a0a0a" opacity={0.9} />
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
                    <Text style={[styles.buttonText, !selectedGoal && { color: '#6b7280' }]}>Continue</Text>
                    <ArrowRight size={20} color={!selectedGoal ? '#6b7280' : '#000'} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
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
        backgroundColor: '#1a1a1a',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 30,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#bef264',
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
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
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    optionCardSelected: {
        borderColor: '#bef264',
        backgroundColor: 'rgba(190, 242, 100, 0.05)',
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
        color: '#fff',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 14,
        color: '#9ca3af',
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#374151',
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
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
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
    buttonDisabled: {
        backgroundColor: '#1a1a1a',
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
