import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
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
    const hasCompletedOnboarding = !!(userProfile?.goal && userProfile?.weight);

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

        const today = new Date().toISOString().split('T')[0];
        await supabase
            .from('daily_stats')
            .upsert({
                user_id: user.id,
                date: today,
                water_glasses: newTotal
            }, { onConflict: 'user_id,date' });
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const updateProfile = async (updates) => {
        if (!user) return;

        // Optimistic update
        const newProfile = { ...userProfile, ...updates };
        setUserProfile(newProfile);

        // If we have enough info, calculate targets locally and optimistic update them too
        calculateTargets(newProfile);

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

    const calculateTargets = (profile) => {
        const { targetCalories, mealSplit, tdee } = calculateTargetsInternal(profile);

        const protein = Math.round((targetCalories * 0.3) / 4);
        const carbs = Math.round((targetCalories * 0.4) / 4);
        const fat = Math.round((targetCalories * 0.3) / 9);

        setNutritionTargets(prev => ({
            ...prev,
            calories: targetCalories,
            tdee, // Store TDEE to show "Permitted" vs "Maintenance" if needed
            protein,
            carbs,
            fat,
            mealSplit
        }));
    };

    return (
        <UserContext.Provider value={{
            user,
            userProfile,
            nutritionTargets,
            waterIntake,
            streak,
            isAuthenticated,
            hasCompletedOnboarding,
            logout,
            updateProfile,
            updateWaterIntake,
            completeOnboarding,
            mockLogin,
            loading
        }}>
            {children}
        </UserContext.Provider>
    );
};
