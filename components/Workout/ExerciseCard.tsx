import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { CheckCircle, Circle, RefreshCw, Play, Flame, Clock, Layers } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Exercise {
    name: string;
    bodyArea: string;
    level: string;
    predicted_calories_burn: number;
    duration_minutes: number;
    equipment: string;
    instance_id?: string;
    videoLink?: string;
    completed_sets?: number;
    predicted_sets?: number;
    actual_calories_burned?: number;
    is_completed?: string;
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

const LEVEL_COLORS: Record<string, string> = {
    Beginner: '#22c55e',
    Intermediate: '#f59e0b',
    Advanced: '#ef4444',
};

const ExerciseCard = ({ exercise, onComplete, onReplace, onStart, isCompleted, disabled }: ExerciseCardProps) => {
    const videoId = getVideoId(exercise.videoLink);
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

    const completedSets = exercise.completed_sets || 0;
    const totalSets = exercise.predicted_sets || 3;
    const isDone = exercise.is_completed === 'true';
    const isPartial = exercise.is_completed === 'partial';
    const hasPartialProgress = isPartial || (completedSets > 0 && completedSets < totalSets);
    const levelColor = LEVEL_COLORS[exercise.level] || '#888';

    const durationLabel = exercise.duration_minutes < 1
        ? `${(exercise.duration_minutes * 60).toFixed(0)}s`
        : `${exercise.duration_minutes.toFixed(1)}m`;

    return (
        <View style={[styles.card, disabled && { opacity: 0.7 }, isDone && styles.cardDone]}>
            {/* Completed shimmer overlay */}
            {isDone && (
                <View style={styles.doneOverlay}>
                    <CheckCircle size={20} color="#bef264" />
                    <Text style={styles.doneText}>Done</Text>
                </View>
            )}

            {/* Thumbnail / video preview */}
            {thumbnailUrl && (
                <View style={styles.thumbnailContainer}>
                    <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.85)']}
                        style={styles.thumbnailGradient}
                    />
                    {/* Progress pill */}
                    {hasPartialProgress && !isDone && (
                        <View style={styles.progressBadge}>
                            <Text style={styles.progressText}>{completedSets}/{totalSets} sets</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
                    <View style={styles.tagsRow}>
                        <Text style={styles.bodyTag}>{exercise.bodyArea}</Text>
                        <View style={[styles.levelTag, { backgroundColor: levelColor + '22', borderColor: levelColor + '55' }]}>
                            <Text style={[styles.levelTagText, { color: levelColor }]}>{exercise.level}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity onPress={onComplete} style={styles.checkButton} disabled={disabled}>
                    {isDone
                        ? <CheckCircle size={26} color="#bef264" />
                        : <Circle size={26} color={disabled ? '#333' : '#555'} />
                    }
                </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Flame size={13} color="#FF6B6B" />
                    <Text style={styles.statValue}>{exercise.predicted_calories_burn}</Text>
                    <Text style={styles.statLabel}>kcal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Clock size={13} color="#60a5fa" />
                    <Text style={styles.statValue}>{durationLabel}</Text>
                    <Text style={styles.statLabel}>time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Layers size={13} color="#a78bfa" />
                    <Text style={styles.statValue}>{totalSets}</Text>
                    <Text style={styles.statLabel}>sets</Text>
                </View>
            </View>

            {/* No thumbnail partial progress */}
            {!thumbnailUrl && hasPartialProgress && !isDone && (
                <View style={styles.textProgressRow}>
                    <Text style={styles.textProgress}>{completedSets}/{totalSets} sets done — keep going!</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.replaceBtn, (disabled || isDone) && { opacity: 0.4 }]}
                    onPress={onReplace}
                    disabled={disabled || isDone}
                >
                    <RefreshCw size={13} color="#AAA" />
                    <Text style={styles.replaceBtnText}>Replace</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.startBtn, (disabled || isDone) && { opacity: 0.4 }]}
                    disabled={disabled || isDone}
                    onPress={onStart}
                >
                    <Play size={13} color="#000" fill="#000" />
                    <Text style={styles.startBtnText}>
                        {hasPartialProgress && !isDone ? 'Continue' : 'Start'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1C1C1C',
        borderRadius: 20,
        padding: 14,
        marginRight: 14,
        width: 268,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        overflow: 'hidden',
    },
    cardDone: {
        borderColor: 'rgba(190,242,100,0.3)',
        backgroundColor: 'rgba(190,242,100,0.04)',
    },
    doneOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(190,242,100,0.12)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        zIndex: 10,
    },
    doneText: {
        color: '#bef264',
        fontSize: 11,
        fontWeight: '700',
    },
    thumbnailContainer: {
        width: '100%',
        height: 118,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#111',
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbnailGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    progressBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#bef264',
    },
    progressText: {
        color: '#bef264',
        fontSize: 10,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 6,
        lineHeight: 20,
    },
    tagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bodyTag: {
        fontSize: 11,
        color: '#888',
        fontWeight: '500',
    },
    levelTag: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    levelTagText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    checkButton: {
        padding: 2,
        marginLeft: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252525',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column',
        gap: 3,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#333',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        fontWeight: '500',
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
        borderRadius: 12,
        gap: 5,
    },
    replaceBtn: {
        backgroundColor: '#252525',
        borderWidth: 1,
        borderColor: '#333',
    },
    startBtn: {
        backgroundColor: '#bef264',
    },
    replaceBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#AAA',
    },
    startBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    textProgressRow: {
        marginBottom: 10,
    },
    textProgress: {
        color: '#bef264',
        fontSize: 11,
        fontWeight: '600',
    },
});

export default ExerciseCard;
