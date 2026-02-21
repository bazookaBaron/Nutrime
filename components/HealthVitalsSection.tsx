import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Heart, Moon, Activity, RefreshCw, Wifi } from 'lucide-react-native';
import { DailyWearableData } from '../services/WearableService';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

interface Props {
    wearableData: DailyWearableData[];
    onRefresh: () => void;
}

function useLast7Days(data: DailyWearableData[]) {
    return useMemo(() => {
        const today = new Date();
        const results: DailyWearableData[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = data.find(x => x.date === dateStr);
            results.push(
                entry ?? { date: dateStr, steps: 0, heart_rate_avg: 0, calories_active: 0, sleep_minutes: 0, distance_km: 0 }
            );
        }
        return results;
    }, [data]);
}

function average(vals: number[]): number {
    const valid = vals.filter(v => v > 0);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
}

function VitalCard({
    icon,
    iconColor,
    iconBg,
    label,
    unit,
    current,
    weeklyAvg,
    chartData,
    chartType,
}: {
    icon: React.ReactNode;
    iconColor: string;
    iconBg: string;
    label: string;
    unit: string;
    current: number;
    weeklyAvg: number;
    chartData: { value: number }[];
    chartType: 'line' | 'bar';
}) {
    const hasData = chartData.some(d => d.value > 0);
    const chartWidth = screenWidth - 108;
    // Spread each item — gifted-charts mutates data objects in-place (isActiveClone)
    const safeData = chartData.map(d => ({ ...d }));

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
                    {icon}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>{label}</Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.currentValue, { color: iconColor }]}>
                            {current > 0 ? current : '—'}
                        </Text>
                        <Text style={styles.unit}>{current > 0 ? unit : ''}</Text>
                        {weeklyAvg > 0 && (
                            <View style={[styles.avgBadge, { backgroundColor: iconBg }]}>
                                <Text style={[styles.avgText, { color: iconColor }]}>
                                    7d avg: {weeklyAvg}{unit}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {hasData ? (
                <View style={{ marginTop: 12 }}>
                    {chartType === 'line' ? (
                        <LineChart
                            data={safeData}
                            width={chartWidth}
                            height={70}
                            thickness={2}
                            color={iconColor}
                            startFillColor={iconColor + '30'}
                            endFillColor={iconColor + '05'}
                            areaChart
                            hideDataPoints={false}
                            dataPointsColor={iconColor}
                            dataPointsRadius={3}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            hideRules
                            noOfSections={2}
                            yAxisTextStyle={{ color: '#9ca3af', fontSize: 8 }}
                            startOpacity={0.8}
                            endOpacity={0.1}
                        />
                    ) : (
                        <BarChart
                            data={safeData}
                            width={chartWidth}
                            height={70}
                            barWidth={Math.max(6, (chartWidth / 7) - 6)}
                            spacing={6}
                            barBorderRadius={3}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            hideRules
                            noOfSections={2}
                            yAxisTextStyle={{ color: '#9ca3af', fontSize: 8 }}
                            frontColor={iconColor}
                        />
                    )}
                </View>
            ) : (
                <View style={styles.noData}>
                    <Text style={styles.noDataText}>No data for this week</Text>
                </View>
            )}
        </View>
    );
}

export default function HealthVitalsSection({ wearableData, onRefresh }: Props) {
    const router = useRouter();
    const last7 = useLast7Days(wearableData);
    const hasAnyData = wearableData.length > 0;

    // Today's values
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = wearableData.find(d => d.date === todayStr);
    const todayHR = todayEntry?.heart_rate_avg ?? 0;
    const todaySleep = todayEntry ? parseFloat((todayEntry.sleep_minutes / 60).toFixed(1)) : 0;

    // Weekly averages
    const hrAvg = average(last7.map(d => d.heart_rate_avg));

    // Chart data — wrapped in useMemo to avoid rebuilding on every render
    const hrChartData = useMemo(() => last7.map(d => ({
        value: d.heart_rate_avg,
        dataPointText: d.heart_rate_avg > 0 ? String(Math.round(d.heart_rate_avg)) : '',
        dataPointTextStyle: { color: '#ef4444', fontSize: 8 },
    })), [last7]);

    const sleepChartData = useMemo(() => last7.map(d => ({
        value: parseFloat((d.sleep_minutes / 60).toFixed(1)),
        frontColor: '#818cf8',
    })), [last7]);

    return (
        <View>
            {/* Section header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Health Vitals</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                    <RefreshCw size={15} color="#9ca3af" />
                </TouchableOpacity>
            </View>

            {/* SpO2 – placeholder (no data source yet) */}
            <View style={[styles.card, styles.placeholderCard]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBg, { backgroundColor: 'rgba(56,189,248,0.12)' }]}>
                        <Activity size={16} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardLabel}>SpO₂ (Blood Oxygen)</Text>
                        <Text style={styles.placeholderText}>
                            Connect a health device to track SpO₂
                        </Text>
                    </View>
                    {!hasAnyData && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic' }}>
                                Connect Apple Health / Health Connect in your OS settings and grant permissions to sync automatically.
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Heart Rate + Sleep: only show once device is connected */}
            {hasAnyData ? (
                <>
                    <VitalCard
                        icon={<Heart size={16} color="#ef4444" />}
                        iconColor="#ef4444"
                        iconBg="rgba(239,68,68,0.12)"
                        label="Heart Rate"
                        unit=" BPM"
                        current={Math.round(todayHR)}
                        weeklyAvg={hrAvg}
                        chartData={hrChartData}
                        chartType="line"
                    />

                    <VitalCard
                        icon={<Moon size={16} color="#818cf8" />}
                        iconColor="#818cf8"
                        iconBg="rgba(129,140,248,0.12)"
                        label="Sleep Duration"
                        unit="h"
                        current={todaySleep}
                        weeklyAvg={parseFloat((average(last7.map(d => d.sleep_minutes)) / 60).toFixed(1))}
                        chartData={sleepChartData}
                        chartType="bar"
                    />
                </>
            ) : (
                /* Placeholder when no wearable connected */
                <View style={[styles.card, styles.placeholderCard]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBg, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                            <Heart size={16} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardLabel}>Heart Rate &amp; Sleep</Text>
                            <Text style={styles.placeholderText}>
                                Connect a health device to track vitals
                            </Text>
                        </View>
                        <View style={{ marginTop: 12 }}>
                            <Text style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic' }}>
                                To track vitals automatically:
                                {"\n"}1. Download Health Connect (Android) or Apple Health (iOS)
                                {"\n"}2. Open the app and grant read permissions to Nutrient Tracker
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    refreshBtn: {
        padding: 6,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    placeholderCard: {
        borderStyle: 'dashed',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    currentValue: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    unit: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: 'normal',
        marginTop: 4,
    },
    avgBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    avgText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    noData: {
        paddingTop: 12,
        alignItems: 'center',
    },
    noDataText: {
        color: '#4b5563',
        fontSize: 12,
    },
    placeholderText: {
        fontSize: 12,
        color: '#6b7280',
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#bef264',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    connectBtnText: {
        color: '#1f2937',
        fontWeight: 'bold',
        fontSize: 12,
    },
});
