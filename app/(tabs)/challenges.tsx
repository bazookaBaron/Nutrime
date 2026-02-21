import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useChallenges } from '../../context/ChallengesContext';
import { Plus, Trophy, X, AlertCircle, Zap, Users, Clock, Target } from 'lucide-react-native';
import ChallengeCard from '../../components/ChallengeCard';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';

const { width } = Dimensions.get('window');

import { useRouter } from 'expo-router';

export default function ChallengesScreen() {
    const router = useRouter();
    const posthog = usePostHog();
    const { challenges, userChallenges, loading, fetchChallenges, seedDefaultChallenges, joinChallenge } = useChallenges();
    const [selectedTab, setSelectedTab] = useState('ongoing'); // 'ongoing' | 'top'

    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = useState(false);

    // Bottom sheet modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState<{ chal: any, uChal: any } | null>(null);

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

    const ongoingChallenges = React.useMemo(() => challenges.filter((c: any) => {
        const joined = userChallenges.find((uc: any) => uc.challenge_id === c.id);
        return !!joined; // Only joined ones
    }), [challenges, userChallenges]);

    const activeChallenges = React.useMemo(() => challenges.filter((c: any) => {
        const joined = userChallenges.find((uc: any) => uc.challenge_id === c.id);
        return !joined; // Available to join
    }), [challenges, userChallenges]);

    const renderHeader = () => (
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
    );

    const renderTabs = () => (
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
    );

    const renderItem = ({ item }: { item: any }) => (
        <ChallengeCard
            challenge={item}
            userChallenge={userChallenges.find((uc: any) => uc.challenge_id === item.id)}
            onPress={(chal, uChal) => {
                setSelectedChallenge({ chal, uChal });
                setModalVisible(true);
            }}
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={selectedTab === 'ongoing' ? ongoingChallenges : activeChallenges}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={
                    <>
                        {renderHeader()}
                        {renderTabs()}
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Trophy size={48} color="#374151" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>
                            {selectedTab === 'ongoing' ? 'No active challenges' : 'Checking for new challenges...'}
                        </Text>
                        {selectedTab === 'ongoing' && (
                            <TouchableOpacity onPress={() => setSelectedTab('top')}>
                                <Text style={styles.linkText}>Find a challenge</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bef264" />
                }
            />

            {/* Challenge Details Bottom Sheet (Modal) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalDismissArea}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />
                    <View style={styles.modalContent}>
                        {selectedChallenge && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalHeaderLeft}>
                                        <View style={[styles.modalIconContainer, { backgroundColor: selectedChallenge.uChal ? 'rgba(190, 242, 100, 0.1)' : 'rgba(107, 114, 128, 0.1)' }]}>
                                            <Trophy size={28} color={selectedChallenge.uChal ? "#bef264" : "#9ca3af"} />
                                        </View>
                                        <View style={styles.modalTitleContainer}>
                                            <Text style={styles.modalTitle}>{selectedChallenge.chal.title}</Text>
                                            <View style={styles.modalCategoryBadge}>
                                                <Text style={styles.modalCategoryText}>{selectedChallenge.chal.type?.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalButton}>
                                        <X size={24} color="#9ca3af" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.modalDescription}>
                                    {selectedChallenge.chal.description}
                                </Text>

                                <View style={styles.modalStatsGrid}>
                                    <View style={styles.modalStatBox}>
                                        <Target size={16} color="#9ca3af" />
                                        <Text style={styles.modalStatLabel}>Target</Text>
                                        <Text style={styles.modalStatValue}>{selectedChallenge.chal.target_value} {selectedChallenge.chal.type}</Text>
                                    </View>
                                    <View style={styles.modalStatBox}>
                                        <Zap size={16} color="#facc15" />
                                        <Text style={styles.modalStatLabel}>Reward</Text>
                                        <Text style={[styles.modalStatValue, { color: '#facc15' }]}>{selectedChallenge.chal.xp_reward} XP</Text>
                                    </View>
                                    <View style={styles.modalStatBox}>
                                        <Users size={16} color="#9ca3af" />
                                        <Text style={styles.modalStatLabel}>Joined</Text>
                                        <Text style={styles.modalStatValue}>{selectedChallenge.chal.participants_count || 0}</Text>
                                    </View>
                                </View>

                                {(selectedChallenge.chal.type === 'steps' || selectedChallenge.chal.type === 'sleep') && (
                                    <View style={styles.warningBox}>
                                        <AlertCircle size={16} color="#fbbf24" style={{ marginTop: 2 }} />
                                        <Text style={styles.warningText}>
                                            This challenge requires <Text style={{ fontWeight: 'bold' }}>Health Connect</Text> and <Text style={{ fontWeight: 'bold' }}>{selectedChallenge.chal.type}</Text> tracking to be active to automatically verify your progress.
                                        </Text>
                                    </View>
                                )}

                                {!selectedChallenge.uChal && (
                                    <TouchableOpacity
                                        style={styles.modalJoinButton}
                                        onPress={() => {
                                            posthog.capture('challenge_joined', {
                                                challenge_id: selectedChallenge.chal.id,
                                                challenge_title: selectedChallenge.chal.title,
                                                challenge_type: selectedChallenge.chal.type,
                                                xp_reward: selectedChallenge.chal.xp_reward,
                                                participants_count: selectedChallenge.chal.participants_count || 0,
                                            });
                                            joinChallenge(selectedChallenge.chal.id);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.modalJoinButtonText}>Join Challenge</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalDismissArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitleContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flexShrink: 1,
        marginBottom: 4,
    },
    modalCategoryBadge: {
        backgroundColor: '#374151',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    modalCategoryText: {
        color: '#d1d5db',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    closeModalButton: {
        padding: 4,
    },
    modalDescription: {
        fontSize: 15,
        color: '#d1d5db',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalStatsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    modalStatBox: {
        flex: 1,
        backgroundColor: '#374151',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    modalStatLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    modalStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#facc15',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        gap: 12,
    },
    warningText: {
        flex: 1,
        color: '#fbbf24',
        fontSize: 13,
        lineHeight: 18,
    },
    modalJoinButton: {
        backgroundColor: '#bef264',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalJoinButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
