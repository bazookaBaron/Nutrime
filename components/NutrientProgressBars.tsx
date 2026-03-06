import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NutrientTotals, NUTRIENT_META, RECOMMENDED_DAILY } from '../utils/analyticsUtils';

interface Props {
    actual: NutrientTotals;
    /** Simplified view: actuals only, no target comparison. */
    recommended?: Partial<NutrientTotals>;
}

export default function NutrientProgressBars({ actual, recommended }: Props) {
    const targets: NutrientTotals = { ...RECOMMENDED_DAILY, ...recommended };

    return (
        <View style={styles.container}>
            {NUTRIENT_META.map(nutrient => {
                const consumed = actual[nutrient.key] ?? 0;
                const target = targets[nutrient.key] ?? RECOMMENDED_DAILY[nutrient.key];

                // Use a generous visual max so the bar represents the value 
                // but never hits the end, and doesn't imply a "goal completion".
                const visualMax = target * 2.5;
                const barPct = Math.min(consumed / visualMax, 0.95);

                return (
                    <View key={nutrient.key} style={styles.row}>
                        {/* Nutrient name + values */}
                        <View style={styles.labelRow}>
                            <View style={styles.nameBlock}>
                                <View style={[styles.dot, { backgroundColor: nutrient.color }]} />
                                <Text style={styles.name}>{nutrient.label}</Text>
                            </View>
                            <View style={styles.valueBlock}>
                                <Text style={styles.consumed}>
                                    {consumed}
                                    <Text style={styles.unit}>{nutrient.unit}</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Progress track */}
                        <View style={styles.track}>
                            <View
                                style={[
                                    styles.fill,
                                    {
                                        width: `${barPct * 100}%`,
                                        backgroundColor: nutrient.color,
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
    unit: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: 'normal',
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
