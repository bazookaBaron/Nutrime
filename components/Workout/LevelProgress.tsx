
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LevelProgress = ({ level, xp, nextLevelXp }) => {
    // Calculate progress percentage
    // Simplified: typical levels need more XP.
    // For visualization let's assume intervals.
    // Level 1: 0-2000. Level 2: 2000-3500. Level 3: 3500-5000.

    let currentLevelBase = 0;
    let nextLevelTarget = 2000;

    if (level === 2) { currentLevelBase = 2000; nextLevelTarget = 3500; }
    if (level === 3) { currentLevelBase = 3500; nextLevelTarget = 5000; }
    if (level >= 4) { currentLevelBase = 5000; nextLevelTarget = 10000; } // Pro caps visually?

    const progress = Math.min(Math.max((xp - currentLevelBase) / (nextLevelTarget - currentLevelBase), 0), 1);

    return (
        <View style={styles.container}>
            <View style={styles.levelBadge}>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelValue}>{level}</Text>
            </View>
            <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                    <Text style={styles.xpText}>{xp} XP</Text>
                    <Text style={styles.xpText}>{nextLevelTarget} XP</Text>
                </View>
                <View style={styles.barBackground}>
                    <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.nextLevelText}>
                    {Math.round((nextLevelTarget - xp))} XP to next level
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    levelBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4ade80', // Green accent
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    levelLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    levelValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    progressContainer: {
        flex: 1,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    xpText: {
        fontSize: 12,
        color: '#AAA',
        fontWeight: '600',
    },
    barBackground: {
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    barFill: {
        height: '100%',
        backgroundColor: '#4ade80',
        borderRadius: 4,
    },
    nextLevelText: {
        fontSize: 11,
        color: '#888',
        textAlign: 'right',
    },
});

export default LevelProgress;
