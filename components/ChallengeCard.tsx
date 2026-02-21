import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useChallenges } from '../context/ChallengesContext';
import { Trophy, Clock, Zap, Users, CheckCircle, Lock } from 'lucide-react-native';
import AnimatedProgressBar from './AnimatedProgressBar';

const { width } = Dimensions.get('window');

interface ChallengeCardProps {
    challenge: any;
    userChallenge?: any;
    onPress?: (challenge: any, userChallenge?: any) => void;
}

export default function ChallengeCard({ challenge, userChallenge, onPress }: ChallengeCardProps) {
    const { joinChallenge } = useChallenges();
    const [joining, setJoining] = useState(false);

    const isJoined = !!userChallenge;
    const isCompleted = userChallenge?.status === 'completed';

    const handleJoin = async () => {
        setJoining(true);
        try {
            await joinChallenge(challenge.id);
        } finally {
            setJoining(false);
        }
    };

    const getTimeRemaining = () => {
        const now = new Date();
        const end = new Date(challenge.end_time);
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) return 'Ended';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return `${days}d left`;
        return `${hours}h left`;
    };

    const CardComponent = onPress ? TouchableOpacity : View;

    return (
        <CardComponent
            style={styles.card}
            activeOpacity={0.8}
            onPress={onPress ? () => onPress(challenge, userChallenge) : undefined}
        >
            <View style={styles.leftSection}>
                <View style={[styles.iconContainer, { backgroundColor: isJoined ? 'rgba(190, 242, 100, 0.1)' : 'rgba(107, 114, 128, 0.1)' }]}>
                    <Trophy size={20} color={isJoined ? "#bef264" : "#9ca3af"} />
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
                </View>

                <View style={styles.tagsRow}>
                    <View style={styles.xpTag}>
                        <Zap size={10} color="#ca8a04" />
                        <Text style={styles.xpTagText}>{challenge.xp_reward} XP</Text>
                    </View>
                    {challenge.type && (
                        <View style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{challenge.type.toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.metaRow}>
                    <Clock size={10} color="#9ca3af" />
                    <Text style={styles.metaText}>{getTimeRemaining()}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Users size={10} color="#9ca3af" />
                    <Text style={styles.metaText}>{challenge.participants_count || 0}</Text>
                </View>

                {isJoined && !isCompleted && (
                    <View style={styles.progressContainer}>
                        <AnimatedProgressBar
                            progress={0.1}
                            color="#bef264"
                            backgroundColor="#374151"
                            height={4}
                        />
                    </View>
                )}
            </View>

            <View style={styles.rightSection}>
                {isJoined ? (
                    <View style={styles.statusBadge}>
                        {isCompleted ? (
                            <CheckCircle size={18} color="#bef264" />
                        ) : (
                            <Clock size={18} color="#9ca3af" />
                        )}
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.compactJoinButton}
                        onPress={handleJoin}
                        disabled={joining}
                    >
                        <Text style={styles.joinText}>{joining ? '...' : 'Join'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </CardComponent>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151',
        alignItems: 'center',
    },
    leftSection: {
        marginRight: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    tagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    xpTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(202, 138, 4, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    xpTagText: {
        color: '#facc15',
        fontSize: 10,
        fontWeight: 'bold',
    },
    categoryTag: {
        backgroundColor: '#374151',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryTagText: {
        color: '#d1d5db',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        color: '#4b5563',
        fontSize: 10,
        marginHorizontal: 2,
    },
    metaText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    progressContainer: {
        marginTop: 6,
        width: '80%',
    },
    rightSection: {
        marginLeft: 12,
    },
    statusBadge: {
        padding: 4,
    },
    compactJoinButton: {
        backgroundColor: '#bef264',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    joinText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
