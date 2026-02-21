import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { DailyWearableData } from '../services/WearableService';
import { Footprints, Heart, Moon, RefreshCw, AlertCircle, Smartphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

interface WearableInsightsProps {
    data: DailyWearableData[];
    onRefresh: () => void;
}

export default function WearableInsights({ data, onRefresh }: WearableInsightsProps) {
    const router = useRouter();
    const hasData = data && data.length > 0;

    const stepsData = useMemo(() => {
        if (!hasData) return [];
        return data.map(d => ({
            value: d.steps,
            label: new Date(d.date).getDate().toString(),
            labelTextStyle: { color: '#9ca3af', fontSize: 10 },
            frontColor: '#bef264',
        }));
    }, [data, hasData]);

    const heartRateData = useMemo(() => {
        // Filter out days with 0 heart rate
        const valid = data.filter(d => d.heart_rate_avg > 0);
        return valid.map(d => ({
            value: d.heart_rate_avg,
            dataPointText: Math.round(d.heart_rate_avg).toString(),
            label: new Date(d.date).getDate().toString(),
            labelTextStyle: { color: '#9ca3af', fontSize: 10 },
        }));
    }, [data]);

    const sleepData = useMemo(() => {
        // Filter out days with 0 sleep
        const valid = data.filter(d => d.sleep_minutes > 0);
        return valid.map(d => ({
            value: parseFloat((d.sleep_minutes / 60).toFixed(1)),
            label: new Date(d.date).getDate().toString(),
            frontColor: '#818cf8',
        }));
    }, [data]);

    // 4. Anomaly Detection (Simple)
    const anomalies = useMemo(() => {
        if (!hasData || data.length < 3) return null;

        const lastDay = data[data.length - 1];
        const previousDays = data.slice(0, data.length - 1);

        // Calculate averages
        const avgSteps = previousDays.reduce((sum, d) => sum + d.steps, 0) / previousDays.length;
        const avgSleep = previousDays.reduce((sum, d) => sum + d.sleep_minutes, 0) / previousDays.length;

        const alerts = [];

        // Check for 50% drop
        if (lastDay.steps < avgSteps * 0.5 && avgSteps > 1000) {
            alerts.push({
                type: 'steps',
                message: `Your steps yesterday were 50% lower than your average (${Math.round(avgSteps)}).`,
                icon: Footprints,
                color: '#bef264'
            });
        }

        if (lastDay.sleep_minutes < avgSleep * 0.7 && avgSleep > 300) { // 5 hours
            alerts.push({
                type: 'sleep',
                message: `You slept significantly less than your average (${(avgSleep / 60).toFixed(1)}h).`,
                icon: Moon,
                color: '#818cf8'
            });
        }

        return alerts.length > 0 ? alerts : null;
    }, [data, hasData]);


    if (!hasData) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.sectionTitle}>WEARABLE INSIGHTS</Text>
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
                        <RefreshCw size={16} color="#9ca3af" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyCard}>
                    <Smartphone size={40} color="#4b5563" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>No Data Available</Text>
                    <Text style={styles.emptyText}>Connect a device or health app to see your activity, sleep, and heart rate insights.</Text>

                    <TouchableOpacity style={styles.connectButton} onPress={() => router.push('/(tabs)/profile')}>
                        <Text style={styles.connectButtonText}>Connect Device</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>WEARABLE INSIGHTS</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
                    <RefreshCw size={16} color="#9ca3af" />
                </TouchableOpacity>
            </View>

            {/* Anomaly Alerts */}
            {/* Anomaly Alerts */}
            {anomalies && anomalies.length > 0 && anomalies.map((alert, idx) => (
                <View key={idx} style={[styles.alertCard, { borderColor: alert.color }]}>
                    <View style={[styles.iconContainer, { backgroundColor: alert.color + '20' }]}>
                        <AlertCircle size={16} color={alert.color} />
                    </View>
                    <Text style={styles.alertText}>{alert.message}</Text>
                </View>
            ))}

            {/* Steps Chart */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(190, 242, 100, 0.1)' }]}>
                        <Footprints size={16} color="#bef264" />
                    </View>
                    <Text style={styles.cardTitle}>Steps (Last 30 Days)</Text>
                </View>
                <BarChart
                    data={stepsData}
                    width={screenWidth - 80}
                    height={150}
                    barWidth={6}
                    spacing={6}
                    barBorderRadius={4}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    hideRules
                    yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                    noOfSections={3}
                />
            </View>

            {/* Heart Rate Chart */}
            {heartRateData.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Heart size={16} color="#ef4444" />
                        </View>
                        <Text style={styles.cardTitle}>Avg Heart Rate</Text>
                    </View>
                    <LineChart
                        data={heartRateData}
                        width={screenWidth - 80}
                        height={150}
                        thickness={2}
                        color="#ef4444"
                        startFillColor="rgba(239, 68, 68, 0.2)"
                        endFillColor="rgba(239, 68, 68, 0.01)"
                        startOpacity={0.9}
                        endOpacity={0.2}
                        areaChart
                        yAxisThickness={0}
                        xAxisThickness={0}
                        hideRules
                        hideDataPoints={false}
                        dataPointsColor="#ef4444"
                        yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                        noOfSections={3}
                    />
                </View>
            )}

            {/* Sleep Chart */}
            {sleepData.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(129, 140, 248, 0.1)' }]}>
                            <Moon size={16} color="#818cf8" />
                        </View>
                        <Text style={styles.cardTitle}>Sleep Hours</Text>
                    </View>
                    <BarChart
                        data={sleepData}
                        width={screenWidth - 80}
                        height={150}
                        barWidth={6}
                        spacing={6}
                        barBorderRadius={4}
                        yAxisThickness={0}
                        xAxisThickness={0}
                        hideRules
                        yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                        noOfSections={3}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    refreshIcon: {
        padding: 4,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#374151',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    emptyCard: {
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 24,
        lineHeight: 20,
    },
    connectButton: {
        backgroundColor: '#bef264',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    connectButtonText: {
        color: '#1f2937',
        fontWeight: 'bold',
        fontSize: 14,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    alertText: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        marginLeft: 10,
    },
    // Keep potentially unused styles if needed or remove
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
});
