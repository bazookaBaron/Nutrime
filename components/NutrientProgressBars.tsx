import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NutrientTotals, NUTRIENT_META, RECOMMENDED_DAILY, rawPercent } from '../utils/analyticsUtils';

interface Props {
    actual: NutrientTotals;
    /** Override recommended values (e.g. from user targets for protein/carbs/fat). */
    recommended?: Partial<NutrientTotals>;
}

export default function NutrientProgressBars({ actual, recommended }: Props) {
    const targets: NutrientTotals = { ...RECOMMENDED_DAILY, ...recommended };

    return (
        <View style={styles.container}>
            {NUTRIENT_META.map(nutrient => {
                const consumed = actual[nutrient.key] ?? 0;
                const target = targets[nutrient.key] ?? RECOMMENDED_DAILY[nutrient.key];
                const pct = rawPercent(consumed, target);
                const isOver = pct > 1;
                const barPct = Math.min(pct, 1);
                const displayPct = Math.round(pct * 100);

                return (
                    <View key={nutrient.key} style={styles.row}>
                        {/* Nutrient name + values */}
                        <View style={styles.labelRow}>
                            <View style={styles.nameBlock}>
                                <View style={[styles.dot, { backgroundColor: nutrient.color }]} />
                                <Text style={styles.name}>{nutrient.label}</Text>
                            </View>
                            <View style={styles.valueBlock}>
                                <Text style={[styles.consumed, isOver && styles.overText]}>
                                    {consumed}
                                    <Text style={styles.unit}>{nutrient.unit}</Text>
                                </Text>
                                <Text style={styles.separator}>/</Text>
                                <Text style={styles.target}>
                                    {target}
                                    <Text style={styles.unit}>{nutrient.unit}</Text>
                                </Text>
                                <View style={[styles.badge, { backgroundColor: isOver ? 'rgba(239,68,68,0.15)' : nutrient.bgColor }]}>
                                    <Text style={[styles.badgeText, { color: isOver ? '#ef4444' : nutrient.color }]}>
                                        {displayPct}%{isOver ? ' !' : ''}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Progress track */}
                        <View style={styles.track}>
                            <View
                                style={[
                                    styles.fill,
                                    {
                                        width: `${barPct * 100}%`,
                                        backgroundColor: isOver ? '#ef4444' : nutrient.color,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 14,
    },
    row: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        color: '#e5e7eb',
    },
    valueBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    consumed: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#fff',
    },
    overText: {
        color: '#ef4444',
    },
    separator: {
        color: '#4b5563',
        fontSize: 12,
    },
    target: {
        fontSize: 12,
        color: '#9ca3af',
    },
    unit: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: 'normal',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    track: {
        height: 5,
        backgroundColor: '#374151',
        borderRadius: 3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
});
