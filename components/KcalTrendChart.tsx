import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { DailyKcal } from '../utils/analyticsUtils';

// Above this many data points, suppress per-point labels to avoid crowding
const LABEL_HIDE_THRESHOLD = 14;

interface Props {
    data: DailyKcal[];
    goalKcal: number;
}

export default function KcalTrendChart({ data, goalKcal }: Props) {
    // Measure the container so the chart always fills exactly the available width
    const [chartWidth, setChartWidth] = useState(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setChartWidth(w);
    }, []);

    const isDense = data.length > LABEL_HIDE_THRESHOLD;

    // Compute per-point spacing so all points fit inside chartWidth.
    // gifted-charts needs: spacing * (n-1) + initialSpacing + endSpacing ≈ chartWidth - yAxisWidth (~50)
    const computedSpacing = useMemo(() => {
        if (!chartWidth || data.length <= 1) return 40;
        // Conserve more space to ensure the x-axis line stays within bounds
        const usable = chartWidth - 110;
        return Math.max(6, Math.floor(usable / Math.max(data.length - 1, 1)));
    }, [chartWidth, data.length]);

    const { intakeData, goalData } = useMemo(() => {
        const intakeData = data.map(d => ({
            value: d.kcal,
            label: isDense ? '' : d.label,
            labelTextStyle: isDense
                ? { ...styles.axisLabel, fontSize: 0 }
                : { ...styles.axisLabel },
            dataPointText: (!isDense && d.kcal > 0) ? String(d.kcal) : '',
            dataPointTextStyle: { ...styles.dataPointText },
        }));

        // Goal line – same value every day, drawn as data2 (dashed)
        const goalData = data.map(() => ({ value: goalKcal }));

        return { intakeData, goalData };
    }, [data, goalKcal, isDense]);

    if (data.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No calorie data for this period.</Text>
            </View>
        );
    }

    const maxVal = Math.max(...data.map(d => d.kcal), goalKcal, 100);

    return (
        <View>
            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#bef264' }]} />
                    <Text style={styles.legendText}>Intake</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={styles.dashedLine} />
                    <Text style={styles.legendText}>Goal {goalKcal} kcal</Text>
                </View>
            </View>

            {/* Measure container; render chart only once width is known */}
            <View style={styles.chartWrapper} onLayout={onLayout}>
                {chartWidth > 0 && (
                    <LineChart
                        data={intakeData}
                        data2={goalData}
                        width={chartWidth - 80}
                        height={190}
                        thickness={2}
                        thickness2={1.5}
                        initialSpacing={isDense ? 4 : 20}
                        spacing={isDense ? computedSpacing : 40}
                        color="#bef264"
                        color2="#6b7280"
                        curved
                        hideRules={false}
                        rulesColor="rgba(55,65,81,0.5)"
                        noOfSections={4}
                        maxValue={Math.ceil(maxVal / 200) * 200}
                        hideDataPoints={false}
                        dataPointsColor="#bef264"
                        dataPointsColor2="#6b7280"
                        dataPointsRadius={4}
                        dataPointsRadius2={0}
                        dashWidth={8}
                        dashGap={6}
                        yAxisTextStyle={styles.axisLabel}
                        xAxisLabelTextStyle={styles.axisLabel}
                        startFillColor="rgba(190,242,100,0.3)"
                        endFillColor="rgba(190,242,100,0.01)"
                        startOpacity={0.9}
                        endOpacity={0.1}
                        areaChart
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor="#374151"
                        pointerConfig={{
                            pointerStripHeight: 170,
                            pointerStripColor: '#4b5563',
                            pointerStripWidth: 1,
                            pointerColor: '#bef264',
                            radius: 6,
                            pointerLabelWidth: 110,
                            pointerLabelHeight: 56,
                            activatePointersOnLongPress: true,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: (items: any[]) => (
                                <View style={styles.tooltip}>
                                    <Text style={styles.tooltipLabel}>{items[0]?.label ?? ''}</Text>
                                    <Text style={styles.tooltipIntake}>{items[0]?.value} kcal</Text>
                                    <Text style={styles.tooltipGoal}>Goal: {goalKcal} kcal</Text>
                                </View>
                            ),
                        }}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    chartWrapper: {
        marginTop: 10,
        // flex: 1 makes it take all available width in the card
        alignSelf: 'stretch',
    },
    legend: {
        flexDirection: 'row',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dashedLine: {
        width: 18,
        height: 2,
        borderRadius: 1,
        borderWidth: 1,
        borderColor: '#6b7280',
        borderStyle: 'dashed',
    },
    legendText: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
    },
    axisLabel: {
        color: '#9ca3af',
        fontSize: 9,
    },
    dataPointText: {
        color: '#bef264',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    tooltip: {
        backgroundColor: '#1f2937',
        borderRadius: 10,
        padding: 8,
        borderWidth: 1,
        borderColor: '#374151',
        alignItems: 'center',
    },
    tooltipLabel: {
        color: '#9ca3af',
        fontSize: 10,
        marginBottom: 2,
    },
    tooltipIntake: {
        color: '#bef264',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tooltipGoal: {
        color: '#6b7280',
        fontSize: 10,
    },
    empty: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 13,
    },
});
