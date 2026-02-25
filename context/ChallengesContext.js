import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { useFood } from './FoodContext';
import { wearableService } from '../services/WearableService';
import { Alert } from 'react-native';

const ChallengesContext = createContext();

export const useChallenges = () => useContext(ChallengesContext);

export const ChallengesProvider = ({ children }) => {
    const { user, isMock, addXP: userAddXP, userProfile, waterIntake } = useUser();
    const { dailyLog, getDailySummary } = useFood();
    const [challenges, setChallenges] = useState([]);
    const [userChallenges, setUserChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchChallenges();
            fetchUserChallenges();
        } else {
            setChallenges([]);
            setUserChallenges([]);
            setLoading(false);
        }
    }, [user]);

    // Automatic verification when relevant data changes
    useEffect(() => {
        if (user && !loading && challenges.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const summary = getDailySummary(today);
            verifyChallenges([], waterIntake, summary.calories);
        }
    }, [waterIntake, dailyLog, challenges.length]);

    const fetchChallenges = async () => {
        if (isMock) {
            setChallenges(mockChallenges);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('status', 'active')
                .gt('end_time', new Date().toISOString())
                .order('end_time', { ascending: true });

            if (error) throw error;
            setChallenges(data || []);
        } catch (e) {
            console.error("Error fetching challenges:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserChallenges = async () => {
        if (isMock || !user) return;

        try {
            const { data, error } = await supabase
                .from('user_challenges')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            setUserChallenges(data || []);
        } catch (e) {
            console.error("Error fetching user challenges:", e);
        }
    };

    const joinChallenge = async (challengeId) => {
        if (!user) return;

        // Optimistic update
        const newEntry = {
            user_id: user.id,
            challenge_id: challengeId,
            status: 'joined',
            progress: 0,
            joined_at: new Date().toISOString()
        };

        setUserChallenges(prev => [...prev, newEntry]);

        // Update local challenge participant count optimistically
        setChallenges(prev => prev.map(c =>
            c.id === challengeId
                ? { ...c, participants_count: (c.participants_count || 0) + 1 }
                : c
        ));

        if (isMock) return;

        try {
            const { error } = await supabase
                .from('user_challenges')
                .insert([{
                    user_id: user.id,
                    challenge_id: challengeId
                }]);

            if (error) throw error;

            // Re-fetch to confirm sync
            await fetchUserChallenges();

            // Immediate verification after joining
            setTimeout(() => verifyChallenges(), 500);
        } catch (e) {
            console.error("Error joining challenge:", e);
            Alert.alert("Failed to join challenge");
            // Revert optimistic
            setUserChallenges(prev => prev.filter(uc => uc.challenge_id !== challengeId));
            setChallenges(prev => prev.map(c =>
                c.id === challengeId
                    ? { ...c, participants_count: (c.participants_count || 0) - 1 }
                    : c
            ));
        }
    };

    const verifyChallenges = async (providedWearableData = [], providedWater = null, providedKcal = null) => {
        if (!user || isMock) return;

        let wearableData = providedWearableData;
        const currentWater = providedWater !== null ? providedWater : waterIntake;

        // Get today's calories if not provided
        let currentKcal = providedKcal;
        if (currentKcal === null) {
            const today = new Date().toISOString().split('T')[0];
            currentKcal = getDailySummary(today).calories;
        }

        const activeJoined = userChallenges.filter(uc => uc.status === 'joined');
        if (activeJoined.length === 0) return;

        // If wearable metrics are needed and not provided, fetch them
        const needsWearable = activeJoined.some(uc => {
            const c = challenges.find(ch => ch.id === uc.challenge_id);
            return c && (c.type === 'steps' || c.type === 'sleep');
        });

        if (needsWearable && wearableData.length === 0) {
            try {
                wearableData = await wearableService.getHistory(30);
            } catch (e) {
                console.log("Failed to fetch wearable data for verification", e);
            }
        }

        let anyCompleted = false;

        for (const uc of activeJoined) {
            const challenge = challenges.find(c => c.id === uc.challenge_id);
            if (!challenge) continue;

            const joinedAt = new Date(uc.joined_at);
            const endTime = new Date(challenge.end_time);
            const now = new Date();

            let isCompleted = false;

            // --- Steps Challenge ---
            if (challenge.type === 'steps') {
                // Sum steps in wearableData whose date falls between joinedAt and endTime
                let totalSteps = 0;
                wearableData.forEach(day => {
                    const dayDate = new Date(day.date);
                    if (dayDate >= joinedAt && dayDate <= endTime) {
                        totalSteps += day.steps;
                    }
                });
                if (totalSteps >= challenge.target_value) {
                    isCompleted = true;
                }
            }

            // --- Water Challenge ---
            else if (challenge.type === 'water') {
                // Goal is now in Litres (e.g. 3.0)
                const targetValue = parseFloat(challenge.target_value || 3.0);
                if (currentWater >= targetValue) {
                    isCompleted = true;
                }
            }

            // --- Calories Challenge (Eat Healthy) ---
            else if (challenge.type === 'calories') {
                // Assuming target_value is the max limit. We might need a duration check, 
                // but for MVP, if currentKcal > 0 and currentKcal <= target_value (and say it's end of day)
                // We'll mark completed if they drop below the target on any day or just check daily limit.
                // Reusing simple logic: if currentKcal > 0 and currentKcal <= target_value, completed.
                if (currentKcal > 0 && currentKcal <= challenge.target_value) {
                    isCompleted = true;
                }
            }

            // --- Sleep Challenge (Early Sleep) ---
            else if (challenge.type === 'sleep') {
                // Check if they slept before specific time (e.g. 11 PM) or met duration
                // target_value could be minutes (e.g. 420 for 7 hours)
                let metSleepGoal = false;
                wearableData.forEach(day => {
                    const dayDate = new Date(day.date);
                    if (dayDate >= joinedAt && dayDate <= endTime) {
                        // Check duration
                        if (day.sleep_minutes >= challenge.target_value) {
                            metSleepGoal = true;
                        }
                    }
                });
                if (metSleepGoal) isCompleted = true;
            }

            // --- Custom Challenge ---
            else if (challenge.type === 'custom') {
                // Progress is number of distinct days logged in daily_logs
                const logs = uc.daily_logs || [];
                if (logs.length >= challenge.target_value) {
                    isCompleted = true;
                }
            }

            if (isCompleted) {
                anyCompleted = true;
                console.log(`Challenge Completed: ${challenge.title}`);
                Alert.alert("Challenge Completed! 🎉", `You completed '${challenge.title}' and earned ${challenge.xp_reward} XP!`);

                // Reward XP
                if (userAddXP) {
                    userAddXP(challenge.xp_reward);
                }

                // Update DB
                try {
                    await supabase
                        .from('user_challenges')
                        .update({
                            status: 'completed',
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', uc.id);

                    // Optimistic update
                    setUserChallenges(prev => prev.map(u =>
                        u.id === uc.id ? { ...u, status: 'completed', completed_at: new Date().toISOString() } : u
                    ));
                } catch (e) {
                    console.error("Failed to mark challenge complete in DB", e);
                }
            }
        }

        if (anyCompleted) {
            fetchUserChallenges();
        }
    };

    const seedDefaultChallenges = async () => {
        if (isMock) return;

        // check if any exist
        const { count } = await supabase.from('challenges').select('*', { count: 'exact', head: true });
        if (count > 0) return;

        const now = new Date();
        const end3Days = new Date(now); end3Days.setDate(now.getDate() + 3);
        const end7Days = new Date(now); end7Days.setDate(now.getDate() + 7);

        const defaults = [
            {
                title: '10K Steps Daily',
                description: 'Walk 10,000 steps every day to stay active.',
                xp_reward: 500,
                start_time: now.toISOString(),
                end_time: end7Days.toISOString(),
                type: 'steps',
                target_value: 10000,
                participants_count: 2314
            },
            {
                title: 'Hydration Master',
                description: 'Drink 3 Litres of water today.',
                xp_reward: 150,
                start_time: now.toISOString(),
                end_time: end3Days.toISOString(),
                type: 'water',
                target_value: 3,
                participants_count: 1542
            },
            {
                title: 'Eat Healthy',
                description: 'Keep your daily calorie intake under your goal.',
                xp_reward: 300,
                start_time: now.toISOString(),
                end_time: end3Days.toISOString(),
                type: 'calories',
                target_value: 2000,
                participants_count: 3421
            },
            {
                title: 'Early Sleep',
                description: 'Get at least 7 hours of sleep tonight.',
                xp_reward: 400,
                start_time: now.toISOString(),
                end_time: end3Days.toISOString(),
                type: 'sleep',
                target_value: 420, // minutes
                participants_count: 1890
            }
        ];

        await supabase.from('challenges').insert(defaults);
        fetchChallenges();
    };

    const createChallenge = async (challengeData) => {
        if (isMock) {
            const newMock = { ...challengeData, id: Math.random().toString(), participants_count: 0, status: 'active' };
            setChallenges(prev => [...prev, newMock]);
            return newMock;
        }

        try {
            const { data, error } = await supabase
                .from('challenges')
                .insert([{
                    ...challengeData,
                    status: 'active',
                    participants_count: 0,
                    creator_id: user.id
                }])
                .select()
                .single();

            if (error) throw error;

            setChallenges(prev => [...prev, data]);

            // Auto-join the creator
            await joinChallenge(data.id);

            // Trigger verification for the new challenge
            setTimeout(() => verifyChallenges(), 800);

            return data;
        } catch (e) {
            console.error("Error creating challenge:", e);
            throw e;
        }
    };

    const markDailyProgress = async (userChallengeId, date, completed) => {
        if (isMock) return;

        try {
            let freshLogs = [];

            // Use functional update to avoid stale closure issue
            setUserChallenges(prev => {
                const uc = prev.find(u => u.id === userChallengeId);
                if (!uc) return prev;

                let logs = Array.isArray(uc.daily_logs) ? [...uc.daily_logs] : [];
                if (completed) {
                    if (!logs.includes(date)) logs = [...logs, date];
                } else {
                    logs = logs.filter(d => d !== date);
                }
                freshLogs = logs;

                return prev.map(u => u.id === userChallengeId ? { ...u, daily_logs: logs } : u);
            });

            // Small delay to let state settle before DB write
            await new Promise(r => setTimeout(r, 50));

            // Update DB
            const { error } = await supabase
                .from('user_challenges')
                .update({ daily_logs: freshLogs })
                .eq('id', userChallengeId);

            if (error) throw error;

            // Verify completion against target
            setTimeout(() => verifyChallenges(), 300);
        } catch (e) {
            console.error("Error marking daily progress:", e);
        }
    };

    return (
        <ChallengesContext.Provider value={{
            challenges,
            userChallenges,
            loading,
            fetchChallenges,
            joinChallenge,
            verifyChallenges,
            seedDefaultChallenges,
            createChallenge,
            markDailyProgress
        }}>
            {children}
        </ChallengesContext.Provider>
    );
};

const mockChallenges = [
    {
        id: '1',
        title: '10K Steps Daily',
        description: 'Walk 10,000 steps every day to stay active.',
        xp_reward: 500,
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'steps',
        target_value: 10000,
        participants_count: 2314
    },
    {
        id: '2',
        title: 'Hydration Master',
        description: 'Drink 12 glasses of water today.',
        xp_reward: 150,
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'water',
        target_value: 12,
        participants_count: 5120
    },
    {
        id: '3',
        title: 'Eat Healthy',
        description: 'Keep your daily calorie intake under your goal.',
        xp_reward: 300,
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'calories',
        target_value: 2000,
        participants_count: 3421
    },
    {
        id: '4',
        title: 'Early Sleep',
        description: 'Get at least 7 hours of sleep tonight.',
        xp_reward: 400,
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'sleep',
        target_value: 420,
        participants_count: 1890
    }
];
