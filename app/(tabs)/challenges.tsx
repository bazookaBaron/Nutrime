import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions,
    ActivityIndicator, RefreshControl, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useChallenges } from '../../context/ChallengesContext';
import {
    Plus, Trophy, X, AlertCircle, Zap, Users, Clock, Target,
    Droplets, Footprints, UtensilsCrossed, Moon, CheckSquare, ChevronDown, ChevronUp, SlidersHorizontal
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ---- Category theme config ----
const CATEGORY_THEMES: Record<string, { icon: any; accent: string; bg: string; gradient: [string, string] }> = {
    water: { icon: Droplets, accent: '#38bdf8', bg: 'rgba(56,189,248,0.12)', gradient: ['#0369a1', '#0ea5e9'] },
    steps: { icon: Footprints, accent: '#fbbf24', bg: 'rgba(251,191,36,0.12)', gradient: ['#b45309', '#f59e0b'] },
    calories: { icon: UtensilsCrossed, accent: '#f97316', bg: 'rgba(249,115,22,0.12)', gradient: ['#c2410c', '#fb923c'] },
    sleep: { icon: Moon, accent: '#a78bfa', bg: 'rgba(167,139,250,0.12)', gradient: ['#6d28d9', '#c4b5fd'] },
    custom: { icon: CheckSquare, accent: '#bef264', bg: 'rgba(190,242,100,0.12)', gradient: ['#4d7c0f', '#bef264'] },
};

const getCategoryTheme = (type: string) => CATEGORY_THEMES[type] || CATEGORY_THEMES['custom'];

const ALL_CATEGORIES = ['all', 'steps', 'calories', 'water', 'sleep', 'custom'];

// ---- Small themed challenge card ----
function ChallengeListCard({
    challenge, userChallenge, onPress, markDailyProgress
}: {
    challenge: any; userChallenge?: any; onPress: () => void; markDailyProgress?: any;
}) {
    const theme = getCategoryTheme(challenge.type);
    const Icon = theme.icon;
    const isJoined = !!userChallenge;
    const isCompleted = userChallenge?.status === 'completed';
    const isCustom = challenge.type === 'custom';

    const getTimeRemaining = () => {
        const diff = new Date(challenge.end_time).getTime() - Date.now();
        if (diff <= 0) return 'Ended';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        return days > 0 ? `${days}d left` : `${hours}h left`;
    };

    // Inline daily ticks for custom challenges
    const renderCustomProgress = () => {
        if (!isCustom || !isJoined || isCompleted) return null;
        const logs = userChallenge?.daily_logs || [];
        const duration = challenge.duration_days || 1;
        const startDate = new Date(userChallenge.joined_at);

        return (
            <View style={styles.inlineTickRow}>
                {Array.from({ length: duration }).map((_, i) => {
                    const d = new Date(startDate);
                    d.setDate(startDate.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    const isDone = logs.includes(dateStr);
                    const isFuture = d > new Date();
                    return (
                        <TouchableOpacity
                            key={i}
                            style={[styles.inlineTick, isDone && styles.inlineTickDone, isFuture && { opacity: 0.4 }]}
                            disabled={isFuture}
                            onPress={e => {
                                e.stopPropagation?.();
                                markDailyProgress?.(userChallenge.id, dateStr, !isDone);
                            }}
                        >
                            <Text style={[styles.inlineTickText, isDone && { color: '#000' }]}>
                                {i + 1}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <TouchableOpacity style={[styles.card, { borderColor: theme.accent + '44' }]} onPress={onPress} activeOpacity={0.8}>
            {/* Colored left accent strip */}
            <View style={[styles.cardAccent, { backgroundColor: theme.accent }]} />

            <View style={[styles.cardIcon, { backgroundColor: theme.bg }]}>
                <Icon size={20} color={theme.accent} />
            </View>

            <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{challenge.title}</Text>
                    {isCompleted && <Zap size={14} color="#bef264" fill="#bef264" style={{ marginLeft: 4 }} />}
                </View>

                <View style={styles.cardMeta}>
                    <View style={[styles.categoryPill, { backgroundColor: theme.bg }]}>
                        <Text style={[styles.categoryPillText, { color: theme.accent }]}>
                            {challenge.type.toUpperCase()}
                        </Text>
                    </View>
                    <Clock size={10} color="#9ca3af" />
                    <Text style={styles.metaText}>{getTimeRemaining()}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Zap size={10} color="#facc15" />
                    <Text style={styles.metaText}>{challenge.xp_reward} XP</Text>
                </View>

                {renderCustomProgress()}
            </View>

            <View style={styles.cardRight}>
                {!isJoined ? (
                    <View style={[styles.joinPill, { backgroundColor: theme.accent }]}>
                        <Text style={styles.joinPillText}>Join</Text>
                    </View>
                ) : isCompleted ? (
                    <Zap size={22} color="#bef264" fill="#bef264" />
                ) : (
                    <Clock size={20} color="#9ca3af" />
                )}
            </View>
        </TouchableOpacity>
    );
}

// ---- Main Screen ----
export default function ChallengesScreen() {
    const router = useRouter();
    const posthog = usePostHog();
    const { challenges, userChallenges, loading, fetchChallenges, seedDefaultChallenges, joinChallenge, markDailyProgress } = useChallenges();
    const [selectedTab, setSelectedTab] = useState<'ongoing' | 'top'>('ongoing');
    const isFocused = useIsFocused();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState<{ chal: any; uChal: any } | null>(null);

    // ---- Filters ----
    const [showFilters, setShowFilters] = useState(false);
    const [catFilter, setCatFilter] = useState('all');
    const [xpRange, setXpRange] = useState<[number, number]>([0, 1000]);

    useEffect(() => {
        if (isFocused) { fetchChallenges(); seedDefaultChallenges(); }
    }, [isFocused]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchChallenges();
        setRefreshing(false);
    }, []);

    // Keep in sync with currently open modal
    useEffect(() => {
        if (!selectedChallenge) return;
        const freshUChal = userChallenges.find((uc: any) => uc.challenge_id === selectedChallenge.chal.id);
        setSelectedChallenge(prev => prev ? { ...prev, uChal: freshUChal } : null);
    }, [userChallenges]);

    const applyFilters = (list: any[]) => list.filter((c: any) => {
        if (catFilter !== 'all' && c.type !== catFilter) return false;
        if (c.xp_reward < xpRange[0] || c.xp_reward > xpRange[1]) return false;
        return true;
    });

    // Active (joined) — incomplete first, then completed
    const ongoingChallenges = useMemo(() => {
        const joined = challenges.filter((c: any) => userChallenges.find((uc: any) => uc.challenge_id === c.id));
        const sorted = [
            ...joined.filter((c: any) => {
                const uc = userChallenges.find((u: any) => u.challenge_id === c.id);
                return uc?.status !== 'completed';
            }),
            ...joined.filter((c: any) => {
                const uc = userChallenges.find((u: any) => u.challenge_id === c.id);
                return uc?.status === 'completed';
            }),
        ];
        return applyFilters(sorted);
    }, [challenges, userChallenges, catFilter, xpRange]);

    // Discover (not joined)
    const discoverChallenges = useMemo(() => {
        const unjoined = challenges.filter((c: any) => !userChallenges.find((uc: any) => uc.challenge_id === c.id));
        return applyFilters(unjoined);
    }, [challenges, userChallenges, catFilter, xpRange]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#bef264" />
                <Text style={{ color: '#888', marginTop: 10 }}>Loading challenges...</Text>
            </View>
        );
    }

    const renderFilterBar = () => (
        <View style={styles.filterSection}>
            {/* Category pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={styles.catPillRow}>
                    {ALL_CATEGORIES.map(cat => {
                        const active = catFilter === cat;
                        const theme = cat === 'all' ? null : getCategoryTheme(cat);
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catPill, active && { backgroundColor: theme?.accent || '#bef264', borderColor: theme?.accent || '#bef264' }]}
                                onPress={() => setCatFilter(cat)}
                            >
                                {cat !== 'all' && theme && React.createElement(theme.icon, { size: 11, color: active ? '#000' : theme.accent, style: { marginRight: 3 } })}
                                <Text style={[styles.catPillText, active && { color: '#000', fontWeight: 'bold' }]}>
                                    {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* XP range — simple preset buttons */}
            <View style={styles.xpRangeRow}>
                <Text style={styles.xpRangeLabel}>XP Range:</Text>
                {([[0, 1000], [0, 300], [301, 500], [501, 1000]] as [number, number][]).map(([lo, hi]) => {
                    const active = xpRange[0] === lo && xpRange[1] === hi;
                    const label = lo === 0 && hi === 1000 ? 'All' : lo === 0 ? `≤${hi}` : `${lo}+`;
                    return (
                        <TouchableOpacity
                            key={label}
                            style={[styles.xpPill, active && styles.xpPillActive]}
                            onPress={() => setXpRange([lo, hi])}
                        >
                            <Text style={[styles.xpPillText, active && styles.xpPillTextActive]}>{label} XP</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderHeader = () => (
        <>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Challenges</Text>
                    <Text style={styles.headerSubtitle}>Compete & Earn XP</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(f => !f)}>
                        <SlidersHorizontal size={18} color="#fff" />
                        {showFilters ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/create-challenge')}>
                        <Plus size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
            {showFilters && renderFilterBar()}
        </>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <View style={styles.tabs}>
                {(['ongoing', 'top'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedTab === tab && styles.activeTab]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                            {tab === 'ongoing' ? `Active (${ongoingChallenges.length})` : `Discover (${discoverChallenges.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        const uChal = userChallenges.find((uc: any) => uc.challenge_id === item.id);
        return (
            <ChallengeListCard
                challenge={item}
                userChallenge={uChal}
                markDailyProgress={markDailyProgress}
                onPress={() => {
                    setSelectedChallenge({ chal: item, uChal });
                    setModalVisible(true);
                }}
            />
        );
    };

    const sc = selectedChallenge;
    const modalTheme = sc ? getCategoryTheme(sc.chal.type) : getCategoryTheme('custom');
    const ModalIcon = modalTheme.icon;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={selectedTab === 'ongoing' ? ongoingChallenges : discoverChallenges}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListHeaderComponent={<>{renderHeader()}{renderTabs()}</>}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Trophy size={48} color="#374151" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>
                            {selectedTab === 'ongoing' ? 'No active challenges' : 'No challenges found'}
                        </Text>
                        {selectedTab === 'ongoing' && (
                            <TouchableOpacity onPress={() => setSelectedTab('top')}>
                                <Text style={styles.linkText}>Find a challenge →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bef264" />}
            />

            {/* Challenge Detail Modal */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setModalVisible(false)} />
                    <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} bounces={false}>
                        {sc && (
                            <>
                                <View style={styles.modalHeader}>
                                    <LinearGradient colors={modalTheme.gradient} style={styles.modalIconContainer}>
                                        <ModalIcon size={26} color="#fff" />
                                    </LinearGradient>
                                    <View style={styles.modalTitleContainer}>
                                        <Text style={styles.modalTitle}>{sc.chal.title}</Text>
                                        <View style={[styles.modalCategoryBadge, { backgroundColor: modalTheme.bg }]}>
                                            <Text style={[styles.modalCategoryText, { color: modalTheme.accent }]}>
                                                {sc.chal.type?.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalButton}>
                                        <X size={22} color="#9ca3af" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.modalDescription}>{sc.chal.description}</Text>

                                <View style={styles.modalStatsGrid}>
                                    <View style={styles.modalStatBox}>
                                        <Target size={16} color="#9ca3af" />
                                        <Text style={styles.modalStatLabel}>Target</Text>
                                        <Text style={styles.modalStatValue}>
                                            {sc.chal.type === 'custom' ? `${sc.chal.duration_days} days` : `${sc.chal.target_value} ${sc.chal.type}`}
                                        </Text>
                                    </View>
                                    <View style={styles.modalStatBox}>
                                        <Zap size={16} color="#facc15" />
                                        <Text style={styles.modalStatLabel}>Reward</Text>
                                        <Text style={[styles.modalStatValue, { color: '#facc15' }]}>{sc.chal.xp_reward} XP</Text>
                                    </View>
                                    <View style={styles.modalStatBox}>
                                        <Users size={16} color="#9ca3af" />
                                        <Text style={styles.modalStatLabel}>Joined</Text>
                                        <Text style={styles.modalStatValue}>{sc.chal.participants_count || 0}</Text>
                                    </View>
                                </View>

                                {(sc.chal.type === 'steps' || sc.chal.type === 'sleep') && (
                                    <View style={styles.warningBox}>
                                        <AlertCircle size={16} color="#fbbf24" style={{ marginTop: 2 }} />
                                        <Text style={styles.warningText}>
                                            Requires <Text style={{ fontWeight: 'bold' }}>Health Connect</Text> tracking to auto-verify.
                                        </Text>
                                    </View>
                                )}

                                {!sc.uChal && (
                                    <TouchableOpacity
                                        style={[styles.modalJoinButton, { backgroundColor: modalTheme.accent }]}
                                        onPress={() => {
                                            posthog.capture('challenge_joined', {
                                                challenge_id: sc.chal.id, challenge_type: sc.chal.type, xp_reward: sc.chal.xp_reward
                                            });
                                            joinChallenge(sc.chal.id);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.modalJoinButtonText}>Join Challenge</Text>
                                    </TouchableOpacity>
                                )}

                                {sc.uChal && sc.chal.type === 'custom' && (
                                    <View style={[styles.dailyProgressSection, { borderColor: modalTheme.accent + '44' }]}>
                                        <Text style={styles.dailyProgressTitle}>Daily Goals
                                            <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: 'normal' }}>
                                                {' '}({(sc.uChal.daily_logs || []).length}/{sc.chal.duration_days})
                                            </Text>
                                        </Text>
                                        <Text style={styles.dailyProgressSubtitle}>Tick off each day to complete the challenge</Text>
                                        <View style={styles.tickGrid}>
                                            {Array.from({ length: sc.chal.duration_days }).map((_, i) => {
                                                const startDate = new Date(sc.uChal.joined_at);
                                                const targetDate = new Date(startDate);
                                                targetDate.setDate(startDate.getDate() + i);
                                                const dateStr = targetDate.toISOString().split('T')[0];
                                                const isDone = (sc.uChal.daily_logs || []).includes(dateStr);
                                                const isFuture = targetDate > new Date();

                                                return (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={[styles.tickBox, isDone && { backgroundColor: modalTheme.accent, borderColor: modalTheme.accent }, isFuture && styles.tickBoxDisabled]}
                                                        disabled={isFuture}
                                                        onPress={() => markDailyProgress(sc.uChal.id, dateStr, !isDone)}
                                                    >
                                                        <Text style={[styles.tickText, isDone && styles.tickTextDone]}>Day {i + 1}</Text>
                                                        {isDone && <Zap size={10} color="#000" fill="#000" />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827', paddingTop: 60 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    filterButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
    addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#bef264', justifyContent: 'center', alignItems: 'center' },

    // Filters
    filterSection: { paddingHorizontal: 20, marginBottom: 12 },
    catPillRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
    catPillText: { color: '#d1d5db', fontSize: 12 },
    xpRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    xpRangeLabel: { color: '#9ca3af', fontSize: 12 },
    xpPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
    xpPillActive: { backgroundColor: '#374151', borderColor: '#bef264' },
    xpPillText: { color: '#9ca3af', fontSize: 11 },
    xpPillTextActive: { color: '#bef264', fontWeight: 'bold' },

    // Tabs
    tabContainer: { paddingHorizontal: 20, marginBottom: 16 },
    tabs: { flexDirection: 'row', backgroundColor: '#1f2937', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#374151' },
    tabText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
    activeTabText: { color: '#fff' },

    // Challenge Card
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 14, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
    cardAccent: { width: 4, alignSelf: 'stretch' },
    cardIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', margin: 12 },
    cardInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', flex: 1 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    categoryPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    categoryPillText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
    metaText: { color: '#9ca3af', fontSize: 11 },
    metaDot: { color: '#4b5563' },
    cardRight: { paddingRight: 14, alignItems: 'center' },
    joinPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
    joinPillText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

    // Inline custom ticks
    inlineTickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
    inlineTick: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#374151', borderWidth: 1, borderColor: '#4b5563', alignItems: 'center', justifyContent: 'center' },
    inlineTickDone: { backgroundColor: '#bef264', borderColor: '#bef264' },
    inlineTickText: { color: '#d1d5db', fontSize: 10, fontWeight: 'bold' },

    // Empty state
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyStateText: { color: '#6b7280', fontSize: 15, marginBottom: 8 },
    linkText: { color: '#bef264', fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalDismissArea: { flex: 1 },
    modalScroll: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
    modalContent: { padding: 24, paddingBottom: 44 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 14 },
    modalIconContainer: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    modalTitleContainer: { flex: 1 },
    modalTitle: { fontSize: 19, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    modalCategoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
    modalCategoryText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    closeModalButton: { padding: 4 },
    modalDescription: { fontSize: 14, color: '#d1d5db', lineHeight: 22, marginBottom: 20 },
    modalStatsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    modalStatBox: { flex: 1, backgroundColor: '#374151', borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
    modalStatLabel: { fontSize: 11, color: '#9ca3af' },
    modalStatValue: { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
    warningBox: { flexDirection: 'row', backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 12, padding: 14, marginBottom: 20, gap: 10 },
    warningText: { flex: 1, color: '#fbbf24', fontSize: 13, lineHeight: 18 },
    modalJoinButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
    modalJoinButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

    // Daily ticks (modal)
    dailyProgressSection: { marginTop: 8, backgroundColor: '#374151', borderRadius: 16, padding: 16, borderWidth: 1 },
    dailyProgressTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    dailyProgressSubtitle: { color: '#9ca3af', fontSize: 12, marginBottom: 14 },
    tickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tickBox: { width: '31%', paddingVertical: 10, backgroundColor: '#1f2937', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4b5563', flexDirection: 'row', gap: 4 },
    tickBoxDisabled: { opacity: 0.4 },
    tickText: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
    tickTextDone: { color: '#000' },
});
