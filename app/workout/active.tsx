import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, CheckCircle, Clock, Flame, X, RotateCcw } from 'lucide-react-native';
import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

// Helper to extract video ID from URL
const getVideoId = (url: string | undefined) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function ActiveWorkoutScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { userProfile, completeExercise } = useUser();

    // Parse params - we expect the exercise object to be passed as params
    // Note: complex objects are stringified in params, but if passed individually they are strings.
    // Ideally we pass an ID and look it up, but for now we'll rely on passed data.
    // We'll try to reconstruct the exercise object from params.

    const exercise = {
        name: params.name as string,
        videoLink: params.videoLink as string,
        met: params.met ? parseFloat(params.met as string) : 5, // Default MET if missing
        description: params.description as string,
        targetDuration: params.duration_minutes ? parseInt(params.duration_minutes as string) : 10,
        equipment: params.equipment as string,
        id: params.instance_id as string || params.name as string,
        day_number: params.day_number ? parseInt(params.day_number as string) : null,
        mode: params.mode as string || 'Gym',
    };

    const videoId = getVideoId(exercise.videoLink);
    const [playing, setPlaying] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [videoReady, setVideoReady] = useState(false);

    const startTimeRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef(0);

    // Timer logic with high precision using requestAnimationFrame
    useEffect(() => {
        let animationFrameId: number;

        const tick = () => {
            if (startTimeRef.current !== null) {
                setElapsedMs(accumulatedTimeRef.current + (Date.now() - startTimeRef.current));
                animationFrameId = requestAnimationFrame(tick);
            }
        };

        if (isActive) {
            startTimeRef.current = Date.now();
            animationFrameId = requestAnimationFrame(tick);
        } else {
            if (startTimeRef.current !== null) {
                accumulatedTimeRef.current += Date.now() - startTimeRef.current;
            }
            startTimeRef.current = null;
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isActive]);

    // Calorie calculation
    useEffect(() => {
        // Formula: Kcal = MET * Weight(kg) * Duration(hr)
        if (userProfile?.weight) {
            const hours = elapsedMs / (1000 * 3600);
            const burned = exercise.met * userProfile.weight * hours;
            setCaloriesBurned(burned);
        }
    }, [elapsedMs, exercise.met, userProfile?.weight]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const handleStateChange = useCallback((state: string) => {
        if (state === "ended") {
            setPlaying(false);
        }
    }, []);

    const formatTime = (totalMs: number) => {
        const mins = Math.floor(totalMs / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const centis = Math.floor((totalMs % 1000) / 10);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
    };

    const handleComplete = async () => {
        setIsActive(false);
        setPlaying(false);

        if (exercise.day_number && exercise.id) {
            await completeExercise(exercise.day_number, exercise.id, exercise.mode);
            Alert.alert("Great Job!", `You burned ${caloriesBurned.toFixed(1)} kcal!`, [
                { text: "OK", onPress: () => router.back() }
            ]);
        } else {
            Alert.alert("Completed", "Exercise marked as done!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <X size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            {videoId ? (
                <View style={styles.videoContainer}>
                    <YoutubePlayer
                        height={220}
                        play={playing}
                        videoId={videoId}
                        onChangeState={handleStateChange}
                        onReady={() => setVideoReady(true)}
                    />
                </View>
            ) : (
                <View style={[styles.videoContainer, styles.noVideo]}>
                    <Text style={styles.noVideoText}>No Video Available</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.timerCard}>
                    <Text style={styles.timerLabel}>DURATION</Text>
                    <Text style={styles.timerValue}>{formatTime(elapsedMs)}</Text>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity style={styles.controlBtn} onPress={toggleTimer}>
                            {isActive ? <Pause size={32} color="#000" fill="#000" /> : <Play size={32} color="#000" fill="#000" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#333' }]} onPress={() => {
                            setElapsedMs(0);
                            accumulatedTimeRef.current = 0;
                            setIsActive(false);
                            setPlaying(false);
                        }}>
                            <RotateCcw size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Flame size={24} color="#FF6B6B" />
                        <Text style={styles.statValue}>{caloriesBurned.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>KCAL BURNED</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Clock size={24} color="#4ade80" />
                        <Text style={styles.statValue}>{exercise.targetDuration}m</Text>
                        <Text style={styles.statLabel}>TARGET TIME</Text>
                    </View>
                </View>

                <View style={styles.metBox}>
                    <Text style={styles.metText}>Estimated using: Intensity × Weight × Time</Text>
                </View>

                {exercise.equipment && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>EQUIPMENT</Text>
                        <Text style={styles.infoText}>{exercise.equipment}</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                    <CheckCircle size={24} color="#000" />
                    <Text style={styles.completeBtnText}>MARK AS DONE</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        flex: 1,
        textAlign: 'center',
    },
    closeBtn: {
        padding: 8,
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        marginBottom: 16,
    },
    noVideo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noVideoText: {
        color: '#666',
    },
    content: {
        padding: 20,
        gap: 20,
    },
    timerCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    timerLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 1,
    },
    timerValue: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#FFF',
        fontVariant: ['tabular-nums'],
        marginBottom: 24,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    controlBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4ade80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    infoLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '700',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 16,
        color: '#DDD',
    },
    completeBtn: {
        backgroundColor: '#4ade80',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginTop: 10,
    },
    completeBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    metBox: {
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        borderColor: 'rgba(250, 204, 21, 0.5)',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: '100%',
    },
    metText: {
        fontSize: 10,
        color: 'rgba(250, 204, 21, 0.8)',
        fontWeight: '600',
        textAlign: 'left',
    },
});
