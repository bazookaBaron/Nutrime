import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { CheckCircle, Circle, RefreshCw, Play } from 'lucide-react-native';

interface Exercise {
    name: string;
    bodyArea: string;
    level: string;
    predicted_calories_burn: number;
    duration_minutes: number;
    equipment: string;
    instance_id?: string;
    videoLink?: string;
}

interface ExerciseCardProps {
    exercise: Exercise;
    onComplete: () => void;
    onReplace?: () => void;
    onStart?: () => void;
    isCompleted: boolean;
    disabled?: boolean;
}

const getVideoId = (url: string | undefined) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const ExerciseCard = ({ exercise, onComplete, onReplace, onStart, isCompleted, disabled }: ExerciseCardProps) => {
    const videoId = getVideoId(exercise.videoLink);
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

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

            {thumbnailUrl && (
                <View style={styles.thumbnailContainer}>
                    <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
                </View>
            )}

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
                    style={[styles.actionBtn, styles.replaceBtn, (disabled || isCompleted) && { opacity: 0.5 }]}
                    onPress={onReplace}
                    disabled={disabled || isCompleted}
                >
                    <RefreshCw size={14} color="#FFF" />
                    <Text style={styles.actionBtnText}>Replace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.startBtn, (disabled || isCompleted) && { opacity: 0.5 }]}
                    disabled={disabled || isCompleted}
                    onPress={onStart}
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
    thumbnailContainer: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#000',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        opacity: 0.6,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
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
