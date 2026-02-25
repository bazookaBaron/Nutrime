import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, CheckCircle, Clock, Flame, X, RotateCcw, Plus, Calendar } from 'lucide-react-native';
import { useUser } from '@/context/UserContext';
import SuccessModal from '@/components/SuccessModal';

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
        targetDuration: params.duration_minutes ? parseFloat(params.duration_minutes as string) : 10,
        equipment: params.equipment as string,
        id: params.instance_id as string || params.name as string,
        day_number: params.day_number ? parseInt(params.day_number as string) : null,
        mode: params.mode as string || 'Gym',
        exerciseType: params.exerciseType as string || 'Duration',
        sets: params.sets ? parseInt(params.sets as string) : 3,
        completed_sets: params.completed_sets ? parseInt(params.completed_sets as string) : 0,
        reps: params.reps as string || "10-12",
    };

    const isSetRep = exercise.exerciseType === 'Set/Rep';
    const videoId = getVideoId(exercise.videoLink);
    const [playing, setPlaying] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [videoReady, setVideoReady] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const startTimeRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef(0);

    // Set/Rep state
    const [currentSet, setCurrentSet] = useState(exercise.completed_sets + 1);
    const [completedSets, setCompletedSets] = useState(exercise.completed_sets);

    // Timer logic with high precision using requestAnimationFrame (Only for Duration type)
    useEffect(() => {
        if (isSetRep) return;

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
    }, [isActive, isSetRep]);

    // Calorie calculation
    useEffect(() => {
        // Formula: Kcal = MET * Weight(kg) * Duration(hr)
        if (userProfile?.weight) {
            let hours = 0;
            if (isSetRep) {
                // If it's sets/reps, scale the target duration by the percentage of sets completed
                const targetHours = exercise.targetDuration / 60;
                hours = (completedSets / exercise.sets) * targetHours;
            } else {
                hours = elapsedMs / (1000 * 3600);
            }
            const burned = exercise.met * userProfile.weight * hours;
            setCaloriesBurned(burned);
        }
    }, [elapsedMs, exercise.met, userProfile?.weight, isSetRep, completedSets, exercise.sets, exercise.targetDuration]);

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

    const handleLogSet = async () => {
        if (completedSets < exercise.sets) {
            const nextCompleted = completedSets + 1;
            setCompletedSets(nextCompleted);

            // Persist progress immediately to DB
            if (exercise.day_number && exercise.id) {
                await completeExercise(exercise.day_number, exercise.id, exercise.mode, null, nextCompleted);
            }

            if (currentSet < exercise.sets) {
                setCurrentSet(prev => prev + 1);
            }
        }
    };

    const handleComplete = async () => {
        setIsActive(false);
        setPlaying(false);

        if (exercise.day_number && exercise.id) {
            // For Set/Rep, ensure completedSets is sent. For Duration, we might want to mark as "1 set" done if finished.
            const setsToReport = isSetRep ? completedSets : 1;
            await completeExercise(exercise.day_number, exercise.id, exercise.mode, caloriesBurned, setsToReport);
        }
        setShowSuccessModal(true);
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        router.back();
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
                    <View style={styles.creditBlock}>
                        <Text style={styles.creditText}>Video credit: Content Creator via YouTube</Text>
                    </View>
                </View>
            ) : (
                <View style={[styles.videoContainer, styles.noVideo]}>
                    <Text style={styles.noVideoText}>No Video Available</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}>

                {isSetRep ? (
                    <View style={styles.timerCard}>
                        <View style={styles.setRow}>
                            <View style={styles.setCol}>
                                <Text style={styles.timerLabel}>CURRENT SET</Text>
                                <Text style={styles.timerValue}>{completedSets === exercise.sets ? 'DONE' : `${currentSet} / ${exercise.sets}`}</Text>
                            </View>
                            <View style={styles.setCol}>
                                <Text style={styles.timerLabel}>TARGET REPS</Text>
                                <Text style={styles.timerValue}>{exercise.reps}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.logSetBtn,
                                completedSets === exercise.sets && styles.logSetBtnDone
                            ]}
                            onPress={handleLogSet}
                            disabled={completedSets === exercise.sets}
                        >
                            <Plus size={20} color="#000" />
                            <Text style={styles.logSetText}>
                                {completedSets === exercise.sets ? 'All Sets Logged' : `Log Set ${currentSet}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
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
                )}

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Flame size={24} color="#FF6B6B" />
                        <Text style={styles.statValue}>{caloriesBurned.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>KCAL BURNED</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Clock size={24} color="#bef264" />
                        <Text style={styles.statValue}>
                            {exercise.targetDuration < 1
                                ? `${(exercise.targetDuration * 60).toFixed(0)}s`
                                : `${exercise.targetDuration.toFixed(1)}m`}
                        </Text>
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

            <SuccessModal
                visible={showSuccessModal}
                title="Workout Complete!"
                caloriesBurned={caloriesBurned.toFixed(1)}
                onClose={handleCloseModal}
            />
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
    creditBlock: {
        position: 'absolute',
        bottom: -20,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    creditText: {
        fontSize: 9,
        color: '#DDD',
    },
    content: {
        padding: 20,
        paddingTop: 30,
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
        fontSize: 48, // Reduced from 64 for dual col
        fontWeight: 'bold',
        color: '#FFF',
        fontVariant: ['tabular-nums'],
        marginBottom: 16,
    },
    setRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    setCol: {
        alignItems: 'center',
    },
    logSetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#bef264',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    logSetBtnDone: {
        backgroundColor: '#3b82f6',
    },
    logSetText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
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
        backgroundColor: '#bef264',
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
        backgroundColor: '#bef264',
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
