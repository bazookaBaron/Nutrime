import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { ChevronLeft, Calendar as CalendarIcon, MoreHorizontal, Check, Droplet } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';

export default function Analytics() {
    const { dailyLog } = useFood();
    const { nutritionTargets, userProfile } = useUser();
    const router = useRouter();
    const screenWidth = Dimensions.get('window').width;

    const [selectedRange, setSelectedRange] = useState('Weekly');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);

    // Helper to get date range based on selection
    const getDateRange = useMemo(() => {
        if (customDateRange) return customDateRange;

        const end = new Date();
        const start = new Date();

        if (selectedRange === 'Daily') {
            // Just today
        } else if (selectedRange === 'Weekly') {
            start.setDate(end.getDate() - 6);
        } else if (selectedRange === 'Monthly') {
            start.setDate(end.getDate() - 29);
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }, [selectedRange, customDateRange]);

    // Aggregate Data for Bar Chart (Calories)
    const barData = useMemo(() => {
        const data = [];
        const endDate = new Date(getDateRange.end);
        const startDate = new Date(getDateRange.start);

        // Create map of aggregated logs
        const logsByDate = dailyLog.reduce((acc, item) => {
            const date = item.date;
            if (!acc[date]) acc[date] = 0;
            acc[date] += (Number(item.calories) || 0);
            return acc;
        }, {} as Record<string, number>);

        // Iterate through date range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const value = logsByDate[dateStr] || 0;

            data.push({
                value: value,
                label: dayName,
                frontColor: '#bef264',
                spacing: 14,
                labelTextStyle: { color: '#9ca3af', fontSize: 10 },
            });
            // Burnt placeholder (mock data mostly constant or random for now)
            data.push({
                value: 2000,
                frontColor: '#1f2937',
            });
        }
        return data;
    }, [dailyLog, getDateRange]);


    // Aggregate Data for Pie Chart (Macros)
    const pieData = useMemo(() => {
        const rangeLogs = dailyLog.filter((item: any) =>
            item.date >= getDateRange.start && item.date <= getDateRange.end
        );

        const macros = rangeLogs.reduce((acc: any, item: any) => {
            acc.protein += Number(item.protein) || 0;
            acc.carbs += Number(item.carbs) || 0;
            acc.fat += Number(item.fat) || 0;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        const total = macros.protein + macros.carbs + macros.fat;

        if (total === 0) return [
            { value: 1, color: '#f3f4f6' } // Empty state
        ];

        return [
            { value: macros.fat, color: '#1f2937', focused: true },
            { value: macros.carbs, color: '#bef264' },
            { value: macros.protein, color: '#e5e7eb' },
        ];
    }, [dailyLog, getDateRange]);

    // Monthly Goal Calculation (Calories)
    const monthlyGoalData = useMemo(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const monthlyLogs = dailyLog.filter((item: any) => item.date >= firstDayOfMonth && item.date <= lastDayOfMonth);
        const totalConsumed = monthlyLogs.reduce((sum: number, item: any) => sum + (Number(item.calories) || 0), 0);

        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dailyTarget = nutritionTargets.calories || 2000;
        const monthlyTarget = dailyTarget * daysInMonth;

        const percentage = Math.min(Math.round((totalConsumed / monthlyTarget) * 100), 100);

        return [
            { value: percentage, color: '#bef264' },
            { value: 100 - percentage, color: '#f3f4f6' }
        ];
    }, [dailyLog, nutritionTargets]);

    // Nutrient Trends (Sparklines Logic)
    const nutrientTrends = useMemo(() => {
        const nutrients = [
            { key: 'protein', name: 'Protein', unit: 'g', color: '#84cc16', bgColor: '#ecfccb', iconColor: '#84cc16' },
            { key: 'magnesium', name: 'Magnesium', unit: 'mg', color: '#2563eb', bgColor: '#dbeafe', iconColor: '#2563eb' }, // Assuming these fields exist or mapping simplified
            { key: 'vitC', name: 'Vit C', unit: 'mg', color: '#ea580c', bgColor: '#ffedd5', iconColor: '#ea580c' },
        ];

        // For simple sparkline, let's just take last 7 days aggregation
        // Note: Real implementation needs mapping from food DB nutrient IDs if they aren't top-level columns
        // Assuming top level for simplicity based on context, or using defaults

        return nutrients.map(nut => {
            const values = [10, 12, 15, 14, 20, 18, 22]; // Mock data for sparkline visual as we don't have detailed nutrient breakdown in `food_logs` top level columns except macros
            // In a real app complexity, we'd query relation to food_nutrients or JSON data

            // Check if we can get at least protein from logs
            if (nut.key === 'protein') {
                // Calculate average or sum
                const total = dailyLog.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);
                return { ...nut, value: Math.round(total), data: values }; // Using mock values for graph shape
            }

            return { ...nut, value: 0, data: values }; // Mock
        });
    }, [dailyLog]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <Text style={styles.headerSubtitle}>REPORTS</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.iconBtn}>
                    <CalendarIcon size={20} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Segmented Control */}
                <View style={styles.segmentContainer}>
                    {['Daily', 'Weekly', 'Monthly'].map((range) => (
                        <TouchableOpacity
                            key={range}
                            style={[styles.segmentBtn, selectedRange === range && styles.segmentBtnActive]}
                            onPress={() => {
                                setSelectedRange(range);
                                setCustomDateRange(null);
                            }}
                        >
                            <Text style={[styles.segmentText, selectedRange === range && styles.segmentTextActive]}>{range}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Calories Chart */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Calories</Text>
                            <Text style={styles.cardSubtitle}>Intake vs. Burnt</Text>
                        </View>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#bef264' }]} /><Text style={styles.legendText}>Intake</Text></View>
                            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#1f2937' }]} /><Text style={styles.legendText}>Burnt</Text></View>
                        </View>
                    </View>

                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        <BarChart
                            data={barData}
                            width={screenWidth - 80}
                            height={180}
                            barWidth={8}
                            spacing={10}
                            noOfSections={4}
                            barBorderRadius={4}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            hideRules
                            yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                            scrollAnimation={true}
                            isAnimated
                        />
                    </View>
                </View>

                {/* Distributions & Monthly Goal Row */}
                <View style={styles.row}>
                    {/* Distribution */}
                    <View style={[styles.card, styles.halfCard]}>
                        <Text style={styles.cardTitle}>Distribution</Text>
                        <View style={{ alignItems: 'center', marginVertical: 15 }}>
                            <PieChart
                                data={pieData}
                                donut
                                radius={45}
                                innerRadius={35}
                                centerLabelComponent={() => (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>{selectedRange}</Text>
                                    </View>
                                )}
                            />
                        </View>
                        <View style={styles.legendRow}>
                            <View style={styles.legendCol}>
                                <View style={[styles.dot, { backgroundColor: '#bef264' }]} />
                                <Text style={styles.legendTextSmall}>Carbs</Text>
                            </View>
                            <View style={styles.legendCol}>
                                <View style={[styles.dot, { backgroundColor: '#1f2937' }]} />
                                <Text style={styles.legendTextSmall}>Fat</Text>
                            </View>
                            <View style={styles.legendCol}>
                                <View style={[styles.dot, { backgroundColor: '#e5e7eb' }]} />
                                <Text style={styles.legendTextSmall}>Pro</Text>
                            </View>
                        </View>
                    </View>

                    {/* Monthly Goal */}
                    <View style={[styles.card, styles.halfCard]}>
                        <Text style={styles.cardTitle}>Monthly Goal</Text>
                        <View style={{ alignItems: 'center', marginVertical: 15 }}>
                            <PieChart
                                data={monthlyGoalData}
                                donut
                                radius={45}
                                innerRadius={35}
                                centerLabelComponent={() => (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937' }}>{monthlyGoalData[0].value}%</Text>
                                    </View>
                                )}
                            />
                        </View>
                        <Text style={styles.monthlyGoalText}>You're on track to meet your monthly goal.</Text>
                    </View>
                </View>

                {/* Nutrient Trends Header */}
                <Text style={styles.sectionTitle}>Nutrient Trends</Text>

                {/* Nutrient Cards */}
                {nutrientTrends.map((nut, index) => (
                    <View key={index} style={styles.nutrientCard}>
                        <View style={[styles.nutrientIconBg, { backgroundColor: nut.bgColor }]}>
                            {nut.key === 'magnesium' ?
                                <Droplet size={12} color={nut.iconColor} fill={nut.iconColor} /> :
                                <View style={[styles.nutrientDot, { backgroundColor: nut.iconColor }]} />
                            }
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.nutrientTitle}>{nut.name}</Text>
                            <Text style={styles.nutrientValue}>{nut.value}<Text style={styles.nutrientUnit}>{nut.unit}</Text></Text>
                        </View>
                        {/* Sparkline placeholder - implementing real line chart here would be overkill for now, keeping generic bar for visual match */}
                        <View style={{ width: 100, height: 30, justifyContent: 'center' }}>
                            <View style={{ height: 4, backgroundColor: nut.bgColor, borderRadius: 2, width: '100%' }}>
                                <View style={{ height: 4, backgroundColor: nut.iconColor, borderRadius: 2, width: '60%' }} />
                            </View>
                        </View>
                    </View>
                ))}

            </ScrollView>

            {/* Calendar Modal */}
            <Modal visible={showCalendar} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Calendar
                            onDayPress={day => {
                                setCustomDateRange({ start: day.dateString, end: day.dateString });
                                setShowCalendar(false);
                            }}
                        />
                        <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>Close</Text>
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
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#f9fafb',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
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
        paddingBottom: 40,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 24,
        padding: 4,
        marginBottom: 24,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    segmentBtnActive: {
        backgroundColor: '#bef264',
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4b5563',
    },
    segmentTextActive: {
        color: '#1f2937',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
        color: '#1f2937',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    legendContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        color: '#1f2937',
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    halfCard: {
        flex: 1,
        marginBottom: 0,
        padding: 16,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    legendCol: {
        alignItems: 'center',
        gap: 4,
    },
    legendTextSmall: {
        fontSize: 10,
        color: '#6b7280',
    },
    monthlyGoalText: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        marginTop: 8,
    },
    nutrientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
    },
    nutrientIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nutrientDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
    nutrientTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    nutrientValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    nutrientUnit: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: 'normal',
        marginLeft: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    closeBtn: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    closeBtnText: {
        color: '#1f2937',
        fontWeight: 'bold',
    },
});
