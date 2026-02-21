import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Pressable, Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { Trophy, User, X, Zap, Star } from 'lucide-react-native';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    workout_xp: number;
    workout_level: number;
}

interface LeaderboardProps {
    currentUserId: string;
    userCountry?: string;
    userState?: string;
    onFetchLeaderboard: (scope: 'country' | 'state', filter?: string) => Promise<any>;
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

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId, userCountry, userState, onFetchLeaderboard }) => {
    const [scope, setScope] = useState<'country' | 'state'>('state');
    const [data, setData] = useState<LeaderboardData>({ top10: [], currentUserEntry: null });
    const [loading, setLoading] = useState(true);

    // Hover chip state
    const [hoveredEntry, setHoveredEntry] = useState<LeaderboardEntry | null>(null);
    const [chipX, setChipX] = useState(0);
    const [chipY, setChipY] = useState(0);

    React.useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const filterValue = scope === 'country' ? userCountry : userState;
            const result = await onFetchLeaderboard(scope, filterValue);
            // @ts-ignore
            setData(result);
            setLoading(false);
        };
        loadData();
    }, [scope, userCountry, userState, onFetchLeaderboard]);

    const isCurrentUserInTop10 = data.top10.some(entry => entry.user_id === currentUserId);
    const displayData = [...data.top10];
    if (!isCurrentUserInTop10 && data.currentUserEntry) {
        displayData.push(data.currentUserEntry);
    }

    const getBadgeIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return null;
    };

    const handleLongPress = useCallback((item: LeaderboardEntry, event: any) => {
        const { pageX, pageY } = event.nativeEvent;
        setChipX(pageX);
        setChipY(pageY);
        setHoveredEntry(item);
    }, []);

    const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isCurrentUser = item.user_id === currentUserId;
        const showBadge = item.rank <= 3;
        const isUserRow = !isCurrentUserInTop10 && isCurrentUser && index === data.top10.length;
        const bgColor = avatarColor(item.user_id);

        return (
            <Pressable
                onLongPress={(e) => handleLongPress(item, e)}
                onPress={() => handleLongPress(item, { nativeEvent: { pageX: 120, pageY: 300 } })}
                delayLongPress={200}
                style={[
                    styles.entryRow,
                    isCurrentUser && styles.entryRowCurrent,
                    isUserRow && styles.userRowSeparator
                ]}
            >
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, isCurrentUser && styles.textCurrent]}>
                        {item.rank}
                    </Text>
                </View>

                <View style={styles.avatarContainer}>
                    {showBadge ? (
                        <Text style={styles.badgeIcon}>{getBadgeIcon(item.rank)}</Text>
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: bgColor }, isCurrentUser && styles.avatarCurrent]}>
                            <Text style={styles.avatarInitials}>{initials(item.username)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={[styles.username, isCurrentUser && styles.textCurrent]} numberOfLines={1}>
                        {item.username}
                    </Text>
                    <Text style={styles.levelText}>Level {item.workout_level}</Text>
                </View>

                <Text style={[styles.xpText, isCurrentUser && styles.textCurrent]}>
                    {item.workout_xp.toLocaleString()} XP
                </Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerSection}>
                <Text style={styles.subtitle}>WEEKLY EARNINGS</Text>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>Leaderboard</Text>
                    <View style={styles.trophyIcon}>
                        <Trophy size={18} color="#bef264" />
                    </View>
                </View>
            </View>

            {/* Scope Selector */}
            <View style={styles.scopeSelector}>
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

            {/* Leaderboard List */}
            <View style={styles.list}>
                {loading ? (
                    <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>Loading rankings...</Text>
                ) : displayData.length === 0 ? (
                    <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>No users found in this region.</Text>
                ) : (
                    displayData.map((item, index) => (
                        <React.Fragment key={`${item.user_id}-${index}`}>
                            {renderItem({ item, index })}
                        </React.Fragment>
                    ))
                )}
            </View>

            {/* Hover Chip Modal */}
            {hoveredEntry && (
                <Modal transparent animationType="fade" visible onRequestClose={() => setHoveredEntry(null)}>
                    <TouchableWithoutFeedback onPress={() => setHoveredEntry(null)}>
                        <View style={styles.chipOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.chipCard}>
                                    {/* Close */}
                                    <TouchableOpacity style={styles.chipClose} onPress={() => setHoveredEntry(null)}>
                                        <X size={14} color="#9ca3af" />
                                    </TouchableOpacity>

                                    {/* Avatar large */}
                                    <View style={[styles.chipAvatar, { backgroundColor: avatarColor(hoveredEntry.user_id) }]}>
                                        <Text style={styles.chipAvatarText}>{initials(hoveredEntry.username)}</Text>
                                    </View>

                                    {/* Username & rank */}
                                    <Text style={styles.chipUsername}>{hoveredEntry.username}</Text>
                                    <View style={styles.chipRankBadge}>
                                        <Text style={styles.chipRankText}>#{hoveredEntry.rank}</Text>
                                    </View>

                                    {/* Stats row */}
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 20,
        marginTop: 20,
    },
    headerSection: {
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1,
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    trophyIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scopeSelector: {
        flexDirection: 'row',
        backgroundColor: '#0A0A0A',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        gap: 4,
    },
    scopeBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    scopeBtnActive: {
        backgroundColor: '#bef264',
    },
    scopeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    scopeTextActive: {
        color: '#000',
    },
    list: {
        marginTop: 4,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        marginBottom: 2,
        borderRadius: 10,
    },
    entryRowCurrent: {
        backgroundColor: 'rgba(190,242,100,0.08)',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    userRowSeparator: {
        marginTop: 12,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
    },
    rankContainer: {
        width: 32,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#666',
    },
    textCurrent: {
        color: '#bef264',
    },
    avatarContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: 4,
    },
    badgeIcon: {
        fontSize: 28,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCurrent: {
        borderWidth: 2,
        borderColor: '#bef264',
    },
    avatarInitials: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        marginLeft: 8,
    },
    username: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 3,
    },
    levelText: {
        fontSize: 12,
        color: '#666',
    },
    xpText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    // Hover Chip Styles
    chipOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipCard: {
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 24,
        width: 220,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
        position: 'relative',
    },
    chipClose: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 4,
    },
    chipAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 3,
        borderColor: '#bef264',
    },
    chipAvatarText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    chipUsername: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    chipRankBadge: {
        backgroundColor: 'rgba(190,242,100,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 16,
    },
    chipRankText: {
        color: '#bef264',
        fontWeight: '700',
        fontSize: 13,
    },
    chipStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    chipStat: {
        alignItems: 'center',
        gap: 2,
    },
    chipStatValue: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    chipStatLabel: {
        color: '#9ca3af',
        fontSize: 11,
    },
    chipStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#374151',
    },
});

export default Leaderboard;
