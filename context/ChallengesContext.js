import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { Alert } from 'react-native';

const ChallengesContext = createContext();

export const useChallenges = () => useContext(ChallengesContext);

export const ChallengesProvider = ({ children }) => {
    const { user, isMock, addXP: userAddXP, userProfile } = useUser();
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
            fetchUserChallenges();
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

    const checkChallengeCompletion = async (type, amount) => {
        // This function is called by other contexts (User/Food) when an action happens.
        // e.g. checkChallengeCompletion('steps', 10000)
        // Check active user challenges matching this type

        // NOTE: Managing progress updates on client side for MVP. 
        // Ideally this is server-side triggered.

        const activeJoined = userChallenges.filter(uc => uc.status === 'joined');

        for (const uc of activeJoined) {
            const challenge = challenges.find(c => c.id === uc.challenge_id);
            if (!challenge || challenge.type !== type) continue;

            // Logic depends on type
            // For 'daily' things like steps, we might need a daily reset logic which is complex client-side.
            // For MVP, let's assume 'manual' or simple accumulation.

            // TODO: Implement specific logic
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
                description: 'Walk 10,000 steps every day for a week.',
                xp_reward: 500,
                start_time: now.toISOString(),
                end_time: end7Days.toISOString(),
                type: 'steps',
                target_value: 10000,
                participants_count: 2314
            },
            {
                title: 'No Sugar Week',
                description: 'Avoid all sugary drinks and sweets for 7 days.',
                xp_reward: 1000,
                start_time: now.toISOString(),
                end_time: end7Days.toISOString(),
                type: 'manual',
                duration_days: 7,
                participants_count: 842
            },
            {
                title: 'Hydration Master',
                description: 'Drink 3L of water today.',
                xp_reward: 150,
                start_time: now.toISOString(),
                end_time: end3Days.toISOString(),
                type: 'calories', // reusing type field loosely or valid type
                participants_count: 5120
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
            return data;
        } catch (e) {
            console.error("Error creating challenge:", e);
            throw e;
        }
    };

    return (
        <ChallengesContext.Provider value={{
            challenges,
            userChallenges,
            loading,
            fetchChallenges,
            joinChallenge,
            seedDefaultChallenges,
            createChallenge
        }}>
            {children}
        </ChallengesContext.Provider>
    );
};

const mockChallenges = [
    {
        id: '1',
        title: '10K Steps Daily',
        description: 'Walk 10,000 steps every day for a week.',
        xp_reward: 500,
        end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        participants_count: 2314
    },
    {
        id: '2',
        title: 'No Sugar Week',
        description: 'Avoid all sugary drinks and sweets for 7 days.',
        xp_reward: 1000,
        end_time: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        participants_count: 842
    }
];
