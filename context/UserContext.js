import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser as useClerkUser, useAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Alert, Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import gymExercises from '../assets/gym_exercises.json';
import homeExercises from '../assets/home_exercises.json';
import { generateWorkoutSchedule, recalculateTargets } from '../utils/WorkoutGenerator';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getTodayISODate, getYesterdayISODate } from '../utils/DateUtils';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isMock, setIsMock] = useState(false);
    const [mockProfile, setMockProfile] = useState(null);
    const [nutritionTargets, setNutritionTargets] = useState({
        calories: 2000, protein: 150, carbs: 200, fat: 65,
        mealSplit: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
    });
    const [waterIntake, setWaterIntake] = useState(0);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    // Push Notifications
    const { expoPushToken, timezone: deviceTimezone } = usePushNotifications();
    const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
    const { signOut } = useAuth();
    const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
    const { signUp: clerkSignUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
    const convex = useConvex();

    // ---- Timezone & Date State Management ----
    const [todayStr, setTodayStr] = useState(getTodayISODate());

    // Refresh todayStr when app comes to foreground or at intervals
    useEffect(() => {
        const checkDate = () => {
            const current = getTodayISODate(userProfile?.timezone || deviceTimezone);
            if (current !== todayStr) {
                setTodayStr(current);
            }
        };

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') checkDate();
        });

        const interval = setInterval(checkDate, 60000);

        // Sync timezone to profile if missing or different
        const activeTz = userProfile?.timezone || deviceTimezone;
        if (user && userProfile && activeTz && userProfile.timezone !== activeTz) {
            updateProfile({ timezone: activeTz });
        }

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, [todayStr, userProfile?.timezone, deviceTimezone, user]);

    // ---- Reactive Data Source (Convex) ----
    const dbProfile = useQuery(api.users.getProfile, user ? { userId: user.id } : "skip");
    const dbScheduleRaw = useQuery(api.workouts.getDailyPlans, user ? { userId: user.id } : "skip");
    const dbDailyStats = useQuery(api.users.getDailyStats, user ? { userId: user.id, date: todayStr } : "skip");

    // Derived state
    const userProfile = isMock ? mockProfile : dbProfile;
    // Local state for optimistic updates
    const [localWorkoutSchedule, setLocalWorkoutSchedule] = useState([]);

    // Sync local state when DB data changes
    useEffect(() => {
        if (dbScheduleRaw) {
            const normalized = dbScheduleRaw.slice().sort((a, b) => a.day_number - b.day_number).map(row => ({
                ...row.plan_data,
                id: row._id,
                day_number: row.day_number,
                date: row.date,
                completed: row.is_completed,
                calories_burned: row.calories_burned,
                completed_exercises: row.plan_data.completed_exercises || []
            }));
            setLocalWorkoutSchedule(normalized);
        }
    }, [dbScheduleRaw]);

    const workoutSchedule = isMock ? [] : localWorkoutSchedule;

    const isAuthenticated = !!user;
    const hasCompletedOnboarding = !!(userProfile?.goal && userProfile?.weight && userProfile?.daily_calories);

    useEffect(() => {
        if (isMock) return;
        if (isClerkLoaded) {
            if (clerkUser) {
                setUser({ id: clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress });
            } else {
                setUser(null);
                setLoading(false);
            }
        }
    }, [isMock, isClerkLoaded, clerkUser]);

    // Side effects for profile changes (streak, targets, push token)
    useEffect(() => {
        if (!userProfile || isMock) return;

        // 1. Calculate targets
        calculateTargets(userProfile);

        // 2. Update Streak
        const runStreakCheck = async () => {
            const today = todayStr;
            if (userProfile.last_active_date === today) {
                setStreak(userProfile.streak || 0);
            } else {
                let newStreak = 1;
                const yesterdayStr = getYesterdayISODate();
                if (userProfile.last_active_date === yesterdayStr) {
                    newStreak = (userProfile.streak || 0) + 1;
                }
                setStreak(newStreak);
                await convex.mutation(api.users.updateProfile, {
                    userId: user.id,
                    updates: { streak: newStreak, last_active_date: today }
                });
            }
        };
        runStreakCheck();

        // 3. Push Token Sync (Independent timezone sync now handled above)
        if (expoPushToken?.data && userProfile.push_token !== expoPushToken.data) {
            updateProfile({ push_token: expoPushToken.data });
        }

        if (!loading) setLoading(false);
    }, [userProfile, expoPushToken?.data]);

    // Side effects for Daily Stats
    useEffect(() => {
        if (dbDailyStats) {
            setWaterIntake(parseFloat(dbDailyStats.water_glasses || 0));
        } else {
            setWaterIntake(0);
        }
    }, [dbDailyStats]);

    // Side effects for Workout Schedule Management
    useEffect(() => {
        if (workoutSchedule && userProfile && !isMock) {
            manageWorkoutSchedule(user.id, workoutSchedule, userProfile);
        }
    }, [workoutSchedule]);

    const login = async (email, password) => {
        if (!isSignInLoaded) return;
        try {
            const completeSignIn = await signIn.create({ identifier: email, password });
            await setSignInActive({ session: completeSignIn.createdSessionId });
        } catch (err) { throw err; }
    };

    const signUp = async (email, password, fullName, username) => {
        if (!isSignUpLoaded) return;
        try {
            await clerkSignUp.create({ emailAddress: email, password });
            await clerkSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
        } catch (err) { throw err; }
    };

    const verifySignUp = async (code, fullName, username) => {
        if (!isSignUpLoaded) return;
        try {
            if (clerkSignUp.status === 'complete') {
                await setSignUpActive({ session: clerkSignUp.createdSessionId });
                return;
            }
            const completeSignUp = await clerkSignUp.attemptEmailAddressVerification({ code });
            if (completeSignUp.status === 'complete') {
                await setSignUpActive({ session: completeSignUp.createdSessionId });
                await convex.mutation(api.users.updateProfile, {
                    userId: completeSignUp.createdUserId,
                    updates: { full_name: fullName, username: username }
                });
            }
        } catch (err) { throw err; }
    };

    const mockLogin = () => {
        setIsMock(true);
        const mockUID = 'mock-user-id';
        setUser({ id: mockUID, email: 'mock@example.com' });
        const p = {
            id: mockUID, full_name: 'Mock User', username: 'mockuser',
            goal: 'lose_weight', activity_level: 'moderately_active',
            gender: 'male', weight: 80, height: 180, age: 25,
            target_weight: 75, target_duration_weeks: 12, daily_calories: 2200,
            meal_split: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
        };
        setMockProfile(p);
        calculateTargets(p);
        setLoading(false);
    };

    const addXP = async (amount) => {
        if (isMock) {
            setMockProfile(prev => {
                const newXp = (prev.workout_xp || 0) + amount;
                let newLevel = 1;
                if (newXp >= 5001) newLevel = 5;
                else if (newXp >= 5000) newLevel = 4;
                else if (newXp >= 3500) newLevel = 3;
                else if (newXp >= 2000) newLevel = 2;
                return { ...prev, workout_xp: newXp, workout_level: newLevel };
            });
            return;
        }
        try {
            await convex.mutation(api.users.incrementXP, { userId: user.id, amount });
        } catch (e) {
            console.error("Error adding XP:", e);
        }
    };

    const manageWorkoutSchedule = async (userId, currentSchedule, profile) => {
        if (!currentSchedule || !profile) return;
        const today = todayStr;
        const pastDays = currentSchedule.filter(d => d.date < today);

        if (pastDays.length > 0) {
            const historyEntries = pastDays.map(d => ({
                user_id: userId,
                date: d.date,
                summary_data: {
                    day_number: d.day_number, focus: d.focus,
                    calories_target: d.target_calories,
                    calories_burned: d.calories_burned || 0,
                    completed: d.completed
                },
                original_plan_snapshot: d
            }));

            try {
                await convex.mutation(api.workouts.insertHistory, { entries: historyEntries });
                await convex.mutation(api.workouts.deleteDailyPlans, { ids: pastDays.map(d => d.id) });
            } catch (e) { console.error("Failed to archive:", e); }
        }

        const activeDays = currentSchedule.filter(d => d.date >= today);
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
            const dbRows = newBlock.map(day => ({
                user_id: userId, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false
            }));

            try {
                await convex.mutation(api.workouts.upsertDailyPlans, { userId, plans: dbRows });
                await convex.mutation(api.workouts.insertJobQueue, { user_id: userId, status: 'completed', error_message: 'Rolling Generation' });
            } catch (e) { console.error("Generation failed:", e); }
        }
    };

    const updateWaterIntake = async (litres, date = null) => {
        if (!user) return;
        const targetDate = date || todayStr;
        const newTotal = parseFloat(litres.toFixed(2));
        setWaterIntake(newTotal);

        if (targetDate === todayStr && newTotal >= 3.5) {
            Alert.alert("Goal Reached! 💧", "You've reached your 3.5L daily water goal.");
        }

        if (isMock) return;
        await convex.mutation(api.users.updateDailyStats, {
            userId: user.id, date: targetDate,
            updates: { water_glasses: newTotal }
        });
    };

    const completeExercise = async (dayNumber, exerciseId, mode = 'Gym', actualCalories = null, completedSets = null) => {
        if (!user || !userProfile) return;

        let dayId = null;
        let dayToUpdate = null;
        const newSchedule = workoutSchedule.map(day => {
            if (day.day_number === dayNumber) {
                dayId = day.id;
                const completions = day.completed_exercises || [];
                const modeKey = mode.toLowerCase();
                const session = { ...day[modeKey] };
                const exIndex = session.exercises.findIndex(ex => (ex.instance_id || ex.name) === exerciseId);
                const exerciseObj = session.exercises[exIndex];
                const targetSets = exerciseObj?.predicted_sets || 3;

                let updatedCompletions = [...completions];
                const alreadyDone = completions.includes(exerciseId);

                if (completedSets === null) {
                    const becomingDone = !alreadyDone;
                    if (alreadyDone) updatedCompletions = completions.filter(id => id !== exerciseId);
                    else updatedCompletions = [...completions, exerciseId];

                    session.exercises = session.exercises.map((ex, idx) => {
                        if (idx === exIndex) return { ...ex, is_completed: becomingDone ? 'true' : 'no', completed_sets: becomingDone ? targetSets : 0 };
                        return ex;
                    });
                } else {
                    const isFinalSet = completedSets >= targetSets;
                    if (isFinalSet && !alreadyDone) updatedCompletions = [...completions, exerciseId];

                    session.exercises = session.exercises.map((ex, idx) => {
                        if (idx === exIndex) {
                            let status = 'no';
                            if (completedSets >= targetSets) status = 'true';
                            else if (completedSets > 0) status = 'partial';
                            return { ...ex, actual_calories_burned: actualCalories ?? ex.actual_calories_burned, completed_sets: completedSets, is_completed: status };
                        }
                        return ex;
                    });
                }

                const isAllDone = session.exercises.every(ex => {
                    const id = ex.instance_id || ex.name;
                    return updatedCompletions.includes(id) || ex.is_completed === 'true';
                });

                dayToUpdate = { ...day, [modeKey]: session, completed_exercises: updatedCompletions, completed: isAllDone };
                return dayToUpdate;
            }
            return day;
        });

        // 1. Optimistic Update
        setLocalWorkoutSchedule(newSchedule);

        if (isMock || !dayId) return;

        try {
            await convex.mutation(api.workouts.updatePlan, {
                id: dayId,
                updates: {
                    plan_data: {
                        gym: dayToUpdate.gym, home: dayToUpdate.home, focus: dayToUpdate.focus,
                        target_calories: dayToUpdate.target_calories, completed_exercises: dayToUpdate.completed_exercises
                    },
                    is_completed: dayToUpdate.completed
                }
            });

            let totalCaloriesBurned = 0;
            const allExercises = [...(dayToUpdate.gym?.exercises || []), ...(dayToUpdate.home?.exercises || [])];
            dayToUpdate.completed_exercises.forEach(id => {
                const ex = allExercises.find(e => (e.instance_id || e.name) === id);
                if (ex) totalCaloriesBurned += (ex.actual_calories_burned || ex.predicted_calories_burn || 0);
            });

            await convex.mutation(api.users.updateDailyStats, {
                userId: user.id, date: dayToUpdate.date,
                updates: { calories_burned: Math.round(totalCaloriesBurned), daily_exercise_completions: dayToUpdate.completed_exercises }
            });
            await addXP(10);
        } catch (err) { console.error("Failed to save exercise:", err); }
    };

    const replaceExercise = async (dayNumber, oldId, newExercise, mode = 'Gym') => {
        if (!user || isMock) return;
        const dayPlan = workoutSchedule.find(d => d.day_number === dayNumber);
        if (!dayPlan) return;

        const key = mode.toLowerCase(); // 'gym' or 'home'
        const updatedExercises = dayPlan[key].exercises.map(ex => {
            const exId = ex.instance_id || ex.name;
            if (exId === oldId) {
                return { ...newExercise, instance_id: oldId };
            }
            return ex;
        });

        const newPlanData = {
            ...dayPlan,
            [key]: {
                ...dayPlan[key],
                exercises: updatedExercises
            }
        };

        // We only want to send the exercises and metadata, not the top level id/date/etc if they are separate
        // But dayPlan was normalized from row.plan_data + extras.
        // Let's just be precise:
        const payload = {
            gym: key === 'gym' ? { ...dayPlan.gym, exercises: updatedExercises } : dayPlan.gym,
            home: key === 'home' ? { ...dayPlan.home, exercises: updatedExercises } : dayPlan.home,
            focus: dayPlan.focus,
            target_calories: dayPlan.target_calories,
            completed_exercises: dayPlan.completed_exercises
        };

        try {
            await convex.mutation(api.workouts.updatePlan, {
                id: dayPlan.id,
                updates: { plan_data: payload }
            });

            // Optimistic update
            setLocalWorkoutSchedule(prev => prev.map(d =>
                d.day_number === dayNumber ? { ...d, [key]: payload[key], plan_data: payload } : d
            ));
        } catch (e) {
            console.error("Replace failed:", e);
        }
    };

    const regenerateFullSchedule = async () => {
        if (!user || isMock) return;
        setLoading(true);
        try {
            if (workoutSchedule.length > 0) {
                const ids = workoutSchedule.map(d => d.id);
                await convex.mutation(api.workouts.deleteDailyPlans, { ids });
            }

            // Generate starting from today
            const startDate = new Date(todayStr);
            const schedule = generateWorkoutSchedule(userProfile, gymExercises, homeExercises, startDate, 1, 5);
            const dbRows = schedule.map(day => ({
                user_id: user.id, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false
            }));
            await convex.mutation(api.workouts.upsertDailyPlans, { userId: user.id, plans: dbRows });
            await convex.mutation(api.workouts.insertJobQueue, { user_id: user.id, status: 'completed', error_message: 'Manual Regeneration' });
        } catch (e) {
            console.error("Regeneration failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        if (isMock) { setIsMock(false); setUser(null); setMockProfile(null); return; }
        await signOut();
    };

    const updateProfile = async (updates) => {
        if (!user) return;
        if (isMock) { setMockProfile(prev => ({ ...prev, ...updates })); return; }

        const allowedFields = [
            'full_name', 'username', 'goal', 'activity_level', 'gender', 'weight', 'height', 'age',
            'target_weight', 'target_duration_weeks', 'daily_calories', 'meal_split', 'streak',
            'last_active_date', 'workout_xp', 'workout_level', 'push_token', 'timezone', 'country', 'state'
        ];
        const numericFields = ['weight', 'height', 'age', 'target_weight', 'target_duration_weeks', 'daily_calories', 'streak', 'workout_xp', 'workout_level'];

        const coercedUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                let val = updates[key];
                if (numericFields.includes(key) && val !== undefined && val !== null) {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) val = parsed;
                }
                coercedUpdates[key] = val;
            }
        });

        try {
            await convex.mutation(api.users.updateProfile, { userId: user.id, updates: coercedUpdates });
        } catch (error) { Alert.alert('Error updating profile', error.message); }
    };

    const calculateTargetsInternal = (profile) => {
        if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender) {
            return { tdee: 2000, targetCalories: 2000, mealSplit: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 } };
        }
        let bmr = 10 * Number(profile.weight) + 6.25 * Number(profile.height) - 5 * Number(profile.age) + (profile.gender === 'male' ? 5 : -161);
        const multis = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
        let tdee = bmr * (multis[profile.activity_level] || 1.2);
        let targetCalories = Math.round(tdee);

        if (profile.target_weight && profile.target_duration_weeks) {
            const deficit = ((Number(profile.weight) - Number(profile.target_weight)) * 7700) / (Number(profile.target_duration_weeks) * 7);
            targetCalories = Math.max(1000, Math.min(4000, Math.round(tdee - deficit)));
        } else {
            const adjust = { lose_weight: -500, maintain: 0, build_muscle: 300, improve_perf: 0 };
            targetCalories = Math.round(tdee + (adjust[profile.goal] || 0));
        }
        return {
            tdee: Math.round(tdee),
            targetCalories,
            mealSplit: profile.meal_split || { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
        };
    };

    const calculateTargets = (profile) => {
        const { targetCalories, mealSplit, tdee } = calculateTargetsInternal(profile);
        setNutritionTargets({
            calories: targetCalories, tdee, mealSplit,
            protein: Math.round((targetCalories * 0.3) / 4),
            carbs: Math.round((targetCalories * 0.4) / 4),
            fat: Math.round((targetCalories * 0.3) / 9)
        });
    };

    const completeOnboarding = async () => {
        if (!userProfile) return;
        const { targetCalories, mealSplit } = calculateTargetsInternal(userProfile);
        const updates = { daily_calories: targetCalories, meal_split: mealSplit };
        await updateProfile(updates);

        if (!workoutSchedule || workoutSchedule.length === 0) {
            // Use a date object created from today's local date string to ensure start alignment
            const startDate = new Date(todayStr);
            const schedule = generateWorkoutSchedule({ ...userProfile, ...updates }, gymExercises, homeExercises, startDate, 1, 5);
            const dbRows = schedule.map(day => ({
                user_id: user.id, date: day.date, day_number: day.day_number,
                plan_data: { gym: day.gym, home: day.home, focus: day.focus, target_calories: isNaN(day.target_calories) ? 0 : day.target_calories },
                is_completed: false
            }));
            await convex.mutation(api.workouts.upsertDailyPlans, { userId: user.id, plans: dbRows });
            await convex.mutation(api.workouts.insertJobQueue, { user_id: user.id, status: 'completed', error_message: 'Initial Onboarding' });
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const top10 = await convex.query(api.users.getLeaderboard, {});
            const myEntry = user ? top10.find(u => u.user_id === user.id) : null;
            return { top10, currentUserEntry: myEntry };
        } catch (e) { return { top10: [], currentUserEntry: null }; }
    };

    const fetchDailyStats = async (userId, date) => {
        if (!userId || !date) return null;
        try {
            return await convex.query(api.users.getDailyStats, { userId, date });
        } catch (e) { return null; }
    };

    return (
        <UserContext.Provider value={{
            user, userProfile, workoutSchedule, nutritionTargets, waterIntake, streak, loading, todayStr,
            isAuthenticated, hasCompletedOnboarding, isMock,
            login, signUp, verifySignUp, mockLogin, logout, updateProfile, completeOnboarding,
            updateWaterIntake, completeExercise, addXP, fetchLeaderboard, fetchDailyStats,
            regenerateFullSchedule, replaceExercise, gymExercises, homeExercises
        }}>
            {children}
        </UserContext.Provider>
    );
};
