import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser as useClerkUser, useAuth } from '@clerk/clerk-expo';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Alert, AppState } from 'react-native';
import gymExercises from '../assets/gym_exercises.json';
import homeExercises from '../assets/home_exercises.json';
import { generateWorkoutSchedule, recalculateTargets } from '../utils/WorkoutGenerator';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useEnsureProfile } from '../hooks/useEnsureProfile';
import { getTodayISODate, getYesterdayISODate } from '../utils/DateUtils';

// ---------------------------------------------------------------------------
// Context Definition
// ---------------------------------------------------------------------------
/** @type {React.Context<any>} */
const UserContext = createContext({});
export const useUser = () => /** @type {any} */(useContext(UserContext));

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const UserProvider = ({ children }) => {
    const { isLoaded: isAuthLoaded, isSignedIn, userId, signOut } = useAuth();
    const { user: clerkUser } = useClerkUser();
    const convex = useConvex();

    // Push notification token
    const { expoPushToken, timezone: deviceTimezone } = usePushNotifications();

    // Ensure a Convex profile row exists for this user immediately after auth
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    const fullName = clerkUser?.fullName ?? null;
    const username = clerkUser?.username ?? null;
    useEnsureProfile(userId, email, fullName, username);

    // -------------------------------------------------------------------------
    // Reactive Data — Convex real-time subscriptions
    // -------------------------------------------------------------------------
    const [todayStr, setTodayStr] = useState(getTodayISODate());

    // The canonical user object exposed to the rest of the app
    const user = useMemo(() => {
        if (!isSignedIn || !userId) return null;
        return { id: userId, email };
    }, [isSignedIn, userId, email]);

    // Database queries (skip if not signed in)
    const dbProfile = useQuery(
        api.users.getProfile,
        user ? { userId: user.id } : 'skip',
    );
    const dbScheduleRaw = useQuery(
        api.workouts.getDailyPlans,
        user ? { userId: user.id } : 'skip',
    );
    const dbDailyStats = useQuery(
        api.users.getDailyStats,
        user ? { userId: user.id, date: todayStr } : 'skip',
    );

    const userProfile = dbProfile ?? null;

    // -------------------------------------------------------------------------
    // Loading State — clean two-phase check
    //   Phase 1: Clerk not yet initialised
    //   Phase 2: Signed in but Convex profile not yet fetched
    // -------------------------------------------------------------------------
    const loading = useMemo(() => {
        if (!isAuthLoaded) return true;                        // Phase 1
        if (isSignedIn && dbProfile === undefined) return true; // Phase 2
        return false;
    }, [isAuthLoaded, isSignedIn, dbProfile]);

    const hasCompletedOnboarding = !!(
        userProfile?.goal &&
        userProfile?.weight &&
        userProfile?.daily_calories
    );

    // -------------------------------------------------------------------------
    // Date / Timezone tracking
    // -------------------------------------------------------------------------
    useEffect(() => {
        const checkDate = () => {
            const tz = userProfile?.timezone || deviceTimezone;
            const current = getTodayISODate(tz);
            if (current !== todayStr) setTodayStr(current);
        };
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') checkDate();
        });
        const interval = setInterval(checkDate, 60_000);
        return () => { sub.remove(); clearInterval(interval); };
    }, [todayStr, userProfile?.timezone, deviceTimezone]);

    // -------------------------------------------------------------------------
    // Workout Schedule local state (optimistic)
    // -------------------------------------------------------------------------
    const [localWorkoutSchedule, setLocalWorkoutSchedule] = useState([]);

    useEffect(() => {
        if (dbScheduleRaw) {
            const normalized = dbScheduleRaw
                .slice()
                .sort((a, b) => a.day_number - b.day_number)
                .map((row) => ({
                    ...row.plan_data,
                    id: row._id,
                    day_number: row.day_number,
                    date: row.date,
                    completed: row.is_completed,
                    calories_burned: row.calories_burned,
                    completed_exercises: row.plan_data.completed_exercises || [],
                }));
            setLocalWorkoutSchedule(normalized);
        }
    }, [dbScheduleRaw]);

    const workoutSchedule = localWorkoutSchedule;

    // -------------------------------------------------------------------------
    // Water intake
    // -------------------------------------------------------------------------
    const [waterIntake, setWaterIntake] = useState(0);
    useEffect(() => {
        if (dbDailyStats) {
            setWaterIntake(parseFloat(dbDailyStats.water_glasses || 0));
        } else {
            setWaterIntake(0);
        }
    }, [dbDailyStats]);

    // -------------------------------------------------------------------------
    // Streak tracking
    // -------------------------------------------------------------------------
    const [streak, setStreak] = useState(0);
    useEffect(() => {
        if (!userProfile || !user) return;
        const tz = userProfile?.timezone || deviceTimezone;
        const today = getTodayISODate(tz);
        if (userProfile.last_active_date === today) {
            setStreak(userProfile.streak || 0);
            return;
        }
        const yesterdayStr = getYesterdayISODate(tz);
        const newStreak = userProfile.last_active_date === yesterdayStr
            ? (userProfile.streak || 0) + 1
            : 1;
        setStreak(newStreak);
        convex.mutation(api.users.updateProfile, {
            userId: user.id,
            updates: { streak: newStreak, last_active_date: today },
        }).catch((e) => console.error('[UserContext] Streak update failed:', e));
    }, [userProfile?.last_active_date, todayStr]);

    // -------------------------------------------------------------------------
    // Push token sync
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (user && userProfile && expoPushToken?.data && userProfile.push_token !== expoPushToken.data) {
            updateProfile({ push_token: expoPushToken.data });
        }
    }, [expoPushToken?.data, userProfile?.push_token]);

    // -------------------------------------------------------------------------
    // Nutrition targets
    // -------------------------------------------------------------------------
    const [nutritionTargets, setNutritionTargets] = useState({
        calories: 2000, protein: 150, carbs: 200, fat: 65,
        mealSplit: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 },
    });

    useEffect(() => {
        if (userProfile) calculateTargets(userProfile);
    }, [userProfile?.goal, userProfile?.weight, userProfile?.height, userProfile?.age]);

    // -------------------------------------------------------------------------
    // Workout schedule management (rolling generation)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (workoutSchedule && userProfile && user) {
            manageWorkoutSchedule(user.id, workoutSchedule, userProfile);
        }
    }, [workoutSchedule?.length, userProfile?._id, user?.id]);

    // =========================================================================
    // Data Mutation Helpers
    // =========================================================================
    const updateProfile = async (updates) => {
        if (!user) return;
        const allowedFields = [
            'full_name', 'username', 'goal', 'activity_level', 'gender', 'weight', 'height', 'age',
            'target_weight', 'target_duration_weeks', 'daily_calories', 'meal_split', 'streak',
            'last_active_date', 'workout_xp', 'workout_level', 'push_token', 'timezone', 'country', 'state',
        ];
        const numericFields = ['weight', 'height', 'age', 'target_weight', 'target_duration_weeks', 'daily_calories', 'streak', 'workout_xp', 'workout_level'];
        const coercedUpdates = {};
        Object.keys(updates).forEach((key) => {
            if (!allowedFields.includes(key)) return;
            let val = updates[key];
            if (numericFields.includes(key) && val !== undefined && val !== null) {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) val = parsed;
            }
            coercedUpdates[key] = val;
        });
        try {
            await convex.mutation(api.users.updateProfile, { userId: user.id, updates: coercedUpdates });
        } catch (error) {
            Alert.alert('Error updating profile', error.message);
        }
    };

    const calculateTargetsInternal = (profile) => {
        if (!profile?.weight || !profile?.height || !profile?.age || !profile?.gender) {
            return { tdee: 2000, targetCalories: 2000, mealSplit: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 } };
        }
        let bmr = 10 * Number(profile.weight) + 6.25 * Number(profile.height) - 5 * Number(profile.age) + (profile.gender === 'male' ? 5 : -161);
        const multis = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
        const tdee = bmr * (multis[profile.activity_level] || 1.2);
        let targetCalories = Math.round(tdee);
        if (profile.target_weight && profile.target_duration_weeks) {
            const deficit = ((Number(profile.weight) - Number(profile.target_weight)) * 7700) / (Number(profile.target_duration_weeks) * 7);
            targetCalories = Math.max(1000, Math.min(4000, Math.round(tdee - deficit)));
        } else {
            const adjust = { lose_weight: -500, maintain: 0, build_muscle: 300, improve_perf: 0 };
            targetCalories = Math.round(tdee + (adjust[profile.goal] || 0));
        }
        return { tdee: Math.round(tdee), targetCalories, mealSplit: profile.meal_split || { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 } };
    };

    const calculateTargets = (profile) => {
        const { targetCalories, mealSplit, tdee } = calculateTargetsInternal(profile);
        const isMuscleBuild = profile?.goal === 'build_muscle';
        setNutritionTargets({
            calories: targetCalories, tdee, mealSplit,
            protein: Math.round((targetCalories * (isMuscleBuild ? 0.35 : 0.30)) / 4),
            carbs: Math.round((targetCalories * (isMuscleBuild ? 0.45 : 0.40)) / 4),
            fat: Math.round((targetCalories * (isMuscleBuild ? 0.20 : 0.30)) / 9),
        });
    };

    const completeOnboarding = async () => {
        if (!userProfile || !user) return;
        const { targetCalories, mealSplit } = calculateTargetsInternal(userProfile);
        const updates = { daily_calories: targetCalories, meal_split: mealSplit };
        await updateProfile(updates);
        if (!workoutSchedule || workoutSchedule.length === 0) {
            const startDate = new Date(todayStr);
            const schedule = generateWorkoutSchedule({ ...userProfile, ...updates }, gymExercises, homeExercises, startDate, 1, 5);
            const dbRows = schedule.map((day) => ({
                user_id: user.id, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false,
            }));
            await convex.mutation(api.workouts.upsertDailyPlans, { userId: user.id, plans: dbRows });
            await convex.mutation(api.workouts.insertJobQueue, { user_id: user.id, status: 'completed', error_message: 'Initial Onboarding' });
        }
    };

    const updateWaterIntake = async (litres, date = null) => {
        if (!user) return;
        const targetDate = date || todayStr;
        const newTotal = parseFloat(litres.toFixed(2));
        setWaterIntake(newTotal);
        if (targetDate === todayStr && newTotal >= 3.5) {
            Alert.alert('Goal Reached! 💧', "You've reached your 3.5L daily water goal.");
        }
        await convex.mutation(api.users.updateDailyStats, {
            userId: user.id, date: targetDate, updates: { water_glasses: newTotal },
        });
    };

    const addXP = async (amount) => {
        if (!user) return;
        try {
            await convex.mutation(api.users.incrementXP, { userId: user.id, amount });
        } catch (e) {
            console.error('[UserContext] Error adding XP:', e);
        }
    };

    const completeExercise = async (dayNumber, exerciseId, mode = 'Gym', actualCalories = null, completedSets = null) => {
        if (!user || !userProfile) return;
        let dayId = null;
        let dayToUpdate = null;
        const newSchedule = workoutSchedule.map((day) => {
            if (day.day_number !== dayNumber) return day;
            dayId = day.id;
            const completions = day.completed_exercises || [];
            const modeKey = mode.toLowerCase();
            const session = { ...day[modeKey] };
            const exIndex = session.exercises.findIndex((ex) => (ex.instance_id || ex.name) === exerciseId);
            const exerciseObj = session.exercises[exIndex];
            const targetSets = exerciseObj?.predicted_sets || 3;
            let updatedCompletions = [...completions];
            const alreadyDone = completions.includes(exerciseId);
            if (completedSets === null) {
                const becomingDone = !alreadyDone;
                updatedCompletions = alreadyDone ? completions.filter((id) => id !== exerciseId) : [...completions, exerciseId];
                session.exercises = session.exercises.map((ex, idx) =>
                    idx === exIndex ? { ...ex, is_completed: becomingDone ? 'true' : 'no', completed_sets: becomingDone ? targetSets : 0 } : ex
                );
            } else {
                if (completedSets >= targetSets && !alreadyDone) updatedCompletions = [...completions, exerciseId];
                session.exercises = session.exercises.map((ex, idx) => {
                    if (idx !== exIndex) return ex;
                    const status = completedSets >= targetSets ? 'true' : completedSets > 0 ? 'partial' : 'no';
                    return { ...ex, actual_calories_burned: actualCalories ?? ex.actual_calories_burned, completed_sets: completedSets, is_completed: status };
                });
            }
            const isAllDone = session.exercises.every((ex) => {
                const id = ex.instance_id || ex.name;
                return updatedCompletions.includes(id) || ex.is_completed === 'true';
            });
            dayToUpdate = { ...day, [modeKey]: session, completed_exercises: updatedCompletions, completed: isAllDone };
            return dayToUpdate;
        });
        setLocalWorkoutSchedule(newSchedule);
        if (!dayId) return;
        try {
            await convex.mutation(api.workouts.updatePlan, {
                id: dayId,
                updates: {
                    plan_data: { gym: dayToUpdate.gym, home: dayToUpdate.home, focus: dayToUpdate.focus, target_calories: dayToUpdate.target_calories, completed_exercises: dayToUpdate.completed_exercises },
                    is_completed: dayToUpdate.completed,
                },
            });
            let totalCaloriesBurned = 0;
            const allExercises = [...(dayToUpdate.gym?.exercises || []), ...(dayToUpdate.home?.exercises || [])];
            dayToUpdate.completed_exercises.forEach((id) => {
                const ex = allExercises.find((e) => (e.instance_id || e.name) === id);
                if (ex) totalCaloriesBurned += ex.actual_calories_burned || ex.predicted_calories_burn || 0;
            });
            await convex.mutation(api.users.updateDailyStats, {
                userId: user.id, date: dayToUpdate.date,
                updates: { calories_burned: Math.round(totalCaloriesBurned), daily_exercise_completions: dayToUpdate.completed_exercises },
            });
            await addXP(10);
        } catch (err) {
            console.error('[UserContext] Failed to save exercise:', err);
        }
    };

    const replaceExercise = async (dayNumber, oldId, newExercise, mode = 'Gym') => {
        if (!user) return;
        const dayPlan = workoutSchedule.find((d) => d.day_number === dayNumber);
        if (!dayPlan) return;
        const key = mode.toLowerCase();
        const updatedExercises = dayPlan[key].exercises.map((ex) =>
            (ex.instance_id || ex.name) === oldId ? { ...newExercise, instance_id: oldId } : ex
        );
        const payload = {
            gym: key === 'gym' ? { ...dayPlan.gym, exercises: updatedExercises } : dayPlan.gym,
            home: key === 'home' ? { ...dayPlan.home, exercises: updatedExercises } : dayPlan.home,
            focus: dayPlan.focus, target_calories: dayPlan.target_calories, completed_exercises: dayPlan.completed_exercises,
        };
        try {
            await convex.mutation(api.workouts.updatePlan, { id: dayPlan.id, updates: { plan_data: payload } });
            setLocalWorkoutSchedule((prev) =>
                prev.map((d) => d.day_number === dayNumber ? { ...d, [key]: payload[key] } : d)
            );
        } catch (e) {
            console.error('[UserContext] Replace failed:', e);
        }
    };

    const regenerateFullSchedule = async () => {
        if (!user) return;
        try {
            if (workoutSchedule.length > 0) {
                await convex.mutation(api.workouts.deleteDailyPlans, { ids: workoutSchedule.map((d) => d.id) });
            }
            const startDate = new Date(todayStr);
            const schedule = generateWorkoutSchedule(userProfile, gymExercises, homeExercises, startDate, 1, 5);
            const dbRows = schedule.map((day) => ({
                user_id: user.id, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false,
            }));
            await convex.mutation(api.workouts.upsertDailyPlans, { userId: user.id, plans: dbRows });
            await convex.mutation(api.workouts.insertJobQueue, { user_id: user.id, status: 'completed', error_message: 'Manual Regeneration' });
        } catch (e) {
            console.error('[UserContext] Regeneration failed:', e);
        }
    };

    const manageWorkoutSchedule = async (uid, currentSchedule, profile) => {
        if (!currentSchedule || !profile) return;
        const today = todayStr;
        const pastDays = currentSchedule.filter((d) => d.date < today);
        if (pastDays.length > 0) {
            const historyEntries = pastDays.map((d) => ({
                user_id: uid, date: d.date,
                summary_data: { day_number: d.day_number, focus: d.focus, calories_target: d.target_calories, calories_burned: d.calories_burned || 0, completed: d.completed },
                original_plan_snapshot: d,
            }));
            try {
                await convex.mutation(api.workouts.insertHistory, { entries: historyEntries });
                await convex.mutation(api.workouts.deleteDailyPlans, { ids: pastDays.map((d) => d.id) });
            } catch (e) { console.error('[UserContext] Archive failed:', e); }
        }
        const activeDays = currentSchedule.filter((d) => d.date >= today);
        if (activeDays.length < 3) {
            let lastDayDate = new Date();
            let lastDayNumber = 0;
            if (activeDays.length > 0) {
                const lastDay = activeDays[activeDays.length - 1];
                lastDayDate = new Date(lastDay.date);
                lastDayNumber = lastDay.day_number;
            }
            const nextBlockStartDate = new Date(lastDayDate);
            if (activeDays.length > 0) nextBlockStartDate.setDate(lastDayDate.getDate() + 1);
            const totalDurationDays = (profile.target_duration_weeks || 4) * 7;
            const remainingDays = totalDurationDays - lastDayNumber;
            const newDailyBurn = recalculateTargets(profile.weight, profile.target_weight || profile.weight, remainingDays > 0 ? remainingDays : 30);
            const newBlock = generateWorkoutSchedule({ ...profile, recalculatedDailyBurn: newDailyBurn }, gymExercises, homeExercises, nextBlockStartDate, lastDayNumber + 1, 5);
            const dbRows = newBlock.map((day) => ({
                user_id: uid, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false,
            }));
            try {
                await convex.mutation(api.workouts.upsertDailyPlans, { userId: uid, plans: dbRows });
            } catch (e) { console.error('[UserContext] Rolling generation failed:', e); }
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const top10 = await convex.query(api.users.getLeaderboard, {});
            const myEntry = user ? top10.find((u) => u.user_id === user.id) : null;
            return { top10, currentUserEntry: myEntry };
        } catch (e) { return { top10: [], currentUserEntry: null }; }
    };

    const fetchDailyStats = async (uid, date) => {
        if (!uid || !date) return null;
        try { return await convex.query(api.users.getDailyStats, { userId: uid, date }); }
        catch (e) { return null; }
    };

    return (
        <UserContext.Provider value={{
            // Identity
            user, userProfile, loading,
            isAuthenticated: !!user,
            hasCompletedOnboarding,
            // Data
            workoutSchedule, nutritionTargets, waterIntake, streak, todayStr,
            gymExercises, homeExercises,
            // Actions
            updateProfile, completeOnboarding,
            updateWaterIntake, completeExercise, addXP,
            fetchLeaderboard, fetchDailyStats,
            regenerateFullSchedule, replaceExercise,
            logout: signOut,
        }}>
            {children}
        </UserContext.Provider>
    );
};
