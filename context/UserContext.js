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
import { useAlert } from './AlertContext';

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
    const { showAlert } = useAlert();

    // Push notification token
    const { expoPushToken, timezone: deviceTimezone } = usePushNotifications();

    // Ensure a Convex profile row exists for this user immediately after auth
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    const fullName = clerkUser?.fullName ?? null;
    const username = clerkUser?.username ?? null;
    
    console.log('[UserContext] clerkUser:', clerkUser ? 'present' : 'absent', 'userId:', userId, 'timezone:', deviceTimezone);
    useEnsureProfile(userId, email, fullName, username, deviceTimezone);

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

        console.log(`[UserContext] Checking streak. Profile last active: ${userProfile.last_active_date}, today: ${today}, current streak: ${userProfile.streak}`);

        if (userProfile.last_active_date === today) {
            setStreak(userProfile.streak || 0);
            return;
        }

        const yesterdayStr = getYesterdayISODate(tz);
        const newStreak = userProfile.last_active_date === yesterdayStr
            ? (userProfile.streak || 0) + 1
            : 1;

        console.log(`[UserContext] Updating streak to ${newStreak}. Previous date: ${userProfile.last_active_date}, Yesterday was: ${yesterdayStr}`);

        setStreak(newStreak);
        convex.mutation(api.users.updateProfile, {
            userId: user.id,
            updates: { streak: newStreak, last_active_date: today },
        })
            .then(() => console.log('[UserContext] Streak updated successfully in DB'))
            .catch((e) => console.error('[UserContext] Streak update failed:', e));
    }, [userProfile?.last_active_date, userProfile?.streak, todayStr, user?.id]);

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
        if (dbScheduleRaw !== undefined && workoutSchedule && userProfile && user) {
            manageWorkoutSchedule(user.id, workoutSchedule, userProfile);
        }
    }, [workoutSchedule?.length, userProfile?._id, user?.id, dbScheduleRaw !== undefined]);

    // =========================================================================
    // Data Mutation Helpers
    // =========================================================================
    const updateProfile = async (updates) => {
        if (!user) return;
        const allowedFields = [
            'full_name', 'username', 'goal', 'activity_level', 'gender', 'weight', 'height', 'age',
            'target_weight', 'target_duration_weeks', 'target_burn', 'daily_calories', 'meal_split', 'streak',
            'last_active_date', 'workout_xp', 'workout_level', 'push_token', 'timezone', 'country', 'state',
        ];
        const numericFields = ['weight', 'height', 'age', 'target_weight', 'target_duration_weeks', 'target_burn', 'daily_calories', 'streak', 'workout_xp', 'workout_level'];
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
            showAlert('Error updating profile', error.message);
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

        // Calculate daily burn target based on user goal (same logic as step4_result.tsx)
        const weightDiff = Math.abs((userProfile.weight || 70) - (userProfile.target_weight || 70));
        const durationWeeks = userProfile.target_duration_weeks || 4;
        const durationDays = durationWeeks * 7;
        const totalCaloriesDiff = weightDiff * 7700; // 1 kg = 7700 kcal
        let target_burn = Math.round(totalCaloriesDiff / durationDays);
        target_burn = Math.max(200, Math.min(1000, target_burn)); // Cap between 200-1000

        const updates = {
            daily_calories: targetCalories,
            meal_split: mealSplit,
            target_burn: target_burn,
        };
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

    const updateWaterIntake = (litres, date = null) => {
        if (!user) return;
        const targetDate = date || todayStr;
        const newTotal = parseFloat(litres.toFixed(2));
        const prev = waterIntake; // save for rollback
        setWaterIntake(newTotal); // instant UI update
        if (targetDate === todayStr && newTotal >= 3.5) {
            showAlert('Goal Reached! 💧', "You've reached your 3.5L daily water goal.");
        }
        // Background sync — no await
        convex.mutation(api.users.updateDailyStats, {
            userId: user.id, date: targetDate, updates: { water_glasses: newTotal },
        }).catch(() => {
            setWaterIntake(prev); // rollback on failure
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

    const completeExercise = async (dayNumber, exerciseId, mode = 'Gym', actualCalories = null, completedSets = null, elapsedSeconds = null) => {
        if (!user || !userProfile) return;
        let captureDayToUpdate = null;
        let captureDayId = null;
        let captureXpChange = 0;

        setLocalWorkoutSchedule(prevSchedule => {
            const newSchedule = prevSchedule.map((day) => {
                if (day.day_number !== dayNumber) return day;
                captureDayId = day.id;
                const completions = day.completed_exercises || [];
                const modeKey = mode.toLowerCase();
                const session = { ...day[modeKey] };
                const exIndex = session.exercises.findIndex((ex) => (ex.instance_id || ex.name) === exerciseId);
                const exerciseObj = session.exercises[exIndex];
                const targetSets = exerciseObj?.predicted_sets || 3;
                let updatedCompletions = [...completions];
                const alreadyDone = completions.includes(exerciseId);

                if (completedSets === null && elapsedSeconds === null && actualCalories === null) {
                    // Toggle complete
                    const becomingDone = !alreadyDone;
                    captureXpChange = becomingDone ? 10 : -10;
                    updatedCompletions = alreadyDone ? completions.filter((id) => id !== exerciseId) : [...completions, exerciseId];
                    session.exercises = session.exercises.map((ex, idx) =>
                        idx === exIndex ? {
                            ...ex,
                            is_completed: becomingDone ? 'true' : 'no',
                            completed_sets: becomingDone ? targetSets : (ex.completed_sets || 0),
                            elapsed_seconds: ex.elapsed_seconds || 0,
                            actual_calories_burned: ex.actual_calories_burned || 0
                        } : ex
                    );
                } else {
                    // Specific update (from timer/logger)
                    session.exercises = session.exercises.map((ex, idx) => {
                        if (idx !== exIndex) return ex;

                        const newSets = completedSets !== null ? completedSets : (ex.completed_sets || 0);
                        const newElapsed = elapsedSeconds !== null ? elapsedSeconds : (ex.elapsed_seconds || 0);
                        const newCalories = actualCalories !== null ? actualCalories : (ex.actual_calories_burned || 0);

                        const status = newSets >= targetSets ? 'true' : (newSets > 0 || newElapsed > 0) ? 'partial' : 'no';

                        if (status === 'true' && !alreadyDone) {
                            updatedCompletions = [...completions, exerciseId];
                            captureXpChange = 10;
                        } else if (status !== 'true' && alreadyDone) {
                            updatedCompletions = completions.filter(id => id !== exerciseId);
                            captureXpChange = -10;
                        }

                        return {
                            ...ex,
                            actual_calories_burned: newCalories,
                            completed_sets: newSets,
                            elapsed_seconds: newElapsed,
                            is_completed: status
                        };
                    });
                }

                const isAllDone = session.exercises.every((ex) => {
                    const id = ex.instance_id || ex.name;
                    return updatedCompletions.includes(id) || ex.is_completed === 'true';
                });
                captureDayToUpdate = { ...day, [modeKey]: session, completed_exercises: updatedCompletions, completed: isAllDone };
                return captureDayToUpdate;
            });
            return newSchedule;
        });

        // Background database synchronization using the captured state to ensure consistency
        setTimeout(async () => {
            if (!captureDayId || !captureDayToUpdate) return;
            try {
                await convex.mutation(api.workouts.updatePlan, {
                    id: captureDayId,
                    updates: {
                        plan_data: {
                            gym: captureDayToUpdate.gym,
                            home: captureDayToUpdate.home,
                            focus: captureDayToUpdate.focus,
                            target_calories: captureDayToUpdate.target_calories,
                            completed_exercises: captureDayToUpdate.completed_exercises
                        },
                        is_completed: captureDayToUpdate.completed,
                    },
                });

                let totalCaloriesBurned = 0;
                const allExercises = [...(captureDayToUpdate.gym?.exercises || []), ...(captureDayToUpdate.home?.exercises || [])];
                captureDayToUpdate.completed_exercises.forEach((id) => {
                    const ex = allExercises.find((e) => (e.instance_id || e.name) === id);
                    if (ex) totalCaloriesBurned += ex.actual_calories_burned || ex.predicted_calories_burn || 0;
                });
                await convex.mutation(api.users.updateDailyStats, {
                    userId: user.id, date: captureDayToUpdate.date,
                    updates: { calories_burned: Math.round(totalCaloriesBurned), daily_exercise_completions: captureDayToUpdate.completed_exercises },
                });
                // XP change if applicable
                if (captureXpChange !== 0) {
                    addXP(captureXpChange);
                }
            } catch (err) {
                console.error('[UserContext] Failed to save exercise in background:', err);
            }
        }, 0);
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
        if (!currentSchedule || currentSchedule.length === 0 || !profile) return;

        const today = todayStr;
        // 1. Archive blocks that are entirely in the past
        const sortedDaysForArchive = [...currentSchedule].sort((a, b) => a.date.localeCompare(b.date));
        const absoluteLastDay = sortedDaysForArchive[sortedDaysForArchive.length - 1];
        
        // We consider a day as part of an 'old block' if its day_number is at least 5 days older 
        // than the absolute latest day in the schedule AND it's in the past.
        const pastDays = currentSchedule.filter((d) => d.date < today && d.day_number <= absoluteLastDay.day_number - 5);

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

        // 2. Generate new block on the 4th day
        const sortedDays = [...currentSchedule].filter(d => !pastDays.find(p => p.id === d.id)).sort((a, b) => a.date.localeCompare(b.date));
        if (sortedDays.length === 0) return;
        const lastDay = sortedDays[sortedDays.length - 1];

        // If the last day is LESS THAN OR EQUAL TO 2 days from today, we need to generate the next 5 days.
        const lastDayDateObj = new Date(lastDay.date + "T00:00:00");
        const todayDateObj = new Date(today + "T00:00:00");
        const diffTime = lastDayDateObj.getTime() - todayDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 2) {
            // Predict the start date of the new block
            const nextBlockStartDate = new Date(lastDayDateObj);
            nextBlockStartDate.setDate(lastDayDateObj.getDate() + 1);

            const lastDayNumber = lastDay.day_number;
            const totalDurationDays = (profile.target_duration_weeks || 4) * 7;
            const remainingDays = totalDurationDays - lastDayNumber;
            const newDailyBurn = recalculateTargets(profile.weight, profile.target_weight || profile.weight, remainingDays > 0 ? remainingDays : 30);

            // Generate EXACTLY 5 days
            const newBlock = generateWorkoutSchedule({ ...profile, recalculatedDailyBurn: newDailyBurn }, gymExercises, homeExercises, nextBlockStartDate, lastDayNumber + 1, 5);

            const dbRows = newBlock.map((day) => ({
                user_id: uid, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false,
            }));
            try {
                // Upsert to backend. This logic only runs once because next time `diffDays` will be > 2.
                await convex.mutation(api.workouts.upsertDailyPlans, { userId: uid, plans: dbRows });
            } catch (e) { console.error('[UserContext] Rolling generation failed:', e); }
        }
    };


    const fetchLeaderboard = async (scope = 'all', filter = undefined) => {
        try {
            // Determine filter value from user profile if not explicitly provided
            let filterValue = filter;
            if (!filterValue) {
                if (scope === 'country') filterValue = userProfile?.country;
                if (scope === 'state') filterValue = userProfile?.state;
            }

            const top10 = await convex.query(api.leaderboards.getLeaderboard, { scope, filter: filterValue });

            // Re-fetch the current user's exact rank so they see themselves even if they aren't top 10
            let myEntry = null;
            if (user?.id) {
                myEntry = await convex.query(api.leaderboards.getUserRank, { userId: user.id, scope, filter: filterValue });
            }
            return { top10, currentUserEntry: myEntry };
        } catch (e) {
            console.error("Leaderboard fetch error:", e);
            return { top10: [], currentUserEntry: null };
        }
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
