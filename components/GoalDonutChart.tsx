import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

interface Props {
    consumed: number;
    goal: number;
}

export default function GoalDonutChart({ consumed, goal }: Props) {
    const { slices, percentage, isOver } = useMemo(() => {
        const pct = goal > 0 ? consumed / goal : 0;
        const isOver = pct > 1;
        const displayPct = Math.min(pct, 1);

        let slices;
        if (isOver) {
            // Over target: show full donut in lime + red overflow arc that wraps
            const overflowPct = pct - 1; // e.g. 0.15 → 15% over
            const overflowAngle = Math.min(overflowPct, 1) * 360;
            slices = [
                // Main fill (full circle base)
                { value: 100 - overflowAngle * 0.277, color: '#bef264', focused: false },
                { value: overflowAngle * 0.277, color: '#ef4444', focused: false },
            ];
        } else if (displayPct === 0) {
            slices = [
                { value: 1, color: '#374151', focused: false },
            ];
        } else {
            slices = [
                { value: displayPct * 100, color: '#bef264', focused: false },
                { value: (1 - displayPct) * 100, color: '#374151', focused: false },
            ];
        }

        // Spread each slice into a fresh object — gifted-charts mutates data items
        // (adds "isActiveClone") which crashes when React freezes props in dev mode.
        return { slices: slices.map(s => ({ ...s })), percentage: Math.round(pct * 100), isOver };
    }, [consumed, goal]);

    const remaining = Math.max(0, goal - consumed);

    return (
        <View style={styles.container}>
            <View style={styles.chartWrapper}>
                <PieChart
                    data={slices}
                    donut
                    radius={72}
                    innerRadius={50}
                    innerCircleColor="#1f2937"
                    strokeWidth={0}
                    isAnimated
                    animationDuration={600}
                />
                {/* Center label */}
                <View style={styles.centerLabel} pointerEvents="none">
                    <Text style={[styles.percentText, isOver && styles.overText]}>
                        {percentage}%
                    </Text>
                    <Text style={styles.centerSub}>{isOver ? 'Over goal' : 'of goal'}</Text>
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#bef264' }]} />
                    <Text style={styles.statValue}>{Math.round(consumed)}</Text>
                    <Text style={styles.statLabel}>kcal eaten</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#374151' }]} />
                    <Text style={styles.statValue}>{Math.round(goal)}</Text>
                    <Text style={styles.statLabel}>kcal goal</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: isOver ? '#ef4444' : '#6b7280' }]} />
                    <Text style={[styles.statValue, isOver && { color: '#ef4444' }]}>
                        {isOver ? `+${Math.round(consumed - goal)}` : Math.round(remaining)}
                    </Text>
                    <Text style={styles.statLabel}>{isOver ? 'over' : 'remaining'}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    chartWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 144,
        height: 144,
    },
    centerLabel: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#bef264',
    },
    overText: {
        color: '#ef4444',
    },
    centerSub: {
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        alignItems: 'center',
        gap: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    statLabel: {
        fontSize: 10,
        color: '#9ca3af',
    },
    divider: {
        width: 1,
        height: 36,
        backgroundColor: '#374151',
    },
});
