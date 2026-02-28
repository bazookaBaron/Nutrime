import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { Search, Plus, ScanLine, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

export default function AddFood() {
    const { foodDatabase, addFoodToLog, dailyLog } = useFood();
    const { nutritionTargets, todayStr } = useUser();
    const posthog = usePostHog();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFood, setFilteredFood] = useState<any[]>([]);
    const router = useRouter();
    const { mealType } = useLocalSearchParams();
    const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    const mealName = Array.isArray(mealType) ? mealType[0] : (mealType || '');

    const fetchSummary = () => {
        const today = todayStr;
        let logs = dailyLog.filter(item => item.date === today);

        if (mealName) {
            logs = logs.filter(item => item.meal_type?.toLowerCase() === mealName.toLowerCase());
        }

        const totals = logs.reduce((acc, item) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        setSummary(totals);
    };

    useEffect(() => {
        fetchSummary();
    }, [dailyLog, todayStr, mealName]);

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.length > 0) {
            const query = text.toLowerCase();
            const results = foodDatabase
                .filter(item => item.name.toLowerCase().includes(query))
                .map(item => {
                    const itemName = item.name.toLowerCase();
                    let score = 0;
                    if (itemName === query) score = 3;
                    else if (itemName.startsWith(query)) score = 2;
                    else if (itemName.includes(' ' + query)) score = 1.5;
                    else score = 1;
                    return { ...item, score };
                })
                .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
                .slice(0, 50);

            setFilteredFood(results);
        } else {
            setFilteredFood([]);
        }
    };

    const handleAddFood = (item: any, qty: number) => {
        // Fire and forget so optimistic UI updates instantly
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

    const FoodListItem = ({ item }) => {
        const [quantity, setQuantity] = useState(1);
        const increment = () => setQuantity(q => q + 1);
        const decrement = () => setQuantity(q => Math.max(1, q - 1));

        return (
            <View style={styles.resultCard}>
                <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultDetails}>
                        {item.calories * quantity} kcal • {quantity} {item.serving_size || 'serving'}
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

                    <TouchableOpacity style={styles.addButton} onPress={() => handleAddFood(item, quantity)}>
                        <Plus size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

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
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>{mealName ? `${mealName.toUpperCase()} INTAKE` : 'LOGGED TODAY'}</Text>
                        <Text style={styles.summaryValue}>
                            {Math.round(summary.calories)} <Text style={styles.summaryTarget}>/ {targetCals} kcal</Text>
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.summaryLabel}>REMAINING</Text>
                        <Text style={[styles.remainingValue, isOverBudget && { color: '#ef4444' }]}>
                            {Math.abs(Math.round(remainingCals))} kcal {isOverBudget && 'over'}
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryProgressBarBg}>
                    <View style={[
                        styles.summaryProgressBarFill,
                        { width: `${progressPercent * 100}%` },
                        isOverBudget && { backgroundColor: '#ef4444' }
                    ]} />
                </View>

                <View style={[styles.summaryRow, { marginTop: 15 }]}>
                    <Text style={styles.macroText}>P: {Math.round(summary.protein)}/{proteinTarget}g</Text>
                    <Text style={styles.macroText}>C: {Math.round(summary.carbs)}/{carbsTarget}g</Text>
                    <Text style={styles.macroText}>F: {Math.round(summary.fat)}/{fatTarget}g</Text>

                    <Text style={[styles.percentText, isOverBudget && { color: '#ef4444' }]}>
                        {Math.round(progressPercent * 100)}% of {mealName ? `${mealName} Goal` : 'Daily Goal'}
                    </Text>
                </View>
            </View>

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
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No food found</Text>
                        </View>
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
    summaryCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 20, marginBottom: 25 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 10, color: '#888', fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
    summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    summaryTarget: { fontSize: 14, color: '#888', fontWeight: 'normal' },
    remainingValue: { fontSize: 18, fontWeight: 'bold', color: '#84cc16' },
    summaryProgressBarBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 15, marginBottom: 5, overflow: 'hidden' },
    summaryProgressBarFill: { height: '100%', backgroundColor: '#84cc16', borderRadius: 3 },
    macroText: { fontSize: 11, color: '#888', fontWeight: '500' },
    percentText: { fontSize: 11, color: '#84cc16', fontWeight: 'bold' },
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
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, color: '#888' },
    actionContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2 },
    counterBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 18, color: '#ccc', fontWeight: 'bold' },
    counterValue: { fontSize: 14, fontWeight: 'bold', color: '#FFF', width: 20, textAlign: 'center' },
});
