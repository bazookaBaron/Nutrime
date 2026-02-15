import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';
import { Search, Plus, ScanLine, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function AddFood() {
    const { foodDatabase, addFoodToLog, getDailySummary } = useFood();
    const { nutritionTargets } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredFood, setFilteredFood] = useState<any[]>([]);
    const router = useRouter();
    const { mealType } = useLocalSearchParams();
    const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    const mealName = Array.isArray(mealType) ? mealType[0] : (mealType || '');

    const fetchSummary = () => {
        const today = new Date().toISOString().split('T')[0];
        setSummary(getDailySummary(today));
    };

    useEffect(() => {
        fetchSummary();
    }, [getDailySummary]); // Re-fetch when context updates (though getDailySummary is stable, we might need a trigger)

    // Listen to focus to refresh summary if needed, or rely on context updates if possible
    // For now, simpler: when we add food, we manually refresh summary after a short delay or rely on context refetch

    // Better: useFood should probably expose the daily summary or we just re-calc it
    // checks: getDailySummary reads from dailyLog which is in context state. 
    // So if dailyLog updates, getDailySummary result changes.
    // We need to useEffect on dailyLog from context? 
    // Let's grab dailyLog from context to trigger updates 
    const { dailyLog } = useFood();
    useEffect(() => {
        fetchSummary();
    }, [dailyLog]);


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

    const handleAddFood = async (item: any, qty: number) => {
        await addFoodToLog(item, mealName || 'snack', qty);
        // Don't navigate back, just toast or feedback
        // For now, minimal feedback, maybe vibration or small layout animation could be added later
    };

    // Sub-component for list item with quantity state
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
                        <Plus size={20} color="#1f2937" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Calculate progress for summary card
    const targetCals = nutritionTargets.calories || 2200;
    const remainingCals = targetCals - summary.calories;
    const isOverBudget = remainingCals < 0;
    const progressPercent = Math.min(summary.calories / targetCals, 1);

    // Calculate macro percentages roughly or just show values
    const proteinTarget = nutritionTargets.protein || 150;
    const carbsTarget = nutritionTargets.carbs || 200;
    const fatTarget = nutritionTargets.fat || 65;

    return (
        <View style={styles.container}>
            {/* Search Bar Row */}
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

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>LOGGED TODAY</Text>
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
                        {Math.round(progressPercent * 100)}% of Daily Goal
                    </Text>
                </View>
            </View>

            {/* Scale / Scan Header */}
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
    container: {
        flex: 1,
        backgroundColor: '#f9fafb', // Light gray background
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    cancelText: {
        fontSize: 16,
        color: '#4b5563',
        fontWeight: '500',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    summaryTarget: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: 'normal',
    },
    remainingValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#84cc16', // Green color from image
    },
    summaryProgressBarBg: {
        height: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 3,
        marginTop: 15,
        marginBottom: 5,
        overflow: 'hidden',
    },
    summaryProgressBarFill: {
        height: '100%',
        backgroundColor: '#84cc16', // Green color
        borderRadius: 3,
    },
    macroText: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '500',
    },
    percentText: {
        fontSize: 11,
        color: '#84cc16',
        fontWeight: 'bold',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    resultsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        letterSpacing: 1,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    scanText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    listContent: {
        paddingBottom: 40,
    },
    resultCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    resultDetails: {
        fontSize: 13,
        color: '#9ca3af',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#bef264',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    counterBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterBtnText: {
        fontSize: 18,
        color: '#6b7280',
        fontWeight: 'bold',
    },
    counterValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
        width: 20,
        textAlign: 'center',
    },
});
