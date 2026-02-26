import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { useChallenges } from '../../context/ChallengesContext';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import {
  Flame, Utensils, Droplet, Plus, Minus,
  Circle, Zap
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-gifted-charts';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { getTodayISODate } from '../../utils/DateUtils';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const { dailyLog, getDailySummary, getMTDSummary, loading: foodLoading } = useFood();
  const { userProfile, nutritionTargets, waterIntake, streak, updateWaterIntake, workoutSchedule, fetchLeaderboard, fetchDailyStats, loading: userLoading, todayStr } = useUser();
  const { verifyChallenges } = useChallenges();
  const posthog = usePostHog();

  const isDataLoading = foodLoading || userLoading;

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [mtdSummary, setMtdSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayLog, setTodayLog] = useState<any[]>([]);
  const [ranking, setRanking] = useState<number | string | null>(null);

  const router = useRouter();

  // Update selectedDate if global todayStr changes (e.g. at midnight)
  useEffect(() => {
    setSelectedDate(todayStr);
  }, [todayStr]);

  // Generate last 5 days for date selector
  const days = useMemo(() => {
    const dates = [];
    const baseDate = new Date(todayStr);
    for (let i = 4; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  }, [todayStr]);

  const pieData = useMemo(() => {
    return [
      { value: summary.protein || 0.1, color: '#bef264', text: 'Protein' },
      { value: summary.carbs || 0.1, color: '#a3e635', text: 'Carbs' },
      { value: summary.fat || 0.1, color: '#65a30d', text: 'Fats' },
    ];
  }, [summary]);

  // Calculate Burned Calories from actual completed exercises for selected date
  const { burnedCalories, plannedBurn } = useMemo(() => {
    if (!workoutSchedule) return { burnedCalories: 0, plannedBurn: 0 };
    const dayPlan = workoutSchedule.find((d: any) => d.date === selectedDate);
    if (!dayPlan) return { burnedCalories: 0, plannedBurn: 0 };
    const allExercises = [...(dayPlan.gym?.exercises || []), ...(dayPlan.home?.exercises || [])];
    const burned = allExercises
      .filter((ex: any) => ex.is_completed === 'true')
      .reduce((sum: number, ex: any) => sum + (ex.actual_calories_burned || ex.predicted_calories_burn || 0), 0);
    const planned = dayPlan.target_calories ||
      Math.max(dayPlan.gym?.total_calories || 0, dayPlan.home?.total_calories || 0) || 1;
    return { burnedCalories: Math.round(burned * 10) / 10, plannedBurn: planned };
  }, [workoutSchedule, selectedDate]);

  const updateDashboard = () => {
    setSummary(getDailySummary(selectedDate));
    setMtdSummary(getMTDSummary());
    setTodayLog(dailyLog.filter((item: any) => item.date === selectedDate).reverse());
  };

  // Helper to get calories for any specific date
  const getCaloriesForDate = (date: string) => {
    const logs = dailyLog.filter((item: any) => item.date === date);
    return logs.reduce((acc: number, item: any) => acc + (Number(item.calories) || 0), 0);
  };

  const fetchRanking = async () => {
    if (!ranking && userProfile?.state) {
      try {
        const result = await fetchLeaderboard('state', userProfile.state);
        if (result && result.currentUserEntry) {
          setRanking(result.currentUserEntry.rank);
        } else {
          setRanking('-');
        }
      } catch (e) {
        console.log("Error fetching dashboard rank", e);
      }
    }
  }

  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userProfile?.id) {
      await fetchDailyStats?.(userProfile.id, selectedDate);
    }
    updateDashboard();
    setRefreshing(false);
  }, [userProfile, selectedDate]);

  useEffect(() => {
    if (isFocused) {
      updateDashboard();
      if (userProfile?.id && fetchDailyStats) {
        fetchDailyStats(userProfile.id, selectedDate);
      }
    }
  }, [isFocused, dailyLog, selectedDate, workoutSchedule, userProfile, todayStr]);

  useEffect(() => {
    fetchRanking();
  }, [userProfile]);

  // Calculate progress
  const calProgress = summary.calories / (nutritionTargets.calories || 2000);
  const isToday = selectedDate === todayStr;

  // Loading guard — placed AFTER all hooks
  if (isDataLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#bef264" />
        <Text style={{ color: '#888', marginTop: 10 }}>Loading your stats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#bef264" />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userProfile?.full_name?.split(' ')[0] || 'Fitness Fan'}</Text>
            <Text style={styles.dateText}>Ready for today's goals?</Text>
          </View>
          <View style={styles.xpBadge}>
            <Zap size={14} color="#bef264" fill="#bef264" />
            <Text style={styles.xpBadgeText}>{userProfile?.workout_xp || 0} XP</Text>
          </View>
        </View>

        {/* Compact Highlight Cards */}
        <View style={styles.highlightsRow}>
          {/* Streak Card */}
          <LinearGradient colors={['#bef264', '#a3e635']} style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <View style={styles.fireIconBg}>
                <Flame size={14} color="#ea580c" fill="#ea580c" />
              </View>
              <View>
                <Text style={styles.streakLabel}>Streak</Text>
                <Text style={styles.streakValue}>{streak} <Text style={styles.streakUnit}>Days</Text></Text>
              </View>
            </View>
          </LinearGradient>

          {/* Ranking Card */}
          <View style={styles.rankCard}>
            <View style={styles.streakHeader}>
              <View style={styles.rankIconBg}>
                <Zap size={14} color="#ca8a04" fill="#ca8a04" />
              </View>
              <View>
                <Text style={[styles.streakLabel, { color: '#FFF' }]}>State Rank</Text>
                <Text style={[styles.streakValue, { color: '#FFF' }]}>#{ranking || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Side-by-Side Stats Section */}
        <View style={styles.sideBySideRow}>
          {/* Calories Card */}
          <View style={styles.halfStatCard}>
            <View style={styles.cardHeaderSmall}>
              <Text style={styles.cardTitleSmall}>Calories</Text>
              <View style={[styles.iconBgSmall, { backgroundColor: 'rgba(190, 242, 100, 0.1)' }]}>
                <Utensils size={14} color="#bef264" />
              </View>
            </View>

            <View style={styles.miniProgressSection}>
              <View style={styles.miniStatRow}>
                <Text style={styles.miniLabel}>Burned</Text>
                <Text style={styles.miniValue}>{burnedCalories} <Text style={styles.miniUnit}>kcal</Text></Text>
              </View>
              <AnimatedProgressBar progress={Math.min(burnedCalories / Math.max(plannedBurn, 1), 1)} color="#f97316" backgroundColor="#333" />

              <View style={[styles.miniStatRow, { marginTop: 15 }]}>
                <Text style={styles.miniLabel}>Intake</Text>
                <Text style={[styles.miniValue, calProgress > 1 && { color: '#ef4444' }]}>
                  {Math.round(summary.calories)}<Text style={styles.miniUnit}> / {nutritionTargets.calories || 2000} kcal</Text>
                </Text>
              </View>
              <AnimatedProgressBar progress={Math.min(calProgress, 1)} color={calProgress > 1 ? '#ef4444' : '#bef264'} backgroundColor="#333" />
            </View>
          </View>

          {/* Nutrients MTD Card */}
          <View style={styles.halfStatCard}>
            <View style={styles.cardHeaderSmall}>
              <View>
                <Text style={styles.cardTitleSmall}>Nutrients</Text>
                <Text style={styles.cardSubtitleSmall}>Distribution</Text>
              </View>
              <View style={[styles.iconBgSmall, { backgroundColor: 'rgba(190, 242, 100, 0.1)' }]}>
                <Circle size={14} color="#bef264" />
              </View>
            </View>

            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                radius={35}
                innerRadius={0}
                isAnimated
                animationDuration={800}
              />
              <View style={[styles.legendContainer, { marginLeft: 14 }]}>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#bef264' }]} /><Text style={styles.legendText}>Pro - {Math.round(summary.protein)}g</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#a3e635' }]} /><Text style={styles.legendText}>Carb - {Math.round(summary.carbs)}g</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#65a30d' }]} /><Text style={styles.legendText}>Fat - {Math.round(summary.fat)}g</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Water Intake Card (Full Width) */}
        <View style={[styles.fullStatCard, { backgroundColor: '#1E1E1E', marginTop: 10, marginBottom: 25, paddingVertical: 16, borderColor: '#333', borderWidth: 1 }]}>
          <View style={styles.statHeader}>
            <View>
              <Text style={[styles.statTitle, { color: '#3b82f6' }]}>Drink Water</Text>
              <Text style={styles.statSubtitle}>Today's goal: 3.5 L</Text>
            </View>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Droplet size={18} color="#3b82f6" fill="#3b82f6" />
            </View>
          </View>

          <View style={[styles.waterMainRow, { marginTop: 12 }]}>
            <View>
              <Text style={[styles.waterMainValue, { fontSize: 28 }]}>{waterIntake.toFixed(2)} <Text style={styles.waterMainUnit}>L</Text></Text>
              <Text style={[styles.waterSubText, { fontSize: 14 }]}>{Math.round(waterIntake / 0.25)} glasses</Text>
            </View>
            {isToday && (
              <View style={styles.waterControlsRedesign}>
                <TouchableOpacity
                  style={[styles.waterBtnWhite, { width: 48, height: 48, backgroundColor: '#333' }]}
                  onPress={() => {
                    const newValue = Math.max(0, waterIntake - 0.25);
                    updateWaterIntake(newValue, selectedDate);
                    posthog.capture('water_intake_updated', {
                      new_value_liters: newValue,
                      action: 'decrease',
                      glasses: Math.round(newValue / 0.25),
                    });
                  }}
                >
                  <Minus size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.waterBtnBlue, { width: 48, height: 48 }]}
                  onPress={() => {
                    const newValue = waterIntake + 0.25;
                    updateWaterIntake(newValue, selectedDate);
                    posthog.capture('water_intake_updated', {
                      new_value_liters: newValue,
                      action: 'increase',
                      glasses: Math.round(newValue / 0.25),
                    });
                  }}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Date Selector (Moved Above Meals) */}
        <View style={styles.dateSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {days.map((date) => {
              const d = new Date(date);
              const dayNum = d.getDate();
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const month = d.toLocaleDateString('en-US', { month: 'short' });
              const isSelected = date === selectedDate;
              const isTodayDate = date === todayStr;
              const cals = Math.round(getCaloriesForDate(date));

              return (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateChip,
                    isSelected && styles.dateChipSelected,
                    isTodayDate && !isSelected && styles.dateChipToday
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>{dayName}</Text>
                  <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>{month} {dayNum}</Text>

                  <View style={[styles.dateCalsBadge, isSelected && { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                    <Text style={[styles.dateCalsText, isSelected && styles.dateTextSelected]}>{cals}</Text>
                  </View>

                  {isTodayDate && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Meals Section Title */}
        <Text style={styles.sectionTitle}>Meals</Text>

        {/* Meals Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealsScroll}>
          {
            ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
              const mealLower = meal.toLowerCase();
              const logs = todayLog.filter(item => (item.meal_type || 'snack').toLowerCase() === mealLower);
              const consumed = logs.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

              const target = Math.round((nutritionTargets.calories || 2000) * (nutritionTargets.mealSplit?.[mealLower] || 0.25));
              const isOver = consumed > target;
              const percentage = Math.min(consumed / target, 1);
              // const percentageText = Math.round((consumed / target) * 100) || 0;

              return (
                <View key={meal} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{meal}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isToday && (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => router.push({ pathname: '/(tabs)/add', params: { mealType: mealLower } })}
                        >
                          <Plus size={16} color="#000" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.mealCalsContainer}>
                    <Text style={[styles.mealCalsTextBold, isOver && { color: '#ef4444' }]}>
                      {Math.round(consumed)} <Text style={styles.mealCalsText}>kcal</Text>
                    </Text>
                  </View>

                  <AnimatedProgressBar progress={percentage} color={isOver ? '#ef4444' : '#bef264'} height={4} backgroundColor="#333" />

                  {/* List items briefly */}
                  <View style={{ marginTop: 10 }}>
                    {logs.map((log: any, idx: number) => (
                      <Text key={idx} numberOfLines={1} style={{ color: '#888', fontSize: 10 }}>• {log.food_name}</Text>
                    ))}
                    {logs.length === 0 && <Text style={{ color: '#444', fontSize: 10, fontStyle: 'italic' }}>No food logged</Text>}
                  </View>
                </View>
              );
            })
          }
        </ScrollView>

      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  xpBadgeText: {
    color: '#bef264',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateSelectorContainer: {
    marginBottom: 24,
  },
  dateChip: {
    backgroundColor: '#1E1E1E',
    width: 80,
    height: 90,
    borderRadius: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 12,
  },
  dateChipSelected: {
    backgroundColor: '#bef264',
    borderColor: '#bef264',
  },
  dateChipToday: {
    borderColor: '#bef264',
    borderWidth: 1,
  },
  dateDayName: {
    fontSize: 12,
    color: '#888',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  dateDayNum: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  dateTextSelected: {
    color: '#000',
  },
  dateCalsBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  dateCalsText: {
    color: '#BBB',
    fontSize: 10,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#bef264',
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  streakCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
  },
  rankCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    opacity: 0.8,
  },
  fireIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  streakUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#374151',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  halfStatCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 180,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardTitleSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardSubtitleSmall: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  iconBgSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProgressSection: {
    marginTop: 5,
  },
  miniStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniLabel: {
    fontSize: 12,
    color: '#888',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  miniUnit: {
    fontSize: 9,
    color: '#888',
  },
  miniProgressBarWrapper: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  legendContainer: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
  },
  fullStatCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 20,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    opacity: 0.7,
    marginTop: 2,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  waterMainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  waterMainUnit: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  waterSubText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 2,
  },
  waterControlsRedesign: {
    flexDirection: 'row',
    gap: 12,
  },
  waterBtnWhite: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterBtnBlue: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 20,
    marginBottom: 10,
  },
  mealsScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 20,
    marginRight: 10,
    width: 160,
    borderWidth: 1,
    borderColor: '#333',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#bef264',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealCalsTextBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  mealCalsText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#888',
  },
  mealProgressBarBg: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  mealProgressBarFill: {
    height: '100%',
    backgroundColor: '#bef264',
    borderRadius: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
});
