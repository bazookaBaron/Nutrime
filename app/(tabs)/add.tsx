import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { Search, Plus, ScanLine } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';


const TopSummaryCard = forwardRef(({ initialSummary, mealName, targetCals, proteinTarget, carbsTarget, fatTarget }: any, ref) => {
    const [localSummary, setLocalSummary] = useState(initialSummary);

    useEffect(() => {
        setLocalSummary(initialSummary);
    }, [initialSummary]);

    useImperativeHandle(ref, () => ({
        addNutrition: (macros: any) => {
            setLocalSummary((prev: any) => ({
                calories: prev.calories + macros.calories,
                protein: prev.protein + macros.protein,
                carbs: prev.carbs + macros.carbs,
                fat: prev.fat + macros.fat,
            }));
        }
    }));

    const remainingCals = targetCals - localSummary.calories;
    const isOverBudget = remainingCals < 0;
    const progressPercent = Math.min(localSummary.calories / targetCals, 1);

    const animatedWidth = useRef(new Animated.Value(progressPercent)).current;

    useEffect(() => {
        Animated.spring(animatedWidth, {
            toValue: progressPercent,
            useNativeDriver: false,
            friction: 8,
            tension: 50,
        }).start();
    }, [progressPercent]);

    const barWidth = animatedWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{mealName ? `${mealName.toUpperCase()} INTAKE` : 'LOGGED TODAY'}</Text>
                    <View style={styles.caloriesRow}>
                        <Text style={styles.bigCalories}>{Math.round(localSummary.calories)}</Text>
                        <Text style={styles.targetCalories}> / {targetCals} kcal</Text>
                    </View>
                </View>

                <View style={[styles.remainingBadge, isOverBudget && { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                    <Text style={styles.remainingBadgeLabel}>Remaining</Text>
                    <Text style={[styles.remainingBadgeValue, isOverBudget && { color: '#ef4444' }]}>
                        {Math.abs(Math.round(remainingCals))} kcal
                    </Text>
                </View>
            </View>

            <View style={styles.premiumBarBg}>
                <Animated.View style={[
                    styles.premiumBarFill,
                    { width: barWidth },
                    isOverBudget && { backgroundColor: '#ef4444' }
                ]} />
            </View>

            <View style={styles.macrosRow}>
                <View style={styles.macroPill}>
                    <View style={[styles.macroDot, { backgroundColor: '#bef264' }]} />
                    <Text style={styles.macroTextModern}>P {Math.round(localSummary.protein)}/{proteinTarget}g</Text>
                </View>
                <View style={styles.macroPill}>
                    <View style={[styles.macroDot, { backgroundColor: '#a3e635' }]} />
                    <Text style={styles.macroTextModern}>C {Math.round(localSummary.carbs)}/{carbsTarget}g</Text>
                </View>
                <View style={styles.macroPill}>
                    <View style={[styles.macroDot, { backgroundColor: '#65a30d' }]} />
                    <Text style={styles.macroTextModern}>F {Math.round(localSummary.fat)}/{fatTarget}g</Text>
                </View>
            </View>
        </View>
    );
});

export default function AddFood() {
    const { foodDatabase, searchFood, addFoodToLog, dailyLog } = useFood();
    const { nutritionTargets, todayStr } = useUser();
    const posthog = usePostHog();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFood, setFilteredFood] = useState<any[]>([]);
    const router = useRouter();
    const { mealType } = useLocalSearchParams();
    const summaryCardRef = useRef<any>(null);

    const mealName = Array.isArray(mealType) ? mealType[0] : (mealType || '');

    // Derive summary directly from dailyLog — instant reactivity when FoodContext does optimistic update
    const summary = useMemo(() => {
        const today = todayStr;
        let logs = dailyLog.filter((item: any) => item.date === today);
        if (mealName) {
            logs = logs.filter((item: any) => item.meal_type?.toLowerCase() === mealName.toLowerCase());
        }
        return logs.reduce((acc: any, item: any) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [dailyLog, todayStr, mealName]);

    const searchTimeout = useRef<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = useCallback((text: string) => {
        if (text.length > 0) {
            setIsSearching(true);
            const results = searchFood(text, 50);
            setFilteredFood(results);
            setIsSearching(false);
        } else {
            setFilteredFood([]);
        }
    }, [searchFood]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (text.length === 0) {
            setFilteredFood([]);
            setIsSearching(false);
            return;
        }

        // Show spinner immediately so the user sees feedback right away
        setIsSearching(true);
        searchTimeout.current = setTimeout(() => {
            performSearch(text);
        }, 300);
    };

    useEffect(() => {
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, []);

    const handleAddFood = (item: any, qty: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (summaryCardRef.current) {
            summaryCardRef.current.addNutrition({
                calories: (item.calories || item.nf_calories || 0) * qty,
                protein: (item.protein || item.nf_protein || 0) * qty,
                carbs: (item.carbs || item.nf_total_carbohydrate || 0) * qty,
                fat: (item.fat || item.nf_total_fat || 0) * qty,
            });
        }

        // Fire-and-forget to context — FoodContext does optimistic setDailyLog which recomputes summary instantly
        addFoodToLog(item, mealName || 'snack', qty);
        posthog.capture('food_logged', {
            food_name: item.name,
            meal_type: mealName || 'snack',
            quantity: qty,
            calories: (item.calories || 0) * qty,
            protein: (item.protein || 0) * qty,
            carbs: (item.carbs || 0) * qty,
            fat: (item.fat || 0) * qty,
        });
    };

    const FoodListItem = React.memo(({ item }: { item: any }) => {
        const [quantity, setQuantity] = useState(1);
        const [added, setAdded] = useState(false);
        const increment = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setQuantity(q => q + 1);
        };
        const decrement = () => {
            if (quantity > 1) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setQuantity(q => Math.max(1, q - 1));
        };

        const handlePress = () => {
            handleAddFood(item, quantity);
            setAdded(true);
            setTimeout(() => setAdded(false), 1200);
        };

        return (
            <View style={styles.resultCard}>
                <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultDetails}>
                        {Math.round((item.calories || 0) * quantity)} kcal • {quantity} {item.unit || item.serving_size || 'serving'}
                    </Text>
                </View>

                <View style={styles.actionContainer}>
                    <View style={styles.counterContainer}>
                        <TouchableOpacity onPress={decrement} style={styles.counterBtn}>
                            <Text style={styles.counterBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{quantity}</Text>
                        <TouchableOpacity onPress={increment} style={styles.counterBtn}>
                            <Text style={styles.counterBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.addButton, added && styles.addButtonDone]}
                        onPress={handlePress}
                        activeOpacity={0.7}
                    >
                        {added
                            ? <Text style={{ fontSize: 18 }}>✓</Text>
                            : <Plus size={20} color="#000" />
                        }
                    </TouchableOpacity>
                </View>
            </View>
        );
    });


    const dailyTarget = nutritionTargets.calories || 2000;
    const mealSplit = nutritionTargets.mealSplit || { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

    let targetCals = dailyTarget;
    let proteinTarget = nutritionTargets.protein || 150;
    let carbsTarget = nutritionTargets.carbs || 200;
    let fatTarget = nutritionTargets.fat || 65;

    if (mealName) {
        const factor = mealSplit[mealName.toLowerCase()] || 0.25;
        targetCals = Math.round(dailyTarget * factor);
        proteinTarget = Math.round(proteinTarget * factor);
        carbsTarget = Math.round(carbsTarget * factor);
        fatTarget = Math.round(fatTarget * factor);
    }

    const remainingCals = targetCals - summary.calories;
    const isOverBudget = remainingCals < 0;
    const progressPercent = Math.min(summary.calories / targetCals, 1);

    return (
        <View style={styles.container}>
            <View style={styles.searchHeader}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={mealName ? `Search ${mealName}...` : "Search food..."}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor="#9ca3af"
                        autoFocus
                    />
                    {isSearching && searchQuery.length > 0 && (
                        <ActivityIndicator size="small" color="#84cc16" />
                    )}
                </View>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <TopSummaryCard
                ref={summaryCardRef}
                initialSummary={summary}
                mealName={mealName}
                targetCals={targetCals}
                proteinTarget={proteinTarget}
                carbsTarget={carbsTarget}
                fatTarget={fatTarget}
            />

            <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>SEARCH RESULTS</Text>
                <TouchableOpacity style={styles.scanButton}>
                    <ScanLine size={16} color="#84cc16" style={{ marginRight: 5 }} />
                    <Text style={styles.scanText}>SCAN</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredFood}
                renderItem={({ item }) => <FoodListItem item={item} />}
                keyExtractor={item => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    searchQuery.length > 0 ? (
                        isSearching ? (
                            <View style={styles.emptyContainer}>
                                <ActivityIndicator size="large" color="#84cc16" />
                                <Text style={[styles.emptyText, { marginTop: 14, color: '#666' }]}>Searching...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No food found</Text>
                            </View>
                        )
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', paddingTop: 50, paddingHorizontal: 20 },
    searchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 15, height: 50 },
    searchInput: { flex: 1, fontSize: 16, color: '#FFF' },
    cancelText: { fontSize: 16, color: '#FFF', fontWeight: '500' },
    premiumCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 24, padding: 20, marginBottom: 25 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardTitle: { fontSize: 12, color: '#888', fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    caloriesRow: { flexDirection: 'row', alignItems: 'baseline' },
    bigCalories: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    targetCalories: { fontSize: 14, color: '#888', fontWeight: '600', marginLeft: 4 },
    remainingBadge: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    remainingBadgeLabel: { fontSize: 10, color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    remainingBadgeValue: { fontSize: 18, fontWeight: '800', color: '#bef264' },
    premiumBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
    premiumBarFill: { height: '100%', backgroundColor: '#bef264', borderRadius: 4 },
    macrosRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    macroPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252525', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    macroDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    macroTextModern: { fontSize: 12, color: '#CCC', fontWeight: '600' },
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    resultsTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 1 },
    scanButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
    scanText: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
    listContent: { paddingBottom: 40 },
    resultCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    resultInfo: { flex: 1 },
    resultName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
    resultDetails: { fontSize: 13, color: '#888' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#bef264', justifyContent: 'center', alignItems: 'center' },
    addButtonDone: { backgroundColor: '#22c55e' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, color: '#888' },
    actionContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2 },
    counterBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 18, color: '#ccc', fontWeight: 'bold' },
    counterValue: { fontSize: 14, fontWeight: 'bold', color: '#FFF', width: 20, textAlign: 'center' },
});
