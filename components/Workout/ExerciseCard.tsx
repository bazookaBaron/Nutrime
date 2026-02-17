
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Circle, RefreshCw, Play } from 'lucide-react-native';

interface Exercise {
    name: string;
    bodyArea: string;
    level: string;
    predicted_calories_burn: number;
    duration_minutes: number;
    equipment: string;
    instance_id?: string;
}

interface ExerciseCardProps {
    exercise: Exercise;
    onComplete: () => void;
    onReplace?: () => void;
    isCompleted: boolean;
    disabled?: boolean;
}

const ExerciseCard = ({ exercise, onComplete, onReplace, isCompleted, disabled }: ExerciseCardProps) => {
    return (
        <View style={[styles.card, disabled && { opacity: 0.7 }]}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.details}>
                        {exercise.bodyArea} • {exercise.level}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onComplete}
                    style={styles.checkButton}
                    disabled={disabled}
                >
                    {isCompleted ? (
                        <CheckCircle size={28} color="#4ade80" />
                    ) : (
                        <Circle size={28} color={disabled ? "#444" : "#666"} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Burn</Text>
                    <Text style={styles.statValue}>{exercise.predicted_calories_burn} kcal</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{exercise.duration_minutes} min</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Equipment</Text>
                    <Text style={styles.statValue} numberOfLines={1}>{exercise.equipment}</Text>
                </View>
            </View>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.replaceBtn]}
                    onPress={onReplace}
                    disabled={disabled}
                >
                    <RefreshCw size={14} color="#FFF" />
                    <Text style={styles.actionBtnText}>Replace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.startBtn, { opacity: 0.5 }]}
                    disabled={true}
                    onPress={() => { }}
                >
                    <Play size={14} color="#000" fill="#000" />
                    <Text style={[styles.actionBtnText, { color: '#000' }]}>Start</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        marginRight: 12,
        width: 280, // Fixed width for horizontal scroll
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    details: {
        fontSize: 14,
        color: '#AAA',
    },
    checkButton: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    replaceBtn: {
        backgroundColor: '#333',
    },
    startBtn: {
        backgroundColor: '#4ade80',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default ExerciseCard;
