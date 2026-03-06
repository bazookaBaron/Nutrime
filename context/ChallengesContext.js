import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from './UserContext';
import { useFood } from './FoodContext';
import { Alert } from 'react-native';
import { getTodayISODate } from '../utils/DateUtils';
import { useAlert } from './AlertContext';

const ChallengesContext = createContext();

export const useChallenges = () => useContext(ChallengesContext);

export const ChallengesProvider = ({ children }) => {
    const { user, isMock, addXP: userAddXP, userProfile, waterIntake, todayStr } = useUser();
    const convex = useConvex();
    const { dailyLog, getDailySummary } = useFood();
    const { showAlert } = useAlert();

    // ---- Reactive Data Source (Convex) ----
    const dbChallenges = useQuery(api.challenges.getActive, {});
    const dbUserChallenges = useQuery(api.challenges.getUserChallenges, user ? { userId: user.id } : "skip");

    // Local state for optimistic updates
    const [localChallenges, setLocalChallenges] = useState([]);
    const [localUserChallenges, setLocalUserChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const completedProcessed = useRef(new Set());

    // Sync local state when DB data changes
    useEffect(() => {
        if (dbChallenges) {
            setLocalChallenges(dbChallenges.map(c => ({ ...c, id: c._id })));
        }
    }, [dbChallenges]);

    useEffect(() => {
        if (dbUserChallenges) {
            setLocalUserChallenges(dbUserChallenges.map(u => ({ ...u, id: u._id })));

            // Sync completedProcessed with actual DB status to allow re-verification 
            // of new joins while keeping track of what's already done.
            dbUserChallenges.forEach(uc => {
                if (uc.status === 'completed') {
                    completedProcessed.current.add(uc._id);
                }
            });

            setLoading(false);
        } else if (!user) {
            setLocalUserChallenges([]);
            completedProcessed.current.clear();
            setLoading(false);
        }
    }, [dbUserChallenges, user]);

    // Use local state as the source of truth for the UI
    const challenges = isMock ? mockChallenges : localChallenges;
    const userChallenges = isMock ? [] : localUserChallenges;

    // Automatic verification when relevant data changes
    useEffect(() => {
        if (user && !loading && challenges.length > 0) {
            const today = todayStr;
            const summary = getDailySummary(today);
            verifyChallenges([], waterIntake, summary.calories);
        }
    }, [waterIntake, dailyLog, challenges.length, userChallenges, todayStr, user, loading]);

    const fetchChallenges = async () => {
        // No longer needed due to useQuery, but kept for interface compatibility if needed elsewhere
    };

    const fetchUserChallenges = async () => {
        // No longer needed due to useQuery, but kept for interface compatibility if needed elsewhere
    };

    const joinChallenge = async (challengeId) => {
        if (!user || !challengeId) return;

        // Optimistic update
        const newEntry = {
            id: 'temp-' + Date.now(),
            user_id: user.id,
            challenge_id: challengeId,
            status: 'joined',
            progress: 0,
            joined_at: new Date().toISOString()
        };

        setLocalUserChallenges(prev => [...prev, newEntry]);

        // Update local challenge participant count optimistically
        setLocalChallenges(prev => prev.map(c =>
            c.id === challengeId
                ? { ...c, participants_count: (c.participants_count || 0) + 1 }
                : c
        ));

        if (isMock) return;

        try {
            await convex.mutation(api.challenges.join, { userId: user.id, challengeId });
        } catch (e) {
            console.error("Error joining challenge:", e);
            showAlert("Join Failed", "Failed to join challenge");
            // Rollback optimistic update
            setLocalUserChallenges(prev => prev.filter(uc => uc.challenge_id !== challengeId));
            setLocalChallenges(prev => prev.map(c =>
                c.id === challengeId ? { ...c, participants_count: (c.participants_count || 0) - 1 } : c
            ));
            throw e; // RE-THROW for screen-level catch
        }
    };

    const verifyChallenges = async (providedWearableData = [], providedWater = null, providedKcal = null) => {
        if (!user || isMock) return;

        let wearableData = providedWearableData;
        const currentWater = providedWater !== null ? providedWater : waterIntake;

        // Get today's calories if not provided
        let currentKcal = providedKcal;
        if (currentKcal === null) {
            const today = todayStr;
            currentKcal = getDailySummary(today).calories;
        }

        const activeJoined = userChallenges.filter(uc => uc.status === 'joined');
        if (activeJoined.length === 0) return;

        let anyCompleted = false;

        for (const uc of activeJoined) {
            const challenge = challenges.find(c => c.id === uc.challenge_id);
            if (!challenge) continue;

            const joinedAt = new Date(uc.joined_at);
            const endTime = new Date(challenge.end_time);
            const now = new Date();

            let isCompleted = false;

            const logs = uc.daily_logs || [];
            // Use duration_days if available, otherwise fallback to target_value (especially for older custom challenges)
            const duration = challenge.duration_days || challenge.target_value || 1;

            // --- Water Challenge (Auto-completion for today) ---
            if (challenge.type === 'water') {
                const targetValue = parseFloat(challenge.target_value || 3.0);
                if (currentWater >= targetValue) {
                    // Automatically add today's date if not already there
                    const todayDate = todayStr;
                    if (!logs.includes(todayDate)) {
                        markDailyProgress(uc.id, todayDate, true);
                        // Since markDailyProgress updates state asynchronously, 
                        // we push it to our local tracking array for the duration check below
                        logs.push(todayDate);
                    }
                }
            }

            // --- All Challenges: Check Overall Completion ---
            // A challenge is completed if the user has manually (or automatically for water) 
            // checked off enough distinct days (duration_days) in `daily_logs`.
            if (logs.length >= duration) {
                isCompleted = true;
            }

            if (isCompleted && !completedProcessed.current.has(uc.id)) {
                completedProcessed.current.add(uc.id);
                anyCompleted = true;

                // If it's a "custom" challenge being verified for the first time, or if we just joined,
                // we might want to avoid an immediate alert that clashes with the "Join Success" UI.
                const isInstantCompletion = uc.id.toString().startsWith('temp-');

                if (!isInstantCompletion) {
                    console.log(`Challenge Completed: ${challenge.title}`);
                    showAlert("Challenge Completed! 🎉", `You completed '${challenge.title}' and earned ${challenge.xp_reward} XP!`);
                }

                // Reward XP
                if (userAddXP) {
                    userAddXP(challenge.xp_reward);
                }

                // Optimistic update
                setLocalUserChallenges(prev => prev.map(u =>
                    u.id === uc.id ? { ...u, status: 'completed', completed_at: new Date().toISOString() } : u
                ));

                // Update DB
                try {
                    await convex.mutation(api.challenges.markCompleted, { id: uc._id || uc.id });
                } catch (e) {
                    console.error("Failed to mark challenge complete in DB", e);
                }
            }
        }
    };

    const seedDefaultChallenges = async () => {
        // Disabled per user request: "donot add any list on database on your own"
        return;
    };

    const createChallenge = async (challengeData) => {
        if (isMock) {
            const newMock = { ...challengeData, id: Math.random().toString(), participants_count: 0, status: 'active' };
            setLocalChallenges(prev => [...prev, newMock]);
            return newMock;
        }

        try {
            const newId = await convex.mutation(api.challenges.create, { ...challengeData, creator_id: user.id });
            const data = { ...challengeData, _id: newId, id: newId };
            const error = null;

            setLocalChallenges(prev => [...prev, data]);

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

            // 1. Optimistic local state update (Immediate result for UI)
            setLocalUserChallenges(prev => {
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

            // 2. Trigger mutation in background
            await convex.mutation(api.challenges.updateProgress, {
                id: userChallengeId,
                dailyLogs: freshLogs
            });
            // Verification will trigger via useEffect when data syncs
        } catch (e) {
            console.error("Error marking daily progress:", e);
            // Optional: rollback on failure if needed
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
