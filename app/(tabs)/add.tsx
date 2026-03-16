import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Info, Plus, Search } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFood } from '../../context/FoodContext';
import { useUser } from '../../context/UserContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats unit label by multiplying numeric prefix by quantity.
 * "3 oz" × 2 → "6 oz" | "1 tbsp" × 2 → "2 tbsp" | "serving" × 2 → "2 serving"
 */
const formatUnit = (unit: string | undefined, qty: number): string => {
    const raw = unit || 'serving';
    const match = raw.match(/^(\d+)\s+(.+)/);
    if (match) return `${qty * parseInt(match[1])} ${match[2]}`;
    return `${qty} ${raw}`;
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface Summary { calories: number; protein: number; carbs: number; fat: number; }

interface SummaryCardProps {
    summary: Summary;
    mealName: string;
    targetCals: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
}

const SummaryCard = React.memo(({ summary, mealName, targetCals, proteinTarget, carbsTarget, fatTarget }: SummaryCardProps) => {
    const remaining = targetCals - summary.calories;
    const isOver = remaining < 0;
    const progress = Math.min(summary.calories / Math.max(targetCals, 1), 1);

    // Animated bar — driven by progress prop change
    const animWidth = useRef(new Animated.Value(progress)).current;
    useEffect(() => {
        Animated.spring(animWidth, { toValue: progress, useNativeDriver: false, friction: 7, tension: 60 }).start();
    }, [progress]);
    const barWidth = animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <View>
                    <Text style={styles.summaryLabel}>
                        {mealName ? `${mealName.toUpperCase()} INTAKE` : 'LOGGED TODAY'}
                    </Text>
                    <View style={styles.calRow}>
                        <Text style={styles.calBig}>{Math.round(summary.calories)}</Text>
                        <Text style={styles.calTarget}> / {targetCals} kcal</Text>
                    </View>
                </View>
                <View style={[styles.remainBadge, isOver && styles.remainBadgeOver]}>
                    <Text style={styles.remainLabel}>{isOver ? 'Over Intake' : 'Remaining'}</Text>
                    <Text style={[styles.remainValue, isOver && styles.remainOver]}>
                        {Math.abs(Math.round(remaining))} kcal
                    </Text>
                </View>
            </View>

            <View style={styles.barBg}>
                <Animated.View style={[styles.barFill, { width: barWidth }, isOver && styles.barOver]} />
            </View>

            <View style={styles.macroRow}>
                {[
                    { label: `P ${Math.round(summary.protein)}/${proteinTarget}g`, color: '#bef264' },
                    { label: `C ${Math.round(summary.carbs)}/${carbsTarget}g`, color: '#a3e635' },
                    { label: `F ${Math.round(summary.fat)}/${fatTarget}g`, color: '#65a30d' },
                ].map(({ label, color }) => (
                    <View key={label} style={styles.macroPill}>
                        <View style={[styles.macroDot, { backgroundColor: color }]} />
                        <Text style={styles.macroText}>{label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
});

// ─── Food List Item ───────────────────────────────────────────────────────────

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    unit?: string;
    serving_size?: string;
}

interface FoodListItemProps {
    item: FoodItem;
    onAdd: (item: FoodItem, qty: number) => void;
}

const FoodListItem = React.memo(({ item, onAdd }: FoodListItemProps) => {
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    const decrement = () => {
        if (qty > 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setQty(q => q - 1);
        }
    };
    const increment = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQty(q => q + 1);
    };

    const handleAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAdd(item, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
    };

    return (
        <View style={styles.foodCard}>
            <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.foodMeta}>
                    {Math.round((item.calories || 0) * qty)} kcal • {formatUnit(item.unit || item.serving_size, qty)}
                </Text>
            </View>

            <View style={styles.foodActions}>
                <View style={styles.counter}>
                    <TouchableOpacity style={styles.counterBtn} onPress={decrement}>
                        <Text style={styles.counterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{qty}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={increment}>
                        <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.addBtn, added && styles.addBtnDone]}
                    onPress={handleAdd}
                    activeOpacity={0.75}
                >
                    {added
                        ? <Check size={18} color="#000" strokeWidth={3} />
                        : <Plus size={20} color="#000" />
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddFood() {
    const { searchFood, addFoodToLog, getDailySummary, dailyLog }: any = useFood();
    const { nutritionTargets, todayStr } = useUser();
    const { mealType } = useLocalSearchParams();
    const router = useRouter();
    const posthog = usePostHog();

    const mealName = Array.isArray(mealType) ? mealType[0] : (mealType || '');

    // ── Targets ──────────────────────────────────────────────────────────────
    const dailyTarget = nutritionTargets.calories || 2000;
    const mealSplit = nutritionTargets.mealSplit || { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };
    // Normalize meal name: 'snacks' → 'snack' to match mealSplit keys
    const mealKey = mealName ? (mealName.toLowerCase() === 'snacks' ? 'snack' : mealName.toLowerCase()) : '';
    const factor = mealKey ? (mealSplit[mealKey] ?? 0.25) : 1;
    const targetCals = mealName ? Math.round(dailyTarget * factor) : dailyTarget;
    const proteinTarget = Math.round((nutritionTargets.protein || 150) * (mealName ? factor : 1));
    const carbsTarget = Math.round((nutritionTargets.carbs || 200) * (mealName ? factor : 1));
    const fatTarget = Math.round((nutritionTargets.fat || 65) * (mealName ? factor : 1));

    // ── Summary — LOCAL state, updated synchronously on every add ─────────────
    // Initialized once from context. Never waits for context round-trip again.
    const getInitialSummary = (): Summary => {
        const logs = dailyLog.filter((item: any) => {
            if (item.date !== todayStr) return false;
            if (mealName) return item.meal_type?.toLowerCase() === mealName.toLowerCase();
            return true;
        });
        return logs.reduce((acc: Summary, item: any) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    };

    const [summary, setSummary] = useState<Summary>(getInitialSummary);


    useEffect(() => {
        const logs = dailyLog.filter((item: any) => {
            if (item.date !== todayStr) return false;
            if (mealName) return item.meal_type?.toLowerCase() === mealName.toLowerCase();
            return true;
        });
        const totals = logs.reduce((acc: Summary, item: any) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        setSummary(totals);
    }, [dailyLog, mealName, todayStr]);

    // ── Add handler — updates summary synchronously BEFORE context write ──────
    const handleAdd = useCallback((item: FoodItem, qty: number) => {
        const added: Summary = {
            calories: (item.calories || 0) * qty,
            protein: (item.protein || 0) * qty,
            carbs: (item.carbs || 0) * qty,
            fat: (item.fat || 0) * qty,
        };

        // 1. Update local summary THIS frame — no async, no context round-trip
        setSummary(prev => ({
            calories: prev.calories + added.calories,
            protein: prev.protein + added.protein,
            carbs: prev.carbs + added.carbs,
            fat: prev.fat + added.fat,
        }));

        // 2. Persist to context/DB in the background
        addFoodToLog(item, mealName || 'snack', qty);

        posthog.capture('food_logged', {
            food_name: item.name,
            meal_type: mealName || 'snack',
            quantity: qty,
            ...added,
        });
    }, [mealName, addFoodToLog, posthog]);

    // ── Search ───────────────────────────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoodItem[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<any>(null);

    const handleSearch = (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) { setResults([]); setSearching(false); return; }
        setSearching(true);
        debounceRef.current = setTimeout(() => {
            setResults(searchFood(text.trim(), 50));
            setSearching(false);
        }, 300);
    };

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Search bar */}
            <View style={styles.searchHeader}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#9ca3af" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={mealName ? `Search ${mealName}...` : 'Search food...'}
                        value={query}
                        onChangeText={handleSearch}
                        placeholderTextColor="#9ca3af"
                        autoFocus
                    />
                    {searching && <ActivityIndicator size="small" color="#84cc16" />}
                </View>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            {/* Summary card */}
            <SummaryCard
                summary={summary}
                mealName={mealName}
                targetCals={targetCals}
                proteinTarget={proteinTarget}
                carbsTarget={carbsTarget}
                fatTarget={fatTarget}
            />

            {/* USDA Attribution Banner */}
            <View style={styles.usdaBanner}>
                <View style={styles.usdaIconBg}>
                    <Info size={14} color="#bef264" />
                </View>
                <Text style={styles.usdaText}>
                    All food calorie and macro data is sourced from the official <Text style={styles.usdaHighlight}>USDA National Nutrient Database</Text>.
                </Text>
            </View>

            {/* Results header */}
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>SEARCH RESULTS</Text>
            </View>

            {/* List */}
            <FlatList
                data={results}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <FoodListItem item={item} onAdd={handleAdd} />}
                style={{ flex: 1 }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    query.length > 0
                        ? searching
                            ? <View style={styles.empty}><ActivityIndicator size="large" color="#84cc16" /><Text style={styles.emptyText}>Searching...</Text></View>
                            : <View style={styles.empty}><Text style={styles.emptyText}>No results for "{query}"</Text></View>
                        : null
                }
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', paddingTop: 50, paddingHorizontal: 20 },

    // Search
    searchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 15, height: 50 },
    searchInput: { flex: 1, fontSize: 16, color: '#FFF' },
    cancelText: { fontSize: 16, color: '#FFF', fontWeight: '500' },

    // Summary card
    summaryCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 24, padding: 20, marginBottom: 25 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    summaryLabel: { fontSize: 11, color: '#666', fontWeight: '800', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
    calRow: { flexDirection: 'row', alignItems: 'baseline' },
    calBig: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    calTarget: { fontSize: 14, color: '#555', fontWeight: '600', marginLeft: 4 },
    remainBadge: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    remainBadgeOver: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' },
    remainLabel: { fontSize: 10, color: '#666', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    remainValue: { fontSize: 18, fontWeight: '800', color: '#bef264' },
    remainOver: { color: '#ef4444' },
    barBg: { height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
    barFill: { height: '100%', backgroundColor: '#bef264', borderRadius: 4 },
    barOver: { backgroundColor: '#ef4444' },
    macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
    macroPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252525', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    macroDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    macroText: { fontSize: 12, color: '#CCC', fontWeight: '600' },

    // Results
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    resultsTitle: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 1 },
    listContent: { paddingBottom: 40 },

    // Food card
    foodCard: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    foodInfo: { flex: 1, marginRight: 12 },
    foodName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 3 },
    foodMeta: { fontSize: 13, color: '#666' },
    foodActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2 },
    counterBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 18, color: '#BBB', fontWeight: '700' },
    counterVal: { fontSize: 14, fontWeight: '700', color: '#FFF', width: 22, textAlign: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#bef264', justifyContent: 'center', alignItems: 'center' },
    addBtnDone: { backgroundColor: '#22c55e' },

    // Empty
    empty: { alignItems: 'center', marginTop: 50, gap: 14 },
    emptyText: { fontSize: 15, color: '#555' },
    usdaBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(190,242,100,0.05)',
        padding: 12,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(190,242,100,0.15)',
    },
    usdaIconBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(190,242,100,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    usdaText: {
        flex: 1,
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 18,
        fontWeight: '500',
    },
    usdaHighlight: {
        color: '#bef264',
        fontWeight: '700',
    },
});
