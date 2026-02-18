import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useChallenges } from '../../context/ChallengesContext';
import { Plus, Trophy } from 'lucide-react-native';
import ChallengeCard from '../../components/ChallengeCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

import { useRouter } from 'expo-router';

export default function ChallengesScreen() {
    const router = useRouter();
    const { challenges, userChallenges, loading, fetchChallenges, seedDefaultChallenges } = useChallenges();
    const [selectedTab, setSelectedTab] = useState('ongoing'); // 'ongoing' | 'top'

    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isFocused) {
            fetchChallenges();
            seedDefaultChallenges();
        }
    }, [isFocused]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchChallenges();
        setRefreshing(false);
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#bef264" />
                <Text style={{ color: '#888', marginTop: 10 }}>Loading challenges...</Text>
            </View>
        );
    }

    const ongoingChallenges = challenges.filter((c: any) => {
        const joined = userChallenges.find((uc: any) => uc.challenge_id === c.id);
        return !!joined; // Only joined ones
    });

    const activeChallenges = challenges.filter((c: any) => {
        const joined = userChallenges.find((uc: any) => uc.challenge_id === c.id);
        return !joined; // Available to join
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Challenges</Text>
                    <Text style={styles.headerSubtitle}>Compete & Earn XP</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push('/(tabs)/create-challenge')}
                >
                    <Plus size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
                <View style={styles.tabs}>
                    {['ongoing', 'top'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, selectedTab === tab && styles.activeTab]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                                {tab === 'ongoing' ? 'Active' : 'Discover'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bef264" />
                }
            >
                {selectedTab === 'ongoing' ? (
                    <View style={styles.section}>
                        {ongoingChallenges.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Trophy size={48} color="#374151" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyStateText}>No active challenges</Text>
                                <TouchableOpacity onPress={() => setSelectedTab('top')}>
                                    <Text style={styles.linkText}>Find a challenge</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            ongoingChallenges.map((challenge: any) => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    userChallenge={userChallenges.find((uc: any) => uc.challenge_id === challenge.id)}
                                />
                            ))
                        )}
                    </View>
                ) : (
                    <View style={styles.section}>
                        {activeChallenges.map((challenge: any) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                            />
                        ))}
                        {activeChallenges.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>Checking for new challenges...</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#bef264',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#374151',
    },
    tabText: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        gap: 4,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyStateText: {
        color: '#6b7280',
        fontSize: 15,
        marginBottom: 8,
    },
    linkText: {
        color: '#bef264',
        fontWeight: 'bold',
    }
});
