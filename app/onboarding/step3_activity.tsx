import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { ArrowLeft, ArrowRight, Battery, BatteryCharging, BatteryFull, Zap } from 'lucide-react-native';

const activities = [
    { id: 'sedentary', title: 'Sedentary', description: 'Little or no exercise', icon: Battery, color: '#fee2e2' },
    { id: 'lightly_active', title: 'Lightly Active', description: 'Exercise 1-3 times/week', icon: BatteryCharging, color: '#fef3c7' },
    { id: 'moderately_active', title: 'Moderately Active', description: 'Exercise 4-5 times/week', icon: BatteryFull, color: '#e0f2fe' },
    { id: 'very_active', title: 'Very Active', description: 'Daily exercise or intense job', icon: Zap, color: '#dcfce7' },
];

export default function Step3Activity() {
    const [selectedActivity, setSelectedActivity] = useState(null);
    const { updateProfile } = useUser();
    const router = useRouter();

    const handleNext = () => {
        if (selectedActivity) {
            updateProfile({ activity: selectedActivity });
            router.push('/onboarding/step3b_target');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step 3 of 4</Text>
                <Text style={styles.skipText}>    </Text>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '75%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>How active are you?</Text>
                <Text style={styles.subtitle}>We use this to calculate your daily energy expenditure.</Text>

                <View style={styles.optionsContainer}>
                    {activities.map((activity) => {
                        const Icon = activity.icon;
                        const isSelected = selectedActivity === activity.id;
                        return (
                            <TouchableOpacity
                                key={activity.id}
                                style={[
                                    styles.optionCard,
                                    isSelected && styles.optionCardSelected
                                ]}
                                onPress={() => setSelectedActivity(activity.id)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: activity.color }]}>
                                    <Icon size={24} color="#1f2937" opacity={0.8} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.optionTitle}>{activity.title}</Text>
                                    <Text style={styles.optionDesc}>{activity.description}</Text>
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
                    style={[styles.button, !selectedActivity && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!selectedActivity}
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
        backgroundColor: '#1f2937',
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
