import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useChallenges } from '../../context/ChallengesContext';
import { Calendar, ChevronLeft, Target, Timer, Trophy } from 'lucide-react-native';

export default function CreateChallengeScreen() {
    const router = useRouter();
    const { createChallenge } = useChallenges();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        type: '', // steps | calories | custom | sleep | water
        target_value: '',
        duration_days: '7',
        difficulty: 'medium' as 'easy' | 'medium' | 'hard'
    });

    const difficultyXpMap: { [key: string]: number } = {
        easy: 200,
        medium: 350,
        hard: 500
    };

    const handleSubmit = async () => {
        // Validation
        if (!form.title.trim()) {
            Alert.alert('Error', 'Please enter a challenge title');
            return;
        }
        if (form.title.length > 50) {
            Alert.alert('Error', 'Title must be 50 characters or less');
            return;
        }
        if (!form.description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }
        if (form.description.length > 200) {
            Alert.alert('Error', 'Description must be 200 characters or less');
            return;
        }

        if (!form.type) {
            Alert.alert('Error', 'Please select a challenge category');
            return;
        }

        // Target value validation
        let finalTarget = parseFloat(form.target_value);
        if (form.type !== 'custom') {
            if (isNaN(finalTarget) || finalTarget <= 0) {
                Alert.alert('Error', 'Please enter a valid target value');
                return;
            }

            // Category specific limits
            if (form.type === 'steps' && finalTarget > 50000) {
                Alert.alert('Error', 'Steps target cannot exceed 50,000');
                return;
            }
            if (form.type === 'calories' && finalTarget > 10000) {
                Alert.alert('Error', 'Calories target cannot exceed 10,000 kcal');
                return;
            }
            if (form.type === 'sleep' && finalTarget > 12) {
                Alert.alert('Error', 'Sleep target cannot exceed 12 hours');
                return;
            }
            if (form.type === 'water' && finalTarget > 20) {
                Alert.alert('Error', 'Water target cannot exceed 20 L');
                return;
            }
        } else {
            // For custom, target is the duration (number of manual checks needed)
            finalTarget = parseInt(form.duration_days);
        }

        const duration = parseInt(form.duration_days);
        if (isNaN(duration) || duration <= 0 || duration > 365) {
            Alert.alert('Error', 'Duration must be between 1 and 365 days');
            return;
        }

        setLoading(true);
        try {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + duration);

            await createChallenge({
                title: form.title.trim(),
                description: form.description.trim(),
                type: form.type,
                target_value: finalTarget,
                duration_days: duration,
                xp_reward: difficultyXpMap[form.difficulty],
                start_time: now.toISOString(),
                end_time: endDate.toISOString(),
            });

            Alert.alert('Success', 'Challenge created! You have been automatically joined.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/challenges') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to create challenge');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/challenges')} style={styles.backButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Challenge</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Challenge Title</Text>
                        <Text style={styles.charCounter}>{form.title.length}/50</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 30 Minute Run"
                        placeholderTextColor="#6b7280"
                        value={form.title}
                        maxLength={50}
                        onChangeText={t => setForm(prev => ({ ...prev, title: t }))}
                    />
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.charCounter}>{form.description.length}/200</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Explain the rules..."
                        placeholderTextColor="#6b7280"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                        value={form.description}
                        onChangeText={t => setForm(prev => ({ ...prev, description: t }))}
                    />
                </View>

                <View style={[styles.formGroup]}>
                    <Text style={styles.label}>Category <Text style={{ color: '#ef4444' }}>*</Text></Text>
                    <View style={styles.typeSelector}>
                        {['steps', 'calories', 'custom', 'sleep', 'water'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.typeOption, form.type === t && styles.activeType]}
                                onPress={() => setForm(prev => ({ ...prev, type: t }))}
                            >
                                <Text style={[styles.typeText, form.type === t && styles.activeTypeText]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={[styles.formGroup]}>
                    <Text style={styles.label}>Difficulty</Text>
                    <View style={styles.typeSelector}>
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.typeOption, form.difficulty === d && styles.activeDifficulty]}
                                onPress={() => setForm(prev => ({ ...prev, difficulty: d }))}
                            >
                                <Text style={[styles.typeText, form.difficulty === d && styles.activeTypeText]}>
                                    {d.charAt(0).toUpperCase() + d.slice(1)} ({difficultyXpMap[d]} XP)
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.row}>
                    {form.type !== 'custom' && (
                        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Target Value</Text>
                            <View style={styles.inputWithUnit}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    placeholder={form.type === 'water' ? "e.g. 3.0" : "e.g. 10000"}
                                    placeholderTextColor="#6b7280"
                                    keyboardType="numeric"
                                    value={form.target_value}
                                    onChangeText={t => setForm(prev => ({ ...prev, target_value: t }))}
                                />
                                {form.type && (
                                    <Text style={styles.unitLabel}>
                                        {form.type === 'water' ? 'L' :
                                            form.type === 'calories' ? 'kcal' :
                                                form.type === 'steps' ? 'steps' :
                                                    form.type === 'sleep' ? 'hrs' : ''}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Duration (Days)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 7"
                            placeholderTextColor="#6b7280"
                            keyboardType="numeric"
                            value={form.duration_days}
                            onChangeText={t => setForm(prev => ({ ...prev, duration_days: t }))}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Challenge</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#d1d5db',
        fontWeight: '600',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    charCounter: {
        color: '#6b7280',
        fontSize: 12,
    },
    input: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#374151',
        fontSize: 16,
        marginBottom: 20,
    },
    inputWithUnit: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
        marginBottom: 20,
        paddingRight: 16,
    },
    unitLabel: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    typeOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#1f2937',
        borderWidth: 1,
        borderColor: '#374151',
    },
    activeType: {
        backgroundColor: '#bef264',
        borderColor: '#bef264',
    },
    activeDifficulty: {
        backgroundColor: '#fbbf24', // Amber for difficulty
        borderColor: '#fbbf24',
    },
    typeText: {
        color: '#9ca3af',
        fontSize: 12,
    },
    activeTypeText: {
        color: '#000',
        fontWeight: 'bold',
    },
    createButton: {
        backgroundColor: '#bef264',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    createButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
