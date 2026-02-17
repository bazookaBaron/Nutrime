import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy, User } from 'lucide-react-native';

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
    onFetchLeaderboard: (scope: 'country' | 'state', filter?: string) => Promise<LeaderboardEntry[]>;
}

// Mock data for development
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, user_id: 'user1', username: 'Anonymous', workout_xp: 10500, workout_level: 10 },
    { rank: 2, user_id: 'user2', username: 'Sarah Miller', workout_xp: 8450, workout_level: 8 },
    { rank: 3, user_id: 'user3', username: 'Jake Thompson', workout_xp: 7920, workout_level: 7 },
    { rank: 4, user_id: 'user4', username: 'David Chen', workout_xp: 7105, workout_level: 7 },
    { rank: 5, user_id: 'user5', username: 'Maria B.', workout_xp: 6840, workout_level: 6 },
    { rank: 6, user_id: 'user6', username: 'Tom Wilson', workout_xp: 6120, workout_level: 6 },
    { rank: 7, user_id: 'user7', username: 'Elena G.', workout_xp: 5890, workout_level: 5 },
    { rank: 8, user_id: 'user8', username: 'Ryan K.', workout_xp: 5230, workout_level: 5 },
    { rank: 15, user_id: 'current-user', username: 'You', workout_xp: 3200, workout_level: 3 },
];

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUserId }) => {
    const [scope, setScope] = useState<'country' | 'state'>('country');

    // Use mock data for now - show top 8
    const top8 = MOCK_LEADERBOARD.slice(0, 8);
    const currentUserEntry = MOCK_LEADERBOARD.find(entry => entry.user_id === 'current-user');
    const isCurrentUserInTop8 = currentUserEntry && currentUserEntry.rank <= 8;

    // Build display list: if user not in top 8, add them as 9th entry
    const displayData = isCurrentUserInTop8 ? top8 : [...top8, currentUserEntry!];

    const getBadgeIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return null;
    };

    const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isCurrentUser = item.user_id === 'current-user';
        const showBadge = item.rank <= 3;
        const isUserRow = !isCurrentUserInTop8 && index === 8;

        return (
            <View style={[
                styles.entryRow,
                isCurrentUser && styles.entryRowCurrent,
                isUserRow && styles.userRowSeparator
            ]}>
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, isCurrentUser && styles.textCurrent]}>
                        {item.rank}
                    </Text>
                </View>

                <View style={styles.avatarContainer}>
                    {showBadge ? (
                        <Text style={styles.badgeIcon}>{getBadgeIcon(item.rank)}</Text>
                    ) : (
                        <View style={[styles.avatar, isCurrentUser && styles.avatarCurrent]}>
                            <User size={16} color={isCurrentUser ? "#4ade80" : "#666"} />
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
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerSection}>
                <Text style={styles.subtitle}>WEEKLY EARNINGS</Text>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>Leaderboard</Text>
                    <View style={styles.trophyIcon}>
                        <Trophy size={18} color="#4ade80" />
                    </View>
                </View>
            </View>

            {/* Scope Selector - Country/State only */}
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
                {displayData.map((item, index) => (
                    <React.Fragment key={item.user_id}>
                        {renderItem({ item, index })}
                    </React.Fragment>
                ))}
            </View>
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
        backgroundColor: '#4ade80',
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
    listContent: {
        paddingBottom: 8,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        marginBottom: 2,
    },
    entryRowCurrent: {
        backgroundColor: '#1a3a1a',
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
        color: '#4ade80',
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
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCurrent: {
        backgroundColor: '#1a3a1a',
        borderWidth: 2,
        borderColor: '#4ade80',
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
});

export default Leaderboard;
