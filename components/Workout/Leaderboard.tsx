import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Pressable, Modal,
    TouchableWithoutFeedback, ScrollView, Animated, Easing, Image
} from 'react-native';
import { Trophy, X, Zap, Star } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    workout_xp: number;
    workout_level: number;
    profile_image_url?: string;
}

interface LeaderboardProps {
    currentUserId: string;
    userCountry?: string;
    userState?: string;
}

interface LeaderboardData {
    top10: LeaderboardEntry[];
    currentUserEntry: LeaderboardEntry | null;
}

// Deterministic avatar bg color per user
const AVATAR_COLORS = ['#7c3aed', '#0f766e', '#b45309', '#be185d', '#1d4ed8', '#166534', '#9a3412'];
function avatarColor(userId: string) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(username: string) {
    return (username || '?').slice(0, 2).toUpperCase();
}

// Rank-specific neon colors
const RANK_COLORS: Record<number, { border: string; glow: string; bg: string }> = {
    1: {
        border: '#FF6B00',          // hot orange
        glow: 'rgba(255,107,0,0.35)',
        bg: 'rgba(255,107,0,0.15)'
    },

    2: {
        border: '#00C853',          // vivid green
        glow: 'rgba(0,200,83,0.35)',
        bg: 'rgba(0,200,83,0.15)'
    },

    3: {
        border: '#2979FF',          // bright blue
        glow: 'rgba(41,121,255,0.35)',
        bg: 'rgba(41,121,255,0.15)'
    },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId, userCountry, userState }) => {
    const [scope, setScope] = useState<'all' | 'country' | 'state'>('all');
    const [hoveredEntry, setHoveredEntry] = useState<LeaderboardEntry | null>(null);

    const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Reactive Filter Calculation
    const filterValue = scope === 'country' ? userCountry : (scope === 'state' ? userState : undefined);

    // LIVE SUBSCRIPTIONS: Convex will push updates automatically
    const top10 = useQuery(api.leaderboards.getLeaderboard, { scope, filter: filterValue });
    const myEntry = useQuery(api.leaderboards.getUserRank, { userId: currentUserId, scope, filter: filterValue });

    const loading = top10 === undefined;
    const data = {
        top10: top10 || [],
        currentUserEntry: myEntry || null
    };

    const isCurrentUserInTop10 = data.top10.some(entry => entry.user_id === currentUserId);
    const displayData = [...data.top10];
    if (!isCurrentUserInTop10 && data.currentUserEntry) {
        displayData.push(data.currentUserEntry);
    }

    const handlePress = useCallback((item: LeaderboardEntry) => {
        setHoveredEntry(item);
    }, []);

    const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isCurrentUser = item.user_id === currentUserId;
        const isTop3 = item.rank >= 1 && item.rank <= 3;
        const rankStyle = isTop3 ? RANK_COLORS[item.rank] : null;
        const isUserRow = !isCurrentUserInTop10 && isCurrentUser && index === data.top10.length;
        const bgColor = avatarColor(item.user_id);

        return (
            <Pressable
                onPress={() => handlePress(item)}
                key={item.user_id}
                style={[
                    styles.entryRow,
                    isTop3 && {
                        backgroundColor: rankStyle!.bg,
                        borderRadius: 14,
                        paddingVertical: 12,
                    },
                    isCurrentUser && !isTop3 && styles.entryRowCurrent,
                    isUserRow && styles.userRowSeparator,
                ]}
            >
                {/* Left neon accent bar for current user (non-top3) */}
                {isCurrentUser && !isTop3 && (
                    <View style={styles.currentUserAccentBar} />
                )}

                <View style={styles.rankContainer}>
                    <Text style={[
                        styles.rankText,
                        isTop3 && { color: rankStyle!.border, fontWeight: '800' },
                        isCurrentUser && !isTop3 && styles.textCurrent,
                    ]}>
                        {item.rank}
                    </Text>
                </View>

                <View style={styles.avatarContainer}>
                    {isTop3 ? (
                        <Text style={styles.badgeIcon}>{RANK_MEDALS[item.rank - 1]}</Text>
                    ) : (
                        item.profile_image_url ? (
                            <Image style={[styles.avatar, isCurrentUser && styles.avatarCurrent]} source={{ uri: item.profile_image_url }} />
                        ) : (
                            <View style={[
                                styles.avatar,
                                { backgroundColor: bgColor },
                                isCurrentUser && styles.avatarCurrent,
                            ]}>
                                <Text style={styles.avatarInitials}>{initials(item.username)}</Text>
                            </View>
                        )
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={[
                        styles.username,
                        isTop3 && { color: '#FFF', fontWeight: '700' },
                        isCurrentUser && !isTop3 && styles.textCurrent,
                    ]} numberOfLines={1}>
                        {item.username}
                        {isCurrentUser && <Text style={styles.youBadge}> (you)</Text>}
                    </Text>
                    <Text style={styles.levelText}>Level {item.workout_level}</Text>
                </View>

                <Text style={[
                    styles.xpText,
                    isTop3 && { color: rankStyle!.border },
                    isCurrentUser && !isTop3 && styles.textCurrent,
                ]}>
                    {item.workout_xp.toLocaleString()} XP
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerSection}>
                <Text style={styles.subtitle}>ALL-TIME RANKINGS</Text>
                <View style={styles.titleRow}>
                    <View style={styles.titleWithBadge}>
                        <Text style={styles.title}>Leaderboard</Text>
                        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                    </View>
                    <View style={styles.trophyIcon}>
                        <Trophy size={18} color="#bef264" />
                    </View>
                </View>
            </View>

            {/* Scope Selector */}
            <View style={styles.scopeSelector}>
                <TouchableOpacity
                    style={[styles.scopeBtn, scope === 'all' && styles.scopeBtnActive]}
                    onPress={() => setScope('all')}
                >
                    <Text style={[styles.scopeText, scope === 'all' && styles.scopeTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.scopeBtn, scope === 'country' && styles.scopeBtnActive]}
                    onPress={() => setScope('country')}
                >
                    <Text style={[styles.scopeText, scope === 'country' && styles.scopeTextActive]}>
                        Country
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.scopeBtn, scope === 'state' && styles.scopeBtnActive]}
                    onPress={() => setScope('state')}
                >
                    <Text style={[styles.scopeText, scope === 'state' && styles.scopeTextActive]}>
                        State
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Leaderboard Scrollable Panel */}
            <View style={styles.listContainer}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.emptyText}>Loading rankings...</Text>
                    </View>
                ) : data.top10.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.emptyText}>No users found in this region.</Text>
                    </View>
                ) : (
                    <View style={styles.scrollWrapper}>
                        <View style={{ height: LIST_HEIGHT }}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {data.top10.map((item, index) => renderItem({ item, index }))}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>

            {/* Sticky Bottom User Row */}
            {!loading && data.currentUserEntry && (
                <View style={styles.stickyUserRow}>
                    <View style={styles.neonCard}>
                        <View style={styles.rankContainer}>
                            <Text style={styles.rankTextSticky}>#{data.currentUserEntry.rank}</Text>
                        </View>

                        <View style={styles.avatarSticky}>
                            {data.currentUserEntry.profile_image_url ? (
                                <Image style={styles.avatarStickyImage} source={{ uri: data.currentUserEntry.profile_image_url }} />
                            ) : (
                                <Text style={styles.avatarInitialsSticky}>
                                    {initials(data.currentUserEntry.username)}
                                </Text>
                            )}
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.usernameSticky} numberOfLines={1}>
                                {data.currentUserEntry.username}
                                <Text style={styles.youLabel}> (YOU)</Text>
                            </Text>
                            <Text style={styles.levelTextSticky}>Level {data.currentUserEntry.workout_level}</Text>
                        </View>

                        <Text style={styles.xpTextSticky}>
                            {data.currentUserEntry.workout_xp.toLocaleString()} XP
                        </Text>
                    </View>
                </View>
            )}

            {/* Detail Modal */}
            {hoveredEntry && (
                <Modal transparent animationType="fade" visible onRequestClose={() => setHoveredEntry(null)}>
                    <TouchableWithoutFeedback onPress={() => setHoveredEntry(null)}>
                        <View style={styles.chipOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={[
                                    styles.chipCard,
                                    hoveredEntry.rank <= 3 && {
                                        borderColor: RANK_COLORS[hoveredEntry.rank].border,
                                        shadowColor: RANK_COLORS[hoveredEntry.rank].border,
                                        shadowOpacity: 0.4,
                                        shadowRadius: 16,
                                    }
                                ]}>
                                    <TouchableOpacity style={styles.chipClose} onPress={() => setHoveredEntry(null)}>
                                        <X size={14} color="#9ca3af" />
                                    </TouchableOpacity>

                                    <View style={[styles.chipAvatar, {
                                        backgroundColor: avatarColor(hoveredEntry.user_id),
                                        borderColor: hoveredEntry.rank <= 3 ? RANK_COLORS[hoveredEntry.rank].border : '#bef264',
                                        overflow: 'hidden',
                                    }]}>
                                        {hoveredEntry.rank <= 3
                                            ? <Text style={{ fontSize: 28 }}>{RANK_MEDALS[hoveredEntry.rank - 1]}</Text>
                                            : (hoveredEntry.profile_image_url ? (
                                                <Image style={{ width: '100%', height: '100%' }} source={{ uri: hoveredEntry.profile_image_url }} />
                                            ) : (
                                                <Text style={styles.chipAvatarText}>{initials(hoveredEntry.username)}</Text>
                                            ))
                                        }
                                    </View>

                                    <Text style={styles.chipUsername}>{hoveredEntry.username}</Text>
                                    <View style={[styles.chipRankBadge, hoveredEntry.rank <= 3 && { backgroundColor: RANK_COLORS[hoveredEntry.rank].glow }]}>
                                        <Text style={[styles.chipRankText, hoveredEntry.rank <= 3 && { color: RANK_COLORS[hoveredEntry.rank].border }]}>#{hoveredEntry.rank}</Text>
                                    </View>

                                    <View style={styles.chipStats}>
                                        <View style={styles.chipStat}>
                                            <Zap size={14} color="#bef264" />
                                            <Text style={styles.chipStatValue}>{hoveredEntry.workout_xp.toLocaleString()}</Text>
                                            <Text style={styles.chipStatLabel}>XP</Text>
                                        </View>
                                        <View style={styles.chipStatDivider} />
                                        <View style={styles.chipStat}>
                                            <Star size={14} color="#eab308" />
                                            <Text style={styles.chipStatValue}>{hoveredEntry.workout_level}</Text>
                                            <Text style={styles.chipStatLabel}>Level</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
        </View>
    );
};

const LIST_HEIGHT = 420; // Approx enough for 8 entries

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111111',
        borderRadius: 24,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    headerSection: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#444',
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
    },
    titleWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e', // Bright green for "live"
        marginTop: 4,
    },
    trophyIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    scopeSelector: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: '#111',
    },
    scopeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    scopeBtnActive: {
        backgroundColor: '#222',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    scopeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#555',
    },
    scopeTextActive: {
        color: '#bef264',
    },
    listContainer: {
        marginBottom: 8,
    },
    scrollWrapper: {
        borderRadius: 16,
        backgroundColor: '#0A0A0A',
        borderWidth: 1,
        borderColor: '#1A1A1A',
    },
    scrollContent: {
        paddingVertical: 8,
    },
    loadingContainer: {
        height: LIST_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#444',
        fontSize: 14,
        fontWeight: '600',
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginHorizontal: 8,
        borderRadius: 12,
        marginBottom: 4,
    },
    entryRowCurrent: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    userRowSeparator: {
        // No longer using separator in the scroll view
    },
    rankContainer: {
        width: 32,
        alignItems: 'flex-start',
    },
    rankText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#333',
    },
    textCurrent: {
        color: '#bef264',
    },
    avatarContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: 8,
    },
    badgeIcon: {
        fontSize: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCurrent: {
        borderWidth: 1.5,
        borderColor: '#bef264',
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DDD',
        marginBottom: 1,
    },
    youBadge: {
        fontSize: 10,
        color: '#bef264',
        fontWeight: '600',
        opacity: 0.8,
    },
    levelText: {
        fontSize: 10,
        color: '#444',
        fontWeight: '600',
    },
    xpText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#666',
        fontVariant: ['tabular-nums'],
    },
    currentUserAccentBar: {
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: 3,
        backgroundColor: '#bef264',
        borderRadius: 2,
    },
    stickyUserRow: {
        marginTop: 12,
    },
    neonCard: {
        backgroundColor: '#bef264',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        shadowColor: '#bef264',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    rankTextSticky: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
    },
    avatarSticky: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarStickyImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitialsSticky: {
        color: '#bef264',
        fontSize: 12,
        fontWeight: '900',
    },
    usernameSticky: {
        fontSize: 15,
        fontWeight: '800',
        color: '#000',
    },
    youLabel: {
        fontSize: 10,
        fontWeight: '900',
        opacity: 0.6,
    },
    levelTextSticky: {
        fontSize: 11,
        color: '#000',
        opacity: 0.6,
        fontWeight: '700',
    },
    xpTextSticky: {
        fontSize: 15,
        fontWeight: '900',
        color: '#000',
    },
    chipOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipCard: {
        backgroundColor: '#111',
        borderRadius: 28,
        padding: 24,
        width: 240,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative',
    },
    chipClose: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    chipAvatar: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
    },
    chipAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
    },
    chipUsername: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 8,
    },
    chipRankBadge: {
        backgroundColor: 'rgba(190,242,100,0.1)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 20,
    },
    chipRankText: {
        color: '#bef264',
        fontWeight: '900',
        fontSize: 14,
    },
    chipStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 16,
        width: '100%',
        justifyContent: 'space-around',
    },
    chipStat: {
        alignItems: 'center',
        gap: 2,
    },
    chipStatValue: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    chipStatLabel: {
        color: '#444',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    chipStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#1A1A1A',
    },
});

export default Leaderboard;
