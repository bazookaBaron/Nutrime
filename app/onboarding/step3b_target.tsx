import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

export default function Step3bTarget() {
    const [targetWeight, setTargetWeight] = useState('');
    const [durationWeeks, setDurationWeeks] = useState('');

    const { userProfile, updateProfile } = useUser();
    const router = useRouter();

    const currentWeight = userProfile?.weight || 0;

    const handleNext = () => {
        if (!targetWeight || !durationWeeks) return;

        // Basic validation
        const tWeight = parseFloat(targetWeight);
        const weeks = parseFloat(durationWeeks);

        if (isNaN(tWeight) || isNaN(weeks) || weeks <= 0) {
            Alert.alert("Invalid Input", "Please enter valid numbers.");
            return;
        }

        // Safety check for extreme goals (e.g. losing > 1kg per week)
        const weightDiff = currentWeight - tWeight;
        const weeklyChange = weightDiff / weeks;

        if (Math.abs(weeklyChange) > 1.5) {
            Alert.alert(
                "Aggressive Goal Warning",
                `This plan implies changing your weight by ${Math.abs(weeklyChange).toFixed(1)}kg per week. A safe rate is usually 0.5-1.0kg per week. Are you sure?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Yes, Proceed",
                        onPress: () => submitData(tWeight, weeks)
                    }
                ]
            );
        } else {
            submitData(tWeight, weeks);
        }
    };

    const submitData = (tWeight: number, weeks: number) => {
        updateProfile({
            target_weight: tWeight,
            target_duration_weeks: weeks
        });
        router.push('/onboarding/step4_result');
    };

    const isFormValid = targetWeight.length > 0 && durationWeeks.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step 4 of 5</Text>
                <Text style={styles.skipText}>    </Text>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '85%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Set your Goal</Text>
                <Text style={styles.subtitle}>Current Weight: {currentWeight} kg</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Target Weight (kg)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={currentWeight ? `${currentWeight - 5}` : "65"}
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={targetWeight}
                        onChangeText={setTargetWeight}
                    />
                    <Text style={styles.helperText}>
                        {targetWeight && currentWeight ? (
                            parseFloat(targetWeight) < currentWeight
                                ? `Lose ${(currentWeight - parseFloat(targetWeight)).toFixed(1)} kg`
                                : parseFloat(targetWeight) > currentWeight
                                    ? `Gain ${(parseFloat(targetWeight) - currentWeight).toFixed(1)} kg`
                                    : "Maintain Weight"
                        ) : "Enter your dream weight"}
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Duration (weeks)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="12"
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={durationWeeks}
                        onChangeText={setDurationWeeks}
                    />
                    <Text style={styles.helperText}>
                        Typical safe duration: 12-24 weeks
                    </Text>
                </View>

                {isFormValid && currentWeight > 0 && (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Plan Preview</Text>
                        <Text style={styles.summaryText}>
                            To reach {targetWeight}kg in {durationWeeks} weeks, you need to change by approx{' '}
                            <Text style={{ fontWeight: 'bold', color: '#bef264' }}>
                                {Math.abs((currentWeight - parseFloat(targetWeight)) / parseFloat(durationWeeks)).toFixed(2)} kg/week
                            </Text>
                        </Text>
                    </View>
                )}

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, !isFormValid && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!isFormValid}
                >
                    <Text style={[styles.buttonText, !isFormValid && { color: '#6b7280' }]}>Calculate Plan</Text>
                    <ArrowRight size={20} color={!isFormValid ? '#6b7280' : '#000'} />
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
    },
    inputGroup: {
        marginBottom: 25,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
    },
    helperText: {
        marginTop: 6,
        fontSize: 14,
        color: '#6b7280',
    },
    summaryCard: {
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        marginTop: 10,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#bef264',
        marginBottom: 4,
    },
    summaryText: {
        fontSize: 14,
        color: '#d1d5db',
        lineHeight: 20,
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
