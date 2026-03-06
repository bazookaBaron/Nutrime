import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useConvex } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from './UserContext';
import { Alert } from 'react-native';
import foodDatabase from '../assets/food_data.json';
import { getTodayISODate } from '../utils/DateUtils';
import { useAlert } from './AlertContext';

const FoodContext = createContext();

export const useFood = () => useContext(FoodContext);

export const FoodProvider = ({ children }) => {
    const { user, isMock, todayStr } = useUser();
    const convex = useConvex();
    const { showAlert } = useAlert();
    const [dailyLog, setDailyLog] = useState([]);
    const [loading, setLoading] = useState(true);

    // Build Fuse index once — O(n) on mount, O(log n) per search after that
    const fuseIndex = useMemo(() => new Fuse(foodDatabase, {
        keys: ['name'],
        threshold: 0.3,       // 0 = perfect match, 1 = match anything
        distance: 200,        // how far into the string to look for the pattern
        minMatchCharLength: 2,
        includeScore: true,
    }), []);

    const searchFood = (query, limit = 50) => {
        if (!query || query.trim().length === 0) return [];
        return fuseIndex
            .search(query.trim(), { limit })
            .map(result => result.item);
    };

    useEffect(() => {
        if (user) {
            fetchLogs();
        } else {
            setDailyLog([]);
            setLoading(false);
        }
    }, [user]);

    const fetchLogs = async () => {
        if (!user || isMock) {
            setLoading(false);
            return;
        }
        try {
            const data = await convex.query(api.food.getLogs, { userId: user.id });
            if (data) {
                setDailyLog(data.map(item => ({ ...item, id: item._id })));
            }
        } catch (e) {
            console.error("Error fetching food logs", e);
        } finally {
            setLoading(false);
        }
    };

    const addFoodToLog = async (food, mealType = 'snack', quantity = 1) => {
        if (!user) {
            showAlert("Authentication Required", "Please sign in to save data");
            return;
        }

        const today = todayStr;
        const multiplier = quantity;
        const baseName = food.name || food.food_name || food.item_name;

        const newEntry = {
            user_id: user.id,
            date: today,
            food_name: quantity > 1 ? `${baseName} (x${quantity})` : baseName,
            calories: (food.calories || food.nf_calories || 0) * multiplier,
            protein: (food.protein || food.nf_protein || 0) * multiplier,
            carbs: (food.carbs || food.nf_total_carbohydrate || 0) * multiplier,
            fat: (food.fat || food.nf_total_fat || 0) * multiplier,
            cholesterol: (food.cholesterol || 0) * multiplier,
            iron: (food.iron || 0) * multiplier,
            magnesium: (food.magnesium || 0) * multiplier,
            calcium: (food.calcium || 0) * multiplier,
            meal_type: mealType,
        };

        if (isMock) {
            setDailyLog(prev => [{ ...newEntry, id: 'mock-' + Date.now() }, ...prev]);
            return;
        }

        // Optimistic UI update
        const tempId = 'temp-' + Date.now();
        const optimisticEntry = { ...newEntry, id: tempId, _id: tempId };
        setDailyLog(prev => [optimisticEntry, ...prev]);

        // Background database synchronization
        setTimeout(async () => {
            try {
                const insertedId = await convex.mutation(api.food.addLog, newEntry);
                const realEntry = { ...newEntry, _id: insertedId, id: insertedId };
                setDailyLog(prev => prev.map(item => item.id === tempId ? realEntry : item));
            } catch (e) {
                console.error("Error adding food log in background:", e);
                setDailyLog(prev => prev.filter(item => item.id !== tempId));
                showAlert("Log Error", "Failed to save entry");
            }
        }, 0);
    };

    const removeFoodFromLog = async (id) => {
        const prevLog = [...dailyLog];
        setDailyLog(prev => prev.filter(item => item.id !== id));

        try {
            if (isMock) return;
            await convex.mutation(api.food.removeLog, { id });
        } catch (e) {
            console.error("Error deleting food log", e);
            setDailyLog(prevLog);
            showAlert("Delete Error", "Failed to delete entry");
        }
    };

    const getDailySummary = (date) => {
        const logs = dailyLog.filter(item => item.date === date);
        return logs.reduce((acc, item) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
            cholesterol: acc.cholesterol + (Number(item.cholesterol) || 0),
            iron: acc.iron + (Number(item.iron) || 0),
            magnesium: acc.magnesium + (Number(item.magnesium) || 0),
            calcium: acc.calcium + (Number(item.calcium) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, cholesterol: 0, iron: 0, magnesium: 0, calcium: 0 });
    };

    const getMTDSummary = () => {
        const baseDate = new Date(todayStr);
        const firstDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).toISOString().split('T')[0];
        const today = todayStr;

        const logs = dailyLog.filter(item => item.date >= firstDayOfMonth && item.date <= today);
        return logs.reduce((acc, item) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
            cholesterol: acc.cholesterol + (Number(item.cholesterol) || 0),
            iron: acc.iron + (Number(item.iron) || 0),
            magnesium: acc.magnesium + (Number(item.magnesium) || 0),
            calcium: acc.calcium + (Number(item.calcium) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, cholesterol: 0, iron: 0, magnesium: 0, calcium: 0 });
    };

    const getLast7DaysCalories = () => {
        const result = [];
        const baseDate = new Date(todayStr);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const summary = getDailySummary(dateStr);
            result.push({ value: summary.calories, label: d.toLocaleDateString('en-US', { day: '2-digit' }), frontColor: '#bef264' });
        }
        return result;
    };

    return (
        <FoodContext.Provider value={{ dailyLog, foodDatabase, searchFood, addFoodToLog, removeFoodFromLog, getDailySummary, getMTDSummary, getLast7DaysCalories, loading }}>
            {children}
        </FoodContext.Provider>
    );
};
