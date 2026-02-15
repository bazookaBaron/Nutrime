import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Home, PlusCircle, BarChart2, Search, Bell, Droplet, Plus, Minus, Flame, Circle, User, Settings, LogOut,
  ChevronRight, Trophy, Target, Calendar, Utensils, Info, Info as AlertTriangle, AlertTriangle as AlertIcon
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-gifted-charts';

export default function Dashboard() {
  const { dailyLog, getDailySummary, getMTDSummary, removeFoodFromLog } = useFood();
  const { userProfile, nutritionTargets, waterIntake, streak, updateWaterIntake } = useUser();
  const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [mtdSummary, setMtdSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayLog, setTodayLog] = useState([]);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    updateDashboard();
  }, [dailyLog]);

  const updateDashboard = () => {
    setSummary(getDailySummary(selectedDate));
    setMtdSummary(getMTDSummary());
    setTodayLog(dailyLog.filter(item => item.date === selectedDate).reverse());
  };

  const getMealLogs = (mealType) => {
    // This is a simplification. Ideally, we would store meal type in the log.
    // For now, we will just list all items under "Today's Food" 
    // BUT since the user wants specific sections, let's assume we implement meal type selection later.
    // For this redesign, I'll group them by time or just show all in a generic list for now to match UI layout.
    return todayLog;
  };

  // Calculate progress
  const calProgress = summary.calories / (nutritionTargets.calories || 2000);
  const remainingCals = Math.max(0, nutritionTargets.calories - summary.calories);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning!</Text>
            <Text style={styles.userName}>{userProfile?.full_name || userProfile?.username || 'User'}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Calendar size={20} color="#1f2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.notificationDot} />
              <BarChart2 size={20} color="#1f2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Highlight Cards */}
        <View style={styles.highlightsRow}>
          {/* Streak Card */}
          <LinearGradient colors={['#bef264', '#a3e635']} style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakLabel}>Streak</Text>
              <View style={styles.fireIconBg}>
                <Flame size={16} color="#ea580c" fill="#ea580c" />
              </View>
            </View>
            <Text style={styles.streakValue}>{streak} <Text style={styles.streakUnit}>Days</Text></Text>
            <Text style={styles.streakSub}>Keep it up!</Text>
          </LinearGradient>

          {/* Ranking Card */}
          <View style={styles.rankCard}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakLabel}>Ranking</Text>
              <View style={styles.rankIconBg}>
                <BarChart2 size={16} color="#ca8a04" />
              </View>
            </View>
            <Text style={styles.streakValue}>#12</Text>
            <Text style={styles.streakSub}>in your city</Text>
          </View>
        </View>

        {/* Side-by-Side Stats Section */}
        <View style={styles.sideBySideRow}>
          {/* Calories Card */}
          <View style={styles.halfStatCard}>
            <View style={styles.cardHeaderSmall}>
              <Text style={styles.cardTitleSmall}>Calories</Text>
              <View style={[styles.iconBgSmall, { backgroundColor: '#f0fdf4' }]}>
                <Utensils size={14} color="#bef264" />
              </View>
            </View>

            <View style={styles.miniProgressSection}>
              <View style={styles.miniStatRow}>
                <Text style={styles.miniLabel}>Burned</Text>
                <Text style={styles.miniValue}>850 <Text style={styles.miniUnit}>kcal</Text></Text>
              </View>
              <View style={styles.miniProgressBarWrapper}>
                <View style={[styles.miniProgressBarFill, { width: '45%', backgroundColor: '#bef264', opacity: 0.6 }]} />
              </View>

              <View style={[styles.miniStatRow, { marginTop: 15 }]}>
                <Text style={styles.miniLabel}>Intake</Text>
                <Text style={styles.miniValue}>{Math.round(summary.calories)} <Text style={styles.miniUnit}>kcal</Text></Text>
              </View>
              <View style={styles.miniProgressBarWrapper}>
                <View style={[styles.miniProgressBarFill, { width: `${Math.min(calProgress * 100, 100)}%`, backgroundColor: '#bef264' }]} />
              </View>
            </View>
          </View>

          {/* Nutrients MTD Card */}
          <View style={styles.halfStatCard}>
            <View style={styles.cardHeaderSmall}>
              <View>
                <Text style={styles.cardTitleSmall}>Nutrients</Text>
                <Text style={styles.cardSubtitleSmall}>MTD Progress</Text>
              </View>
              <View style={[styles.iconBgSmall, { backgroundColor: '#f0fdf4' }]}>
                <Circle size={14} color="#bef264" />
              </View>
            </View>

            <View style={styles.pieContainer}>
              <PieChart
                data={[
                  { value: mtdSummary.protein || 30, color: '#bef264', text: 'Protein' },
                  { value: mtdSummary.carbs || 40, color: '#a3e635', text: 'Carbs' },
                  { value: mtdSummary.fat || 30, color: '#65a30d', text: 'Fats' },
                  { value: 10, color: '#dcfce7', text: 'Vitamins' }, // Dummy vitamins
                ]}
                radius={35}
                innerRadius={0}
              />
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#bef264' }]} /><Text style={styles.legendText}>Protein</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#a3e635' }]} /><Text style={styles.legendText}>Carbs</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#65a30d' }]} /><Text style={styles.legendText}>Fats</Text></View>
                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#dcfce7' }]} /><Text style={styles.legendText}>Vitamins</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Water Intake Card (Full Width) */}
        <View style={[styles.fullStatCard, { backgroundColor: '#f0f7ff', marginTop: 10, marginBottom: 15, paddingVertical: 16 }]}>
          <View style={styles.statHeader}>
            <View>
              <Text style={[styles.statTitle, { color: '#2563eb' }]}>Drink Water</Text>
              <Text style={styles.statSubtitle}>Today's goal: 3.5 L</Text>
            </View>
            <View style={[styles.iconBg, { backgroundColor: '#dbeafe' }]}>
              <Droplet size={18} color="#2563eb" fill="#2563eb" />
            </View>
          </View>

          <View style={[styles.waterMainRow, { marginTop: 12 }]}>
            <View>
              <Text style={[styles.waterMainValue, { fontSize: 28 }]}>{waterIntake} <Text style={styles.waterMainUnit}>glasses</Text></Text>
              <Text style={[styles.waterSubText, { fontSize: 14 }]}>{(waterIntake * 0.25).toFixed(1)} L</Text>
            </View>
            <View style={styles.waterControlsRedesign}>
              <TouchableOpacity
                style={[styles.waterBtnWhite, { width: 48, height: 48 }]}
                onPress={() => updateWaterIntake(Math.max(0, waterIntake - 1))}
              >
                <Minus size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.waterBtnBlue, { width: 48, height: 48 }]}
                onPress={() => updateWaterIntake(waterIntake + 1)}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Meals Section */}
        {
          ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) => {
            // Filter logs for this meal
            const mealLower = meal.toLowerCase();
            const consumed = todayLog
              .filter(item => (item.meal_type || 'snack').toLowerCase() === mealLower)
              .reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

            const target = Math.round((nutritionTargets.calories || 2000) * (nutritionTargets.mealSplit?.[mealLower] || 0.25));
            const isOver = consumed > target;
            const percentage = Math.min(consumed / target, 1);
            const percentageText = Math.round((consumed / target) * 100) || 0;

            return (
              <View key={meal} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.mealTitle}>{meal}</Text>
                    {isOver && (
                      <View style={styles.overGoalBadge}>
                        <Text style={styles.overGoalBadgeText}>OVER GOAL</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push({ pathname: '/(tabs)/add', params: { mealType: mealLower } })}
                  >
                    <Plus size={20} color="#1f2937" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealCalsContainer}>
                  <View style={styles.mealIcon}>
                    <Flame size={14} color="#ea580c" />
                  </View>
                  <Text style={[styles.mealCalsTextBold, isOver && { color: '#ef4444' }]}>
                    {Math.round(consumed)} <Text style={styles.mealCalsText}>kcal</Text>
                  </Text>
                  <View style={styles.targetPill}>
                    <Text style={styles.targetPillText}>Target: {target} kcal</Text>
                  </View>
                </View>

                <View style={styles.completionRow}>
                  <Text style={styles.completionLabel}>COMPLETION</Text>
                  <Text style={[styles.completionValue, isOver && { color: '#ef4444' }]}>{percentageText}%</Text>
                </View>

                <View style={styles.mealProgressBarBg}>
                  <View style={[
                    styles.mealProgressBarFill,
                    { width: `${percentage * 100}%` },
                    isOver && { backgroundColor: '#ef4444' }
                  ]} />
                </View>

                {isOver && (
                  <View style={styles.overGoalWarning}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <Text style={styles.overGoalWarningText}>Control your kcal, you are taking more than expected</Text>
                  </View>
                )}
              </View>
            );
          })
        }

      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // Light gray background
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#bef264',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 1,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  streakCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
  },
  rankCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  fireIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#374151',
  },
  streakSub: {
    fontSize: 12,
    color: '#4b5563',
    opacity: 0.8,
  },
  statCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
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
  calIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  calLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  calValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  calUnit: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 'normal',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  waterUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#9ca3af',
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  waterControls: {
    flexDirection: 'row',
    gap: 8,
  },
  waterControlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterGoal: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 10,
  },
  waterGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  waterBar: {
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  statsContainer: {
    gap: 15,
    marginBottom: 20,
  },
  fullStatCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
  progressSection: {
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  unitText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 'normal',
  },
  progressBarWrapper: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
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
    color: '#1e3a8a',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  waterBtnBlue: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  halfStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    color: '#1f2937',
  },
  cardSubtitleSmall: {
    fontSize: 11,
    color: '#9ca3af',
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
    color: '#9ca3af',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  miniUnit: {
    fontSize: 9,
    color: '#9ca3af',
  },
  miniProgressBarWrapper: {
    height: 6,
    backgroundColor: '#f3f4f6',
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
    color: '#4b5563',
    fontWeight: '500',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: 5,
    marginBottom: 15,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#bef264',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  mealCalsTextBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  mealCalsText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  targetPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetPillText: {
    fontSize: 10,
    color: '#6b7280',
  },
  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  completionValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#84cc16',
  },
  mealProgressBarBg: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mealProgressBarFill: {
    height: '100%',
    backgroundColor: '#bef264',
    borderRadius: 3,
  },
  overGoalBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  overGoalBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  overGoalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  overGoalWarningText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
