import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import gymExercises from '../assets/gym_exercises.json';
import homeExercises from '../assets/home_exercises.json';
import { generateWorkoutSchedule, recalculateTargets } from '../utils/WorkoutGenerator';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [workoutSchedule, setWorkoutSchedule] = useState([]); // Now sources from workout_daily_plans
    const [isMock, setIsMock] = useState(false);
    const [nutritionTargets, setNutritionTargets] = useState({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        mealSplit: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
    });
    const [waterIntake, setWaterIntake] = useState(0);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    // Derived state for auth flow
    const isAuthenticated = !!user;
    // If user has a profile with goal/weight etc, they have completed onboarding
    const hasCompletedOnboarding = !!(userProfile?.goal && userProfile?.weight && userProfile?.daily_calories);

    useEffect(() => {
        // Check active sessions and subscribe to auth changes
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMock) return; // Don't overwrite mock session
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMock) return; // Don't overwrite mock session
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [isMock]);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });
        if (error) throw error;

        // If sign up is successful and we have a user, create an initial profile
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    full_name: fullName,
                    updated_at: new Date(),
                });
            if (profileError) console.error('Error creating profile:', profileError);
        }

        return data;
    };

    const mockLogin = () => {
        setIsMock(true);
        const mockUser = { id: 'mock-user-id', email: 'username' };
        setUser(mockUser);

        // Set a mock profile
        const mockProfile = {
            id: 'mock-user-id',
            full_name: 'Mock User',
            username: 'mockuser',
            goal: 'lose_weight',
            activity_level: 'moderately_active',
            gender: 'male',
            weight: 80, // Current weight
            height: 180,
            age: 25,
            target_weight: 75,
            target_duration_weeks: 12,
            daily_calories: 2200,
            meal_split: { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
        };
        setUserProfile(mockProfile);

        // Calculate and set targets
        calculateTargets(mockProfile);

        setLoading(false);
    };

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                setUserProfile(data);
                updateStreak(userId, data.streak || 0, data.last_active_date);
                fetchDailyStats(userId);
                fetchWorkoutSchedule(userId);
                // Always recalculate based on latest stats to ensure consistency
                calculateTargets(data);
            }
        } catch (e) {
            console.error('Exception fetching profile', e);
        } finally {
            setLoading(false);
        }
    };

    const updateStreak = async (userId, currentStreak, lastActiveDate) => {
        if (isMock) return;

        const today = new Date().toISOString().split('T')[0];

        if (lastActiveDate === today) {
            setStreak(currentStreak);
            return;
        }

        let newStreak = 1;
        if (lastActiveDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActiveDate === yesterdayStr) {
                newStreak = currentStreak + 1;
            }
        }

        setStreak(newStreak);

        await supabase
            .from('profiles')
            .update({
                streak: newStreak,
                last_active_date: today
            })
            .eq('id', userId);
    };

    const fetchDailyStats = async (userId) => {
        if (isMock) return;

        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('daily_stats')
            .select('water_glasses')
            .eq('user_id', userId)
            .eq('date', today)
            .single();

        if (data) {
            setWaterIntake(data.water_glasses);
        } else {
            setWaterIntake(0);
            // Create record for today
            await supabase.from('daily_stats').insert({ user_id: userId, date: today, water_glasses: 0 });
        }
    };

    const fetchWorkoutSchedule = async (userId, profile) => {
        if (isMock) return;

        try {
            // Fetch active days from workout_daily_plans
            const { data, error } = await supabase
                .from('workout_daily_plans')
                .select('*')
                .eq('user_id', userId)
                .order('day_number', { ascending: true });

            if (error) {
                console.error('Error fetching workout schedule:', error);
                return;
            }

            // Transform for UI: blend table cols with json plan_data
            const formattedSchedule = data.map(row => ({
                ...row.plan_data, // gym, home, focus, etc.
                id: row.id,
                day_number: row.day_number,
                date: row.date,
                completed: row.is_completed,
                calories_burned: row.calories_burned
            }));

            setWorkoutSchedule(formattedSchedule);

            if (profile) {
                manageWorkoutSchedule(userId, formattedSchedule, profile);
            }
        } catch (err) {
            console.error("Fetch schedule error:", err);
        }
    };


    const manageWorkoutSchedule = async (userId, currentSchedule, profile) => {
        if (!currentSchedule || !profile) return;

        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // 1. Archive Past Days (strictly older than today)
        const pastDays = currentSchedule.filter(d => d.date < today);

        if (pastDays.length > 0) {
            console.log("Archiving past days...", pastDays.length);
            const historyEntries = pastDays.map(d => ({
                user_id: userId,
                date: d.date,
                summary_data: {
                    day_number: d.day_number,
                    focus: d.focus,
                    calories_target: d.target_calories,
                    calories_burned: d.calories_burned || 0,
                    completed: d.completed
                },
                original_plan_snapshot: d
            }));

            const { error: histError } = await supabase.from('workout_history').insert(historyEntries);
            if (!histError) {
                const idsToDelete = pastDays.map(d => d.id);
                await supabase.from('workout_daily_plans').delete().in('id', idsToDelete);

                // Refresh local state excluding archived
                const active = currentSchedule.filter(d => d.date >= today);
                setWorkoutSchedule(active);
                currentSchedule = active; // Update ref for next step
            } else {
                console.error("Failed to archive:", histError);
            }
        }

        // 2. Check & Generate Next Block
        const activeDays = currentSchedule.filter(d => d.date >= today);

        if (activeDays.length < 3) {
            console.log("Low on workout days, triggering generation...");

            let lastDayDate = new Date();
            let lastDayNumber = 0;

            if (activeDays.length > 0) {
                const lastDay = activeDays[activeDays.length - 1];
                lastDayDate = new Date(lastDay.date);
                lastDayNumber = lastDay.day_number;
            }

            // Start from Next Day
            const nextBlockStartDate = new Date(lastDayDate);
            if (activeDays.length > 0) {
                nextBlockStartDate.setDate(lastDayDate.getDate() + 1);
            }

            // Recalibrate Targets
            // Calculate remaining duration based on goal
            const totalDurationDays = (profile.target_duration_weeks || 4) * 7;
            const completedDaysCount = lastDayNumber;
            const remainingDays = totalDurationDays - completedDaysCount;

            // Recalulate daily burn
            const newDailyBurn = recalculateTargets(
                profile.weight,
                profile.target_weight || profile.weight,
                remainingDays > 0 ? remainingDays : 30
            );

            // Generate 5 Days
            const newBlock = generateWorkoutSchedule(
                { ...profile, recalculatedDailyBurn: newDailyBurn },
                gymExercises,
                homeExercises,
                nextBlockStartDate,
                lastDayNumber + 1,
                5
            );

            // Save to DB
            const dbRows = newBlock.map(day => ({
                user_id: userId,
                date: day.date,
                day_number: day.day_number,
                plan_data: {
                    gym: day.gym,
                    home: day.home,
                    focus: day.focus,
                    target_calories: day.target_calories
                },
                is_completed: false
            }));

            const { error: insError } = await supabase.from('workout_daily_plans').insert(dbRows);
            if (!insError) {
                console.log("Generated new block successfully.");

                // Add to job queue for record keeping (as requested)
                await supabase.from('workout_job_queue').insert({
                    user_id: userId,
                    status: 'completed',
                    error_message: 'Generated client-side via rolling logic'
                });

                // Update UI state
                // We could re-fetch, but let's just append locally for speed if simple
                // Actually safer to re-fetch to get IDs
                fetchWorkoutSchedule(userId);
            } else {
                console.error("Generation save failed:", insError);
            }
        }
    };


    const updateWaterIntake = async (glasses) => {
        if (!user) return;

        const newTotal = glasses;
        setWaterIntake(newTotal);

        if (newTotal === 12) { // 3L goal
            if (Constants.appOwnership === 'expo') {
                // In Expo Go, stick to Alert to avoid push notification SDK crashes
                Alert.alert("Goal Reached! 💧", "You've reached your 3L daily water goal. Great job staying hydrated!");
            } else {
                try {
                    const Notifications = require('expo-notifications');
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Goal Reached! 💧",
                            body: "You've reached your 3L daily water goal. Great job staying hydrated!",
                        },
                        trigger: null,
                    });
                } catch (e) {
                    console.log("Notification failed", e);
                    Alert.alert("Goal Reached! 💧", "You've reached your 3L daily water goal. Great job staying hydrated!");
                }
            }
        }

        if (isMock) return;

        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        await supabase
            .from('daily_stats')
            .upsert({
                user_id: user.id,
                date: today,
                water_glasses: newTotal
            }, { onConflict: 'user_id,date' });
    };

    const completeExercise = async (dayNumber, exerciseId) => {
        if (!user || !userProfile) return;

        let dayId = null;
        let newXp = (userProfile.workout_xp || 0);

        const newSchedule = workoutSchedule.map(day => {
            if (day.day_number === dayNumber) {
                dayId = day.id;
                const completions = day.completed_exercises || [];
                const alreadyDone = completions.includes(exerciseId);

                let updatedCompletions;
                if (alreadyDone) {
                    updatedCompletions = completions.filter(id => id !== exerciseId);
                    newXp -= 10;
                } else {
                    updatedCompletions = [...completions, exerciseId];
                    newXp += 10;
                }

                return {
                    ...day,
                    completed_exercises: updatedCompletions,
                    completed: updatedCompletions.length > 0
                };
            }
            return day;
        });

        setWorkoutSchedule(newSchedule);

        let newLevel = userProfile.workout_level || 1;
        if (newXp >= 5001) newLevel = 5;
        else if (newXp >= 5000) newLevel = 4;
        else if (newXp >= 3500) newLevel = 3;
        else if (newXp >= 2000) newLevel = 2;
        else newLevel = 1;

        await updateProfile({
            workout_xp: Math.max(0, newXp),
            workout_level: newLevel
        });

        if (isMock || !dayId) return;

        try {
            const dayToUpdate = newSchedule.find(d => d.id === dayId);
            const planDataToUpdate = {
                gym: dayToUpdate.gym,
                home: dayToUpdate.home,
                focus: dayToUpdate.focus,
                target_calories: dayToUpdate.target_calories,
                completed_exercises: dayToUpdate.completed_exercises
            };

            const { error } = await supabase
                .from('workout_daily_plans')
                .update({
                    plan_data: planDataToUpdate,
                    is_completed: dayToUpdate.completed
                })
                .eq('id', dayId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to save exercise completion:", err);
        }
    };

    const replaceExercise = async (dayNumber, oldExerciseId, newExercise, mode) => {
        if (!user || 0 === workoutSchedule.length) return;

        // 1. Find the day to update
        const dayIndex = workoutSchedule.findIndex(d => d.day_number === dayNumber);
        if (dayIndex === -1) return;

        const day = workoutSchedule[dayIndex];
        const targetPlan = mode === 'Gym' ? day.gym : day.home;

        // 2. Find and replace the exercise in the list
        const updatedExercises = targetPlan.exercises.map(ex => {
            const currentId = ex.instance_id || ex.name;
            if (currentId === oldExerciseId) {
                return {
                    ...ex,
                    ...newExercise,
                    instance_id: ex.instance_id, // Keep same ID
                };
            }
            return ex;
        });

        // 3. Recalculate totals for that session (Gym or Home)
        const newTotalBurn = updatedExercises.reduce((sum, ex) => sum + (ex.predicted_calories_burn || 0), 0);
        const newTotalDuration = updatedExercises.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);

        // 4. Construct updated day object
        const updatedDay = {
            ...day,
            [mode.toLowerCase()]: {
                ...targetPlan,
                exercises: updatedExercises,
                total_calories: newTotalBurn,
                duration_minutes: newTotalDuration
            }
        };

        // 5. Update Local State immediately
        const newSchedule = [...workoutSchedule];
        newSchedule[dayIndex] = updatedDay;
        setWorkoutSchedule(newSchedule);

        if (isMock) return;

        // 6. Update Database
        try {
            // We need to fetch the current row first to merge correctly if we only have partial data? 
            // Actually we have the full 'plan_data' structure constructed above in 'updatedDay'.
            // But wait, 'workoutSchedule' in state is flattened (id, date, day_number, gym, home...).
            // The DB column 'plan_data' expects { gym: ..., home: ..., focus: ..., target_calories: ... }

            const planDataToSave = {
                gym: updatedDay.gym,
                home: updatedDay.home,
                focus: updatedDay.focus,
                target_calories: updatedDay.target_calories,
                completed_exercises: updatedDay.completed_exercises || []
            };

            const { error } = await supabase
                .from('workout_daily_plans')
                .update({ plan_data: planDataToSave })
                .eq('id', day.id);

            if (error) throw error;

        } catch (err) {
            console.error("Failed to replace exercise:", err);
            Alert.alert("Error", "Could not save changes.");
        }
    };


    const logout = async () => {
        if (isMock) {
            setIsMock(false);
            setUser(null);
            setUserProfile(null);
        }
        await supabase.auth.signOut();
    };

    const updateProfile = async (updates) => {
        if (!user) return;

        // Check if we need to regenerate schedule
        // Triggers: weight, target_weight, target_duration_weeks
        const needsRegeneration = (
            (updates.weight && updates.weight !== userProfile.weight) ||
            (updates.target_weight && updates.target_weight !== userProfile.target_weight) ||
            (updates.target_duration_weeks && updates.target_duration_weeks !== userProfile.target_duration_weeks) ||
            (updates.workout_level && updates.workout_level !== userProfile.workout_level)
        );

        // Optimistic update
        const newProfile = { ...userProfile, ...updates };
        setUserProfile(newProfile);

        // If we have enough info, calculate targets locally and optimistic update them too
        calculateTargets(newProfile);

        if (needsRegeneration) {
            // For rolling schedule, we just let the next manage cycle handle it,
            // OR if user wants immediate update, we could clear future days.
            // But for now, let's just log.
            console.log("Profile updated. Rolling generation will use new stats.");
        }

        if (isMock) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    updated_at: new Date(),
                    ...updates,
                });

            if (error) throw error;
        } catch (error) {
            Alert.alert('Error updating profile', error.message);
        }
    };

    const completeOnboarding = async () => {
        // Calculate final targets and save to various fields
        if (!userProfile) return;

        const { targetCalories, mealSplit } = calculateTargetsInternal(userProfile);

        const updates = {
            daily_calories: targetCalories,
            meal_split: mealSplit,
            // userProfile already has weight, height, goal etc from previous steps used in calculateTargetsInternal
        };

        await updateProfile(updates);

        // Generate initial workout schedule
        // Note: updateProfile might handle regeneration, but for initial onboarding we might need fresh generation if none exists.
        // Actually updateProfile only regenerates if workoutSchedule has length > 0.
        // So we explicitly generate here.
        if (!workoutSchedule || workoutSchedule.length === 0) {
            const schedule = generateWorkoutSchedule(
                { ...userProfile, ...updates },
                gymExercises,
                homeExercises,
                new Date(),
                1,
                5
            );

            const dbRows = schedule.map(day => ({
                user_id: user.id,
                date: day.date,
                day_number: day.day_number,
                plan_data: {
                    gym: day.gym,
                    home: day.home,
                    focus: day.focus,
                    target_calories: day.target_calories
                },
                is_completed: false
            }));

            const { error } = await supabase.from('workout_daily_plans').insert(dbRows);
            if (!error) {
                fetchWorkoutSchedule(user.id, { ...userProfile, ...updates });
                // Log queue completion
                await supabase.from('workout_job_queue').insert({
                    user_id: user.id,
                    status: 'completed',
                    error_message: 'Initial Onboarding Generation'
                });
            }
        }
    };
    const calculateTargetsInternal = (profile) => {
        if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender) {
            return {
                tdee: 2000,
                targetCalories: 2000,
                mealSplit: nutritionTargets.mealSplit || { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 }
            };
        }

        // Mifflin-St Jeor Equation
        let bmr = 10 * Number(profile.weight) + 6.25 * Number(profile.height) - 5 * Number(profile.age);
        bmr += (profile.gender === 'male' ? 5 : -161);

        // Activity Multiplier
        const multipliers = {
            sedentary: 1.2,
            lightly_active: 1.375,
            moderately_active: 1.55,
            very_active: 1.725,
            extra_active: 1.9,
        };

        // Ensure we handle inconsistent key names (activity vs activity_level) if they occur
        const activityLvl = profile.activity_level || profile.activity || 'sedentary';
        let tdee = bmr * (multipliers[activityLvl] || 1.2);
        let targetCalories = Math.round(tdee);

        // Custom Calculation based on Target Weight & Duration
        if (profile.target_weight && profile.target_duration_weeks) {
            const currentWeight = Number(profile.weight);
            const targetWeight = Number(profile.target_weight);
            const durationWeeks = Number(profile.target_duration_weeks);

            // 1kg of fat ≈ 7700 kcal
            const totalDiffKg = currentWeight - targetWeight;
            const totalDiffKcal = totalDiffKg * 7700;
            const weeklyDeficit = totalDiffKcal / durationWeeks;
            const dailyDeficit = weeklyDeficit / 7;

            // Apply deficit (Note: if losing weight, totalDiff is positive, so we subtract dailyDeficit)
            targetCalories = Math.round(tdee - dailyDeficit);

            // Safety Limits: Don't go below BMR or 1200 kcal loosely
            // For safety, let's clamp strictly at 1200 for women / 1500 for men? 
            // Or just simple 1000 minimum for now.
            if (targetCalories < 1000) targetCalories = 1000;
            // Don't recommend crazy surplus either
            if (targetCalories > 4000) targetCalories = 4000;

        } else {
            // Fallback to simple goal adjustment if no target weight set
            const goalAdjustments = {
                lose_weight: -500,
                maintain: 0,
                build_muscle: 300,
                improve_perf: 0
            };
            targetCalories = Math.round(tdee + (goalAdjustments[profile.goal] || 0));
        }

        const mealSplit = { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

        return { tdee: Math.round(tdee), targetCalories, mealSplit };
    };

    const regenerateFullSchedule = async () => {
        if (!user || !userProfile) return;

        try {
            // Clear existing *future* plans? Or just clear all active ones?
            // "Regenerate Plan" usually implies starting fresh.
            // Let's delete all from workout_daily_plans and start over.
            await supabase.from('workout_daily_plans').delete().eq('user_id', user.id);

            const schedule = generateWorkoutSchedule(
                userProfile,
                gymExercises,
                homeExercises,
                new Date(),
                1,
                5
            );

            const dbRows = schedule.map(day => ({
                user_id: user.id,
                date: day.date,
                day_number: day.day_number,
                plan_data: {
                    gym: day.gym,
                    home: day.home,
                    focus: day.focus,
                    target_calories: day.target_calories
                },
                is_completed: false
            }));

            await supabase.from('workout_daily_plans').insert(dbRows);
            fetchWorkoutSchedule(user.id);
            Alert.alert("Success", "Rolling workout plan generated successfully!");
        } catch (error) {
            console.error("Error regenerating schedule:", error);
            Alert.alert("Error", "Failed to generate workout plan.");
        }
    };

    const calculateTargets = (profile) => {
        const { targetCalories, mealSplit, tdee } = calculateTargetsInternal(profile);

        const protein = Math.round((targetCalories * 0.3) / 4);
        const carbs = Math.round((targetCalories * 0.4) / 4);
        const fat = Math.round((targetCalories * 0.3) / 9);

        setNutritionTargets(prev => ({
            ...prev,
            calories: targetCalories,
            tdee,
            protein,
            carbs,
            fat,
            mealSplit
        }));
    };

    const fetchLeaderboard = async (scope, filter) => {
        if (isMock) {
            return [
                { rank: 1, user_id: 'user1', username: 'FitnessPro', workout_xp: 5000, workout_level: 5 },
                { rank: 2, user_id: 'mock-user-id', username: 'mockuser', workout_xp: 3500, workout_level: 3 },
                { rank: 3, user_id: 'user3', username: 'GymWarrior', workout_xp: 3000, workout_level: 3 },
            ];
        }

        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, username, workout_xp, workout_level, country, state')
                .not('workout_xp', 'is', null)
                .gt('workout_xp', 0);

            // Apply scope filter - only country or state
            if (scope === 'country' && filter) {
                query = query.eq('country', filter);
            } else if (scope === 'state' && filter) {
                query = query.eq('state', filter);
            }

            // Fetch top 10 to account for current user display logic
            query = query.order('workout_xp', { ascending: false }).limit(10);

            const { data, error } = await query;

            if (error) throw error;

            return data.map((entry, index) => ({
                rank: index + 1,
                user_id: entry.id,
                username: entry.username || entry.full_name || 'Anonymous',
                workout_xp: entry.workout_xp || 0,
                workout_level: entry.workout_level || 1
            }));
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    };


    return (
        <UserContext.Provider value={{
            user,
            userProfile,
            workoutSchedule,
            nutritionTargets,
            waterIntake,
            streak,
            isAuthenticated,
            hasCompletedOnboarding,
            logout,
            updateProfile,
            updateWaterIntake,
            completeExercise,
            completeOnboarding,
            regenerateFullSchedule,
            fetchLeaderboard,
            login,
            isMock,
            signUp,
            loading,
            replaceExercise,
            gymExercises,
            homeExercises
        }}>
            {children}
        </UserContext.Provider>
    );
};
