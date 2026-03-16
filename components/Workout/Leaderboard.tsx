import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Star, Trophy, X, Zap } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Animated, Easing, Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    workout_xp: number;
    workout_level: number;
    streak?: number;
    country?: string;
    profile_image_url?: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
    'India': '🇮🇳',
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'USA': '🇺🇸',
    'UK': '🇬🇧',
};

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

// Rank-specific neon colors - Vibrant Theme
const RANK_COLORS: Record<number, { border: string; glow: string; bg: string }> = {
    1: {
        border: '#FBBF24',          // Vibrant Gold
        glow: 'rgba(251, 191, 36, 0.35)',
        bg: 'rgba(251, 191, 36, 0.15)'
    },
    2: {
        border: '#22D3EE',          // Vibrant Cyan
        glow: 'rgba(34, 211, 238, 0.35)',
        bg: 'rgba(34, 211, 238, 0.15)'
    },
    3: {
        border: '#FB923C',          // Vibrant Orange
        glow: 'rgba(251, 146, 60, 0.35)',
        bg: 'rgba(251, 146, 60, 0.15)'
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
    // Ensure we send undefined instead of null/empty to Convex to avoid type errors
    const filterValue = (scope === 'country' ? userCountry : (scope === 'state' ? userState : undefined)) || undefined;

    // LIVE SUBSCRIPTIONS: Convex will push updates automatically
    const top10 = useQuery(api.leaderboards.getLeaderboard, { scope, filter: filterValue });
    const myEntry = useQuery(api.leaderboards.getUserRank, { userId: currentUserId, scope, filter: filterValue });

    const loading = top10 === undefined;
    const data = {
        top10: (top10 || []).slice(0, 50),
        currentUserEntry: myEntry || null
    };

    const isCurrentUserInTop10 = data.top10.some(entry => entry.user_id === currentUserId);
    const displayData = [...data.top10];
    if (!isCurrentUserInTop10 && data.currentUserEntry) {
        displayData.push(data.currentUserEntry as any);
    }

    const handlePress = useCallback((item: LeaderboardEntry) => {
        setHoveredEntry(item);
    }, []);

    const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isCurrentUser = item.user_id === currentUserId;
        const isTop3 = item.rank >= 1 && item.rank <= 3;
        const rankStyle = isTop3 ? RANK_COLORS[item.rank] : null;
        const isUserRow = !isCurrentUserInTop10 && isCurrentUser && index === displayData.length - 1;
        const bgColor = avatarColor(item.user_id);
        const flag = item.country ? COUNTRY_FLAGS[item.country] : null;

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
                    isCurrentUser && styles.entryRowCurrent,
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
                    <View style={styles.avatarWrapper}>
                        {item.profile_image_url ? (
                            <Image style={[styles.avatar, isCurrentUser && styles.avatarCurrent]} source={{ uri: item.profile_image_url }} />
                        ) : (
                            <View style={[
                                styles.avatar,
                                { backgroundColor: bgColor },
                                isCurrentUser && styles.avatarCurrent,
                            ]}>
                                <Text style={styles.avatarInitials}>{initials(item.username)}</Text>
                            </View>
                        )}
                        {isTop3 && (
                            <View style={styles.medalOverlay}>
                                <Text style={styles.medalIconSmall}>{RANK_MEDALS[item.rank - 1]}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[
                            styles.username,
                            isTop3 && { color: '#FFF', fontWeight: '700' },
                            isCurrentUser && !isTop3 && styles.textCurrent,
                        ]} numberOfLines={1}>
                            {item.username}
                        </Text>
                        {flag && <Text style={{ fontSize: 12 }}>{flag}</Text>}
                        {isCurrentUser && <Text style={styles.youBadge}> (you)</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.levelText}>Lv {item.workout_level}</Text>
                        {(item.streak ?? 0) > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Image
                                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/785/785116.png' }}
                                    style={{ width: 10, height: 10 }}
                                />
                                <Text style={[styles.levelText, { color: '#f97316' }]}>{item.streak}</Text>
                            </View>
                        )}
                    </View>
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
                        <Text style={styles.emptyText}>No users found for this {scope}.</Text>
                        {!filterValue && scope !== 'all' && (
                            <Text style={styles.hintText}>Set your {scope} in settings to see local rankings.</Text>
                        )}
                    </View>
                ) : (
                    <>
                        {/* ─── PODIUM TOP 3 ─── */}
                        {displayData.length >= 3 && (
                            <View style={styles.podiumContainer}>
                                {/* Rank 2 (Left) */}
                                <Pressable style={styles.podiumColumn} onPress={() => handlePress(displayData[1])}>
                                    <View style={[styles.podiumAvatarWrapper, { borderColor: RANK_COLORS[2].border }]}>
                                        {displayData[1].profile_image_url ? (
                                            <Image source={{ uri: displayData[1].profile_image_url }} style={styles.podiumAvatarImage} />
                                        ) : (
                                            <View style={[styles.podiumAvatarImage, { backgroundColor: avatarColor(displayData[1].user_id) }]}>
                                                <Text style={styles.podiumAvatarInitials}>{initials(displayData[1].username)}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.podiumMedalBox, { backgroundColor: RANK_COLORS[2].border }]}>
                                            <Text style={styles.podiumMedalText}>2</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.podiumUsername} numberOfLines={1}>{displayData[1].username}</Text>
                                    <View style={styles.podiumXpBadge}>
                                        <Text style={styles.podiumXpText}>{displayData[1].workout_xp} XP</Text>
                                    </View>
                                    <View style={[styles.podiumBlock, styles.podiumBlock2]} />
                                </Pressable>

                                {/* Rank 1 (Center) */}
                                <Pressable style={[styles.podiumColumn, { zIndex: 10 }]} onPress={() => handlePress(displayData[0])}>
                                    <View style={styles.crownContainer}>
                                        <Trophy size={20} color="#bef264" fill="rgba(190,242,100,0.5)" />
                                    </View>
                                    <View style={[styles.podiumAvatarWrapper, styles.podiumAvatarWrapper1, { borderColor: RANK_COLORS[1].border }]}>
                                        {displayData[0].profile_image_url ? (
                                            <Image source={{ uri: displayData[0].profile_image_url }} style={styles.podiumAvatarImage1} />
                                        ) : (
                                            <View style={[styles.podiumAvatarImage1, { backgroundColor: avatarColor(displayData[0].user_id) }]}>
                                                <Text style={styles.podiumAvatarInitials1}>{initials(displayData[0].username)}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.podiumMedalBox, { backgroundColor: RANK_COLORS[1].border, width: 24, height: 24, borderRadius: 12 }]}>
                                            <Text style={[styles.podiumMedalText, { fontSize: 13 }]}>1</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.podiumUsername, { fontSize: 13, fontWeight: '800' }]} numberOfLines={1}>{displayData[0].username}</Text>
                                    <View style={styles.podiumXpBadge}>
                                        <Text style={styles.podiumXpText}>{displayData[0].workout_xp} XP</Text>
                                    </View>
                                    <View style={[styles.podiumBlock, styles.podiumBlock1]} />
                                </Pressable>

                                {/* Rank 3 (Right) */}
                                <Pressable style={styles.podiumColumn} onPress={() => handlePress(displayData[2])}>
                                    <View style={[styles.podiumAvatarWrapper, { borderColor: RANK_COLORS[3].border }]}>
                                        {displayData[2].profile_image_url ? (
                                            <Image source={{ uri: displayData[2].profile_image_url }} style={styles.podiumAvatarImage} />
                                        ) : (
                                            <View style={[styles.podiumAvatarImage, { backgroundColor: avatarColor(displayData[2].user_id) }]}>
                                                <Text style={styles.podiumAvatarInitials}>{initials(displayData[2].username)}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.podiumMedalBox, { backgroundColor: RANK_COLORS[3].border }]}>
                                            <Text style={styles.podiumMedalText}>3</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.podiumUsername} numberOfLines={1}>{displayData[2].username}</Text>
                                    <View style={styles.podiumXpBadge}>
                                        <Text style={styles.podiumXpText}>{displayData[2].workout_xp} XP</Text>
                                    </View>
                                    <View style={[styles.podiumBlock, styles.podiumBlock3]} />
                                </Pressable>
                            </View>
                        )}

                        {/* ─── LIST (Ranks 4+) ─── */}
                        <View style={styles.scrollWrapper}>
                            <ScrollView
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {displayData.slice(3).map((item, index) => renderItem({ item, index: index + 3 }))}
                            </ScrollView>
                        </View>
                    </>
                )}

                {/* Sticky User Row (Always shown at bottom) */}
                {data.currentUserEntry && (
                    <View style={styles.stickyUserRow}>
                        <Pressable
                            style={styles.neonCard}
                            onPress={() => handlePress(data.currentUserEntry!)}
                        >
                            <View style={styles.rankContainer}>
                                <Text style={styles.rankTextSticky}>#{data.currentUserEntry.rank || '??'}</Text>
                            </View>

                            <View style={styles.avatarSticky}>
                                {data.currentUserEntry.profile_image_url ? (
                                    <Image style={styles.avatarStickyImage} source={{ uri: data.currentUserEntry.profile_image_url }} />
                                ) : (
                                    <View style={[styles.avatarSticky, { backgroundColor: '#000', marginRight: 0 }]}>
                                        <Text style={styles.avatarInitialsSticky}>{initials(data.currentUserEntry.username || 'User')}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.userInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={styles.usernameSticky} numberOfLines={1}>
                                        {data.currentUserEntry.username || 'You'}
                                    </Text>
                                    <Text style={styles.youLabel}>(you)</Text>
                                </View>
                                <Text style={styles.levelTextSticky}>Level {data.currentUserEntry.workout_level || 1}</Text>
                            </View>

                            <Text style={styles.xpTextSticky}>
                                {(data.currentUserEntry.workout_xp || 0).toLocaleString()} XP
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>

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
                                        {hoveredEntry.profile_image_url ? (
                                            <Image style={{ width: '100%', height: '100%' }} source={{ uri: hoveredEntry.profile_image_url }} />
                                        ) : (
                                            <Text style={styles.chipAvatarText}>{initials(hoveredEntry.username)}</Text>
                                        )}
                                        {hoveredEntry.rank <= 3 && (
                                            <View style={[styles.medalOverlay, { width: 24, height: 24, bottom: 0, right: 0, borderRadius: 12 }]}>
                                                <Text style={{ fontSize: 14 }}>{RANK_MEDALS[hoveredEntry.rank - 1]}</Text>
                                            </View>
                                        )}
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
                                        {(hoveredEntry.streak ?? 0) > 0 && (
                                            <>
                                                <View style={styles.chipStatDivider} />
                                                <View style={styles.chipStat}>
                                                    <Image
                                                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/785/785116.png' }}
                                                        style={{ width: 14, height: 14 }}
                                                    />
                                                    <Text style={styles.chipStatValue}>{hoveredEntry.streak}</Text>
                                                    <Text style={styles.chipStatLabel}>Streak</Text>
                                                </View>
                                            </>
                                        )}
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

const LIST_HEIGHT = 800; // Increased height for better visibility

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
        maxHeight: 600, // Fluid height with a max cap
    },
    scrollContent: {
        paddingVertical: 8,
        paddingBottom: 20,
        flexGrow: 1, // Allow content to expand fluidly
    },
    loadingContainer: {
        maxHeight: LIST_HEIGHT,
        minHeight: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#444',
        fontSize: 14,
        fontWeight: '600',
    },
    hintText: {
        color: '#666',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
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
        backgroundColor: 'rgba(190, 242, 100, 0.12)',
        borderColor: '#bef264',
        borderWidth: 1.5,
    },
    userRowSeparator: {
        marginTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#222',
        borderStyle: 'dashed',
        paddingTop: 12,
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
    avatarWrapper: {
        position: 'relative',
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    medalOverlay: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#000',
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    medalIconSmall: {
        fontSize: 10,
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
    podiumContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingHorizontal: 10,
        height: 220,
        marginBottom: 16,
    },
    podiumColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    crownContainer: {
        marginBottom: 4,
    },
    podiumAvatarWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        marginBottom: 8,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumAvatarWrapper1: {
        width: 66,
        height: 66,
        borderRadius: 33,
        borderWidth: 3,
        marginBottom: 8,
    },
    podiumAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumAvatarImage1: {
        width: '100%',
        height: '100%',
        borderRadius: 33,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumAvatarInitials: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    podiumAvatarInitials1: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    podiumMedalBox: {
        position: 'absolute',
        bottom: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#111',
    },
    podiumMedalText: {
        color: '#111',
        fontSize: 10,
        fontWeight: '900',
    },
    podiumUsername: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    podiumXpBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginBottom: 8,
    },
    podiumXpText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '800',
    },
    podiumBlock: {
        width: '90%',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    podiumBlock1: {
        height: 90,
        backgroundColor: '#FBBF24',
    },
    podiumBlock2: {
        height: 60,
        backgroundColor: '#22D3EE',
    },
    podiumBlock3: {
        height: 40,
        backgroundColor: '#FB923C',
    },
});

export default Leaderboard;
