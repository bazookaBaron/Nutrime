import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '@/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Flame, Dumbbell, Home as HomeIcon, X, RefreshCw } from 'lucide-react-native';
import ExerciseCard from '@/components/Workout/ExerciseCard';
import Leaderboard from '@/components/Workout/Leaderboard';
import { usePostHog } from 'posthog-react-native';
import AnimatedProgressBar from '@/components/AnimatedProgressBar';

const { width } = Dimensions.get('window');

export default function WorkoutScreen() {
    const router = useRouter();
    const { userProfile, workoutSchedule, completeExercise, regenerateFullSchedule, fetchLeaderboard, todayStr } = useUser();
    const posthog = usePostHog();
    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchLeaderboard('city');
        setRefreshing(false);
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchLeaderboard('city');
        }
    }, [isFocused]);

    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [mode, setMode] = useState<'Gym' | 'Home'>('Gym');

    const [replaceModalVisible, setReplaceModalVisible] = useState(false);
    const [exerciseToReplace, setExerciseToReplace] = useState<any>(null);
    const { replaceExercise, gymExercises, homeExercises } = useUser();

    const today = todayStr;

    const sortedSchedule = useMemo(() => {
        return [...(workoutSchedule || [])].sort((a, b) => a.day_number - b.day_number);
    }, [workoutSchedule]);

    useEffect(() => {
        if (sortedSchedule.length > 0) {
            const todayIdx = sortedSchedule.findIndex(d => d.date === today);
            if (todayIdx !== -1) {
                setSelectedDayIndex(todayIdx);
            }
        }
    }, [sortedSchedule, today]);

    const currentDay = sortedSchedule[selectedDayIndex];
    const isTodaySelected = currentDay?.date === today;

    const dayPlan = currentDay ? (mode === 'Gym' ? currentDay.gym : currentDay.home) : null;
    const exercises = dayPlan ? dayPlan.exercises : [];

    const replacementOptions = useMemo(() => {
        if (!exerciseToReplace) return [];
        const pool = mode === 'Gym' ? gymExercises : homeExercises;
        const currentExerciseNames = new Set(exercises.map((ex: any) => ex.name));
        return pool.filter((ex: any) => {
            const exName = ex.Exercise || ex['Exercise Name'] || ex.name;
            return (ex.BodyArea === exerciseToReplace.bodyArea || ex['Body Area'] === exerciseToReplace.bodyArea || ex.bodyArea === exerciseToReplace.bodyArea) &&
                !currentExerciseNames.has(exName);
        });
    }, [exerciseToReplace, mode, gymExercises, homeExercises, exercises]);

    const plannedBurn = dayPlan ? dayPlan.total_calories : 0;

    const initialCompletions = useMemo(() => {
        if (!currentDay || !currentDay.completed_exercises) return new Set();
        return new Set(currentDay.completed_exercises);
    }, [currentDay]);

    const [completedExerciseIds, setCompletedExerciseIds] = useState(new Set());

    useEffect(() => {
        setCompletedExerciseIds(initialCompletions);
    }, [initialCompletions]);

    const [regenerateloading, setRegenerateLoading] = useState(false);

    const actualBurn = useMemo(() => {
        if (!exercises) return 0;
        const total = exercises
            .filter((ex: any) => completedExerciseIds.has(ex.instance_id || ex.name))
            .reduce((sum: number, ex: any) => sum + (ex.actual_calories_burned || ex.predicted_calories_burn || 0), 0);
        return Math.round(total * 10) / 10;
    }, [exercises, completedExerciseIds]);

    const maxDailyXP = exercises.length * 10;
    const earnedXP = completedExerciseIds.size * 10;

    const handleRegenerate = async () => {
        setRegenerateLoading(true);
        posthog.capture('workout_plan_regenerated', {
            current_day_number: currentDay?.day_number,
            workout_level: userProfile?.workout_level,
            total_xp: userProfile?.workout_xp,
        });
        await regenerateFullSchedule();
        setRegenerateLoading(false);
    };

    const handleComplete = (exercise: any) => {
        const newSet = new Set(completedExerciseIds);
        const id = exercise.instance_id || exercise.name;
        const isCompleting = !newSet.has(id);

        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }

        completeExercise(currentDay.day_number, id, mode);
        setCompletedExerciseIds(newSet);

        if (isCompleting) {
            posthog.capture('exercise_completed', {
                exercise_name: exercise.name,
                mode,
                body_area: exercise.bodyArea,
                calories_burned: exercise.predicted_calories_burn || 0,
                duration_minutes: exercise.duration_minutes || 0,
                day_number: currentDay?.day_number,
            });
        }
    };

    const handleStart = (exercise: any) => {
        router.push({
            pathname: '/workout/active' as any,
            params: {
                name: exercise.name,
                videoLink: exercise.videoLink || '',
                met: exercise.MET || exercise.met || 5,
                duration_minutes: exercise.duration_minutes,
                equipment: exercise.equipment,
                instance_id: exercise.instance_id,
                day_number: currentDay?.day_number,
                mode: mode,
                exerciseType: exercise.exerciseType,
                sets: exercise.predicted_sets,
                completed_sets: exercise.completed_sets || 0,
                reps: exercise.predicted_reps
            }
        });
    };

    const handleReplaceRequest = (exercise: any) => {
        setExerciseToReplace(exercise);
        setReplaceModalVisible(true);
    };

    const confirmReplace = async (newExerciseRaw: any) => {
        if (!exerciseToReplace || !currentDay) return;
        const duration = exerciseToReplace.duration_minutes || 10;
        const met = newExerciseRaw.MET || newExerciseRaw['MET (Metabolic Equivalent)'] || newExerciseRaw.met || 3;
        const weight = userProfile.weight || 70;
        const burn = Math.round(met * weight * (duration / 60));
        const newExercise = {
            name: newExerciseRaw.Exercise || newExerciseRaw['Exercise Name'] || newExerciseRaw.name,
            exerciseType: newExerciseRaw.ExerciseType || newExerciseRaw.exerciseType || 'Duration',
            bodyArea: newExerciseRaw['Body Area'] || newExerciseRaw.bodyArea,
            level: newExerciseRaw.Level || newExerciseRaw['Level (Beginner/Intermediate)'] || newExerciseRaw.level,
            equipment: newExerciseRaw.Equipment || newExerciseRaw['Equipment Needed'] || newExerciseRaw.equipment,
            videoLink: newExerciseRaw.videoLink || '',
            met: met,
            duration_minutes: duration,
            predicted_sets: newExerciseRaw["Recommended Sets"] || 3,
            predicted_reps: newExerciseRaw["Recommended Reps"] || "10-12",
            predicted_calories_burn: burn,
            actual_calories_burned: 0,
            is_completed: 'no',
            completed_sets: 0
        };
        const oldId = exerciseToReplace.instance_id || exerciseToReplace.name;
        await replaceExercise(currentDay.day_number, oldId, newExercise, mode);
        setReplaceModalVisible(false);
        setExerciseToReplace(null);
    };

    if (!userProfile) return <SafeAreaView style={styles.container}><Text style={{ color: 'white', textAlign: 'center', marginTop: 50 }}>Loading profile...</Text></SafeAreaView>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bef264" />}>
                <View style={styles.headerContainer}>
                    <View style={styles.topRow}>
                        <View style={styles.levelBadge}><Text style={styles.levelLabel}>LEVEL</Text><Text style={styles.levelValue}>{userProfile.workout_level || 1}</Text></View>
                        <View><Text style={styles.greeting}>Hello, {userProfile.full_name?.split(' ')[0] || 'Athlete'}!</Text><Text style={styles.subGreeting}>Ready to crush your goals?</Text></View>
                        <View style={styles.totalXpContainer}><Text style={styles.totalXpLabel}>Total XP</Text><Text style={styles.totalXpValue}>{userProfile.workout_xp || 0}</Text></View>
                    </View>
                    <View style={styles.burnTracker}>
                        <View style={styles.burnTrackerHeader}><Text style={styles.burnTrackerLabel}>Today's Burn</Text><Text style={styles.burnTrackerValue}>{actualBurn} / {plannedBurn} kcal</Text></View>
                        <View style={styles.burnProgressBar}><AnimatedProgressBar progress={actualBurn / Math.max(plannedBurn, 1)} color="#bef264" backgroundColor="#333" height={6} /></View>
                    </View>
                    <View style={styles.xpInfo}><Text style={styles.xpInfoText}>Daily XP: {earnedXP} / {maxDailyXP}</Text></View>
                </View>
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                        You can follow either <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Home</Text> or <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Gym</Text> workouts. <Text style={{ color: '#bef264', fontWeight: 'bold' }}>Complete any one workout schedule (Gym/Home) per day.</Text>
                    </Text>
                </View>
                <View style={styles.daySelectorContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Your Schedule</Text>
                        <TouchableOpacity onPress={handleRegenerate} disabled={regenerateloading} style={styles.regenerateBtn}><RefreshCw size={20} color={regenerateloading ? '#666' : '#bef264'} /></TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                        {sortedSchedule.map((day: any, index: number) => {
                            const isSelected = index === selectedDayIndex;
                            const isToday = day.date === today;
                            const [y, m, d] = day.date.split('-');
                            const formattedDay = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                            return (
                                <TouchableOpacity key={day.day_number} onPress={() => setSelectedDayIndex(index)} style={[styles.dayChip, isSelected && styles.dayChipSelected, isToday && !isSelected && styles.dayChipToday, !isToday && !isSelected && styles.dayChipDimmed, day.completed && styles.dayChipCompleted]}>
                                    <View style={styles.dayHeader}><Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>Day {day.day_number}</Text>{isToday && <View style={styles.todayIndicator} />}</View>
                                    <Text style={[styles.dayChipDate, isSelected && styles.dayChipTextSelected]}>{formattedDay}</Text>
                                    <Text style={[styles.dayChipFocus, isSelected && styles.dayChipFocusSelected]}>{day.focus}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
                {currentDay && (
                    <View style={styles.workoutSection}>
                        <View style={styles.workoutHeader}>
                            <View><Text style={styles.todayFocus}>{currentDay.focus} Focus</Text>{!isTodaySelected && <Text style={styles.notTodayWarning}>Viewing plan for {currentDay.date}</Text>}<View style={styles.calorieBadge}><Flame size={14} color="#FF6B6B" /><Text style={styles.calorieText}>{plannedBurn} kcal Total</Text></View></View>
                            <View style={styles.toggleContainer}>
                                <TouchableOpacity style={[styles.toggleBtn, mode === 'Gym' && styles.toggleBtnActive]} onPress={() => setMode('Gym')}><Dumbbell size={16} color={mode === 'Gym' ? '#000' : '#888'} /></TouchableOpacity>
                                <TouchableOpacity style={[styles.toggleBtn, mode === 'Home' && styles.toggleBtnActive]} onPress={() => setMode('Home')}><HomeIcon size={16} color={mode === 'Home' ? '#000' : '#888'} /></TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.exerciseListLabel}>{exercises.length} Exercises ({mode})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseScroll}>
                            {exercises.map((ex: any, idx: number) => (
                                <ExerciseCard key={idx} exercise={ex} onComplete={() => handleComplete(ex)} onReplace={() => handleReplaceRequest(ex)} onStart={() => handleStart(ex)} disabled={!isTodaySelected} isCompleted={completedExerciseIds.has(ex.instance_id || ex.name)} />
                            ))}
                        </ScrollView>
                        <Leaderboard currentUserId={userProfile?.id || ''} userCountry={userProfile?.country} userState={userProfile?.state} onFetchLeaderboard={fetchLeaderboard} />
                    </View>
                )}
                {(!workoutSchedule || workoutSchedule.length === 0) ? (
                    <View style={styles.emptyState}><AlertCircle size={40} color="#666" /><Text style={styles.emptyText}>No workout plan found.</Text><TouchableOpacity style={[styles.startWorkoutBtn, { marginTop: 24, backgroundColor: '#bef264' }]} onPress={handleRegenerate} disabled={regenerateloading}><Text style={styles.startWorkoutText}>{regenerateloading ? "Generating..." : "Generate Plan"}</Text></TouchableOpacity></View>
                ) : !currentDay && <View style={styles.emptyState}><AlertCircle size={40} color="#666" /><Text style={styles.emptyText}>No workout scheduled for today.</Text></View>}
            </ScrollView>
            <Modal animationType="slide" transparent={true} visible={replaceModalVisible} onRequestClose={() => setReplaceModalVisible(false)}>
                <View style={styles.modalOverlay}><View style={styles.modalContent}>
                    <View style={styles.modalHeader}><Text style={styles.modalTitle}>Replace Exercise</Text><TouchableOpacity onPress={() => setReplaceModalVisible(false)}><X size={24} color="#FFF" /></TouchableOpacity></View>
                    <Text style={styles.modalSubtitle}>Select a substitute for <Text style={{ fontWeight: 'bold', color: '#bef264' }}>{exerciseToReplace?.name}</Text></Text>
                    <ScrollView contentContainerStyle={styles.replacementList}>
                        {replacementOptions.map((opt: any, idx: number) => (
                            <TouchableOpacity key={idx} style={styles.replacementItem} onPress={() => confirmReplace(opt)}>
                                <View><Text style={styles.repName}>{opt.Exercise || opt['Exercise Name'] || opt.name}</Text><Text style={styles.repDetails}>{(opt.Level || opt.level)} • {(opt.Equipment || opt.equipment)}</Text></View>
                                <View style={styles.repAddBtn}><Text style={styles.repAddText}>Select</Text></View>
                            </TouchableOpacity>
                        ))}
                        {replacementOptions.length === 0 && <Text style={styles.noOptionsText}>No similar exercises found.</Text>}
                    </ScrollView>
                </View></View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    scrollView: { flex: 1 },
    headerContainer: { padding: 20, paddingBottom: 10 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    levelBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#bef264', width: 60, height: 60, borderRadius: 30 },
    levelLabel: { fontSize: 9, fontWeight: 'bold', color: '#000' },
    levelValue: { fontSize: 22, fontWeight: 'bold', color: '#000' },
    totalXpContainer: { alignItems: 'center' },
    totalXpLabel: { fontSize: 11, fontWeight: '600', color: '#888' },
    totalXpValue: { fontSize: 20, fontWeight: 'bold', color: '#bef264' },
    greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    subGreeting: { fontSize: 14, color: '#888', marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', paddingHorizontal: 20 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingRight: 10 },
    instructionsContainer: { paddingHorizontal: 20, marginBottom: 16 },
    instructionsText: { fontSize: 12, color: '#888', lineHeight: 18 },
    regenerateBtn: { padding: 8 },
    daySelectorContainer: { marginBottom: 24 },
    dayScroll: { paddingHorizontal: 20 },
    dayChip: { backgroundColor: '#1E1E1E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333', minWidth: 90 },
    dayChipSelected: { backgroundColor: '#bef264', borderColor: '#bef264' },
    dayChipToday: { borderColor: '#bef264', borderWidth: 1.5 },
    dayChipDimmed: { opacity: 0.5 },
    dayChipCompleted: { borderColor: '#bef264', backgroundColor: 'rgba(190,242,100,0.08)' },
    dayHeader: { flexDirection: 'row', alignItems: 'center' },
    todayIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#bef264', marginLeft: 4 },
    dayChipText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
    dayChipTextSelected: { color: '#000' },
    dayChipDate: { fontSize: 12, color: '#888', marginTop: 2 },
    dayChipFocus: { fontSize: 10, color: '#666', marginTop: 4, textTransform: 'uppercase' },
    dayChipFocusSelected: { color: '#000' },
    workoutSection: { paddingHorizontal: 20 },
    workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    todayFocus: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    notTodayWarning: { fontSize: 12, color: '#FFB84D', marginTop: 4, fontWeight: '500' },
    calorieBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#2A0000', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start' },
    calorieText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600', marginLeft: 4 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#333' },
    toggleBtn: { padding: 8, borderRadius: 8 },
    toggleBtnActive: { backgroundColor: '#bef264' },
    exerciseListLabel: { fontSize: 16, fontWeight: '600', color: '#DDD', marginBottom: 12 },
    exerciseScroll: { paddingRight: 20 },
    startWorkoutBtn: { backgroundColor: '#bef264', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    startWorkoutText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
    burnTracker: { marginTop: 16, marginBottom: 12, padding: 12, backgroundColor: '#1E1E1E', borderRadius: 12 },
    burnTrackerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    burnTrackerLabel: { fontSize: 14, fontWeight: '600', color: '#AAA' },
    burnTrackerValue: { fontSize: 14, fontWeight: 'bold', color: '#FF6B6B' },
    burnProgressBar: { height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden' },
    xpInfo: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#1E1E1E', borderRadius: 12, marginBottom: 16 },
    xpInfoText: { fontSize: 13, fontWeight: '600', color: '#bef264' },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#666', marginTop: 12, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    modalSubtitle: { fontSize: 14, color: '#AAA', marginBottom: 20 },
    replacementList: { paddingBottom: 20 },
    replacementItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 16, borderRadius: 16, marginBottom: 12 },
    repName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
    repDetails: { fontSize: 12, color: '#888' },
    repAddBtn: { backgroundColor: '#bef264', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    repAddText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
    noOptionsText: { color: '#666', textAlign: 'center', marginTop: 40 },
});
