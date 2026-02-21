import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Modal, ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';

import { wearableService, DailyWearableData } from '../../services/WearableService';
import {
    DateFilter,
    DateRange,
    getDateRangeForFilter,
    aggregateDailyKcal,
    aggregateNutrients,
    NutrientTotals,
    RECOMMENDED_DAILY,
} from '../../utils/analyticsUtils';

// Chart & Section components
import KcalTrendChart from '../../components/KcalTrendChart';
import GoalDonutChart from '../../components/GoalDonutChart';
import RadarNutrientChart from '../../components/RadarNutrientChart';
import NutrientProgressBars from '../../components/NutrientProgressBars';
import HealthVitalsSection from '../../components/HealthVitalsSection';


const DATE_FILTERS: DateFilter[] = ['Today', '7 Days', '30 Days', 'Custom'];

export default function Analytics() {
    const { dailyLog, loading: foodLoading } = useFood();
    const { nutritionTargets, userProfile, loading: userLoading } = useUser();
    const router = useRouter();

    // ── State ──────────────────────────────────────────────────────────────────
    const [wearableData, setWearableData] = useState<DailyWearableData[]>([]);
    const [wearableLoading, setWearableLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<DateFilter>('7 Days');
    const [customRange, setCustomRange] = useState<DateRange | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarStart, setCalendarStart] = useState<string | null>(null);
    const [macroBarWidth, setMacroBarWidth] = useState(0);

    const onMacroBarLayout = useCallback((e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setMacroBarWidth(w);
    }, []);

    const isLoading = foodLoading || userLoading || wearableLoading;

    // ── Wearable Data ──────────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetchWearable = async () => {
                setWearableLoading(true);
                const data = await wearableService.getHistory(30);
                if (active) {
                    setWearableData(data);
                    setWearableLoading(false);
                }
            };
            fetchWearable();
            return () => { active = false; };
        }, [])
    );

    const handleRefreshWearable = useCallback(() => {
        setWearableLoading(true);
        wearableService.getHistory(30).then(d => {
            setWearableData(d);
            setWearableLoading(false);
        });
    }, []);

    // ── Date Range ─────────────────────────────────────────────────────────────
    const dateRange = useMemo<DateRange>(() => {
        if (selectedFilter === 'Custom' && customRange) return customRange;
        return getDateRangeForFilter(selectedFilter);
    }, [selectedFilter, customRange]);

    // ── Aggregated Data ────────────────────────────────────────────────────────
    const dailyKcalData = useMemo(
        () => aggregateDailyKcal(dailyLog, dateRange.start, dateRange.end),
        [dailyLog, dateRange]
    );

    const nutrientTotals = useMemo<NutrientTotals>(
        () => aggregateNutrients(dailyLog, dateRange.start, dateRange.end),
        [dailyLog, dateRange]
    );

    // Total kcal consumed in range
    const totalKcalConsumed = useMemo(
        () => dailyKcalData.reduce((s, d) => s + d.kcal, 0),
        [dailyKcalData]
    );

    // For donut: always use today's intake
    const todayStr = new Date().toISOString().split('T')[0];
    const todayKcal = useMemo(
        () => dailyLog
            .filter((item: any) => item.date === todayStr)
            .reduce((s: number, item: any) => s + (Number(item.calories) || 0), 0),
        [dailyLog, todayStr]
    );

    // Macro bar chart (existing, kept for quick overview)
    const macroBarData = useMemo(() => [
        {
            value: Math.round(nutrientTotals.protein),
            label: 'Protein',
            frontColor: '#eab308',
            topLabelComponent: () => (
                <Text style={{ color: '#eab308', fontSize: 9, marginBottom: 4 }}>
                    {Math.round(nutrientTotals.protein)}g
                </Text>
            ),
        },
        {
            value: Math.round(nutrientTotals.carbs),
            label: 'Carbs',
            frontColor: '#bef264',
            topLabelComponent: () => (
                <Text style={{ color: '#bef264', fontSize: 9, marginBottom: 4 }}>
                    {Math.round(nutrientTotals.carbs)}g
                </Text>
            ),
        },
        {
            value: Math.round(nutrientTotals.fat),
            label: 'Fat',
            frontColor: '#f97316',
            topLabelComponent: () => (
                <Text style={{ color: '#f97316', fontSize: 9, marginBottom: 4 }}>
                    {Math.round(nutrientTotals.fat)}g
                </Text>
            ),
        },
    ], [nutrientTotals]);

    // Per-nutrient user targets (override RDV for protein/carbs/fat from nutritionTargets)
    const userNutrientTargets = useMemo(() => ({
        ...RECOMMENDED_DAILY,
        protein: nutritionTargets.protein ?? RECOMMENDED_DAILY.protein,
        carbs: nutritionTargets.carbs ?? RECOMMENDED_DAILY.carbs,
        fat: nutritionTargets.fat ?? RECOMMENDED_DAILY.fat,
    }), [nutritionTargets]);

    // ── Calendar Handlers ──────────────────────────────────────────────────────
    const handleDayPress = useCallback((day: any) => {
        if (!calendarStart) {
            setCalendarStart(day.dateString);
        } else {
            const start = calendarStart < day.dateString ? calendarStart : day.dateString;
            const end = calendarStart < day.dateString ? day.dateString : calendarStart;
            setCustomRange({ start, end });
            setSelectedFilter('Custom');
            setCalendarStart(null);
            setShowCalendar(false);
        }
    }, [calendarStart]);

    // ── Loading ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#bef264" />
                <Text style={styles.loadingText}>Loading analytics…</Text>
            </View>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <Text style={styles.headerSubtitle}>REPORTS</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.iconBtn}>
                    <CalendarIcon size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Date Range Filter ──────────────────────────────────────── */}
                <View style={styles.filterRow}>
                    {DATE_FILTERS.map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
                            onPress={() => {
                                setSelectedFilter(f);
                                if (f !== 'Custom') setCustomRange(null);
                                else setShowCalendar(true);
                            }}
                        >
                            <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {customRange && selectedFilter === 'Custom' && (
                    <Text style={styles.customRangeLabel}>
                        {customRange.start}  →  {customRange.end}
                    </Text>
                )}

                {/* ── 1. Kcal Trend Line Chart ───────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Kcal Trend</Text>
                            <Text style={styles.cardSubtitle}>Daily intake vs goal</Text>
                        </View>
                    </View>
                    <KcalTrendChart
                        data={dailyKcalData}
                        goalKcal={nutritionTargets.calories ?? 2000}
                    />
                </View>

                {/* ── 2. Goal Completion Donut ───────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Today's Goal</Text>
                            <Text style={styles.cardSubtitle}>Calorie completion</Text>
                        </View>
                    </View>
                    <GoalDonutChart
                        consumed={todayKcal}
                        goal={nutritionTargets.calories ?? 2000}
                    />
                </View>

                {/* ── 3. Macro Bar Chart (quick summary) ────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Macros</Text>
                            <Text style={styles.cardSubtitle}>Total for selected range</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        {/* Stretch to fill card width, measure it, then size the chart exactly */}
                        <View style={{ alignSelf: 'stretch' }} onLayout={onMacroBarLayout}>
                            {macroBarWidth > 0 && (
                                <BarChart
                                    data={macroBarData}
                                    width={macroBarWidth - 60}
                                    height={180}
                                    maxValue={Math.ceil(Math.max(...macroBarData.map(b => b.value), 1) * 1.4 / 50) * 50}
                                    barWidth={Math.floor(macroBarWidth / 6)}
                                    spacing={Math.floor(macroBarWidth / 8)}
                                    noOfSections={4}
                                    barBorderRadius={6}
                                    yAxisThickness={0}
                                    xAxisThickness={0}
                                    hideRules
                                    yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                                    xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 12 }}
                                    isAnimated
                                />
                            )}
                        </View>
                    </View>
                </View>

                {/* ── 4. Nutrient Progress Bars ──────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Nutrient Breakdown</Text>
                            <Text style={styles.cardSubtitle}>vs recommended daily intake</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 12 }}>
                        <NutrientProgressBars
                            actual={nutrientTotals}
                            recommended={userNutrientTargets}
                        />
                    </View>
                </View>

                {/* ── 5. Radar Chart ─────────────────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Nutrient Radar</Text>
                            <Text style={styles.cardSubtitle}>Actual vs recommended by category</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 8 }}>
                        <RadarNutrientChart
                            actual={nutrientTotals}
                            recommended={userNutrientTargets}
                            size={300}
                        />
                    </View>
                </View>

                {/* ── 6. Health Vitals ───────────────────────────────────────── */}
                <HealthVitalsSection
                    wearableData={wearableData}
                    onRefresh={handleRefreshWearable}
                />

            </ScrollView>

            {/* ── Calendar Modal ─────────────────────────────────────────────── */}
            <Modal visible={showCalendar} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.calendarHint}>
                            {calendarStart ? 'Tap end date' : 'Tap start date'}
                        </Text>
                        <Calendar
                            onDayPress={handleDayPress}
                            markedDates={
                                calendarStart
                                    ? { [calendarStart]: { startingDay: true, color: '#bef264', textColor: '#1f2937' } }
                                    : {}
                            }
                            markingType="period"
                            theme={{
                                calendarBackground: '#1f2937',
                                textSectionTitleColor: '#9ca3af',
                                dayTextColor: '#fff',
                                todayTextColor: '#bef264',
                                selectedDayBackgroundColor: '#bef264',
                                selectedDayTextColor: '#1f2937',
                                arrowColor: '#bef264',
                                monthTextColor: '#fff',
                                dotColor: '#bef264',
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => { setShowCalendar(false); setCalendarStart(null); }}
                            style={styles.closeBtn}
                        >
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        marginTop: 12,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        letterSpacing: 1,
        marginTop: 2,
    },
    content: {
        padding: 20,
        paddingBottom: 48,
    },
    // ── Filter Bar ──────────────────────────────────────────────────────────
    filterRow: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        borderRadius: 20,
    },
    filterBtnActive: {
        backgroundColor: '#bef264',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9ca3af',
    },
    filterTextActive: {
        color: '#1f2937',
        fontWeight: 'bold',
    },
    customRangeLabel: {
        color: '#6b7280',
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 16,
    },
    // ── Cards ───────────────────────────────────────────────────────────────
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    // ── Modal ───────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#374151',
    },
    calendarHint: {
        color: '#9ca3af',
        textAlign: 'center',
        fontSize: 13,
        marginBottom: 12,
    },
    closeBtn: {
        marginTop: 16,
        paddingVertical: 12,
        backgroundColor: '#374151',
        borderRadius: 20,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
