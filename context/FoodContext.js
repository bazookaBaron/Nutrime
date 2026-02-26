import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConvex } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from './UserContext';
import { Alert } from 'react-native';
import foodDatabase from '../assets/food_data.json';
import { getTodayISODate } from '../utils/DateUtils';

const FoodContext = createContext();

export const useFood = () => useContext(FoodContext);

export const FoodProvider = ({ children }) => {
    const { user, isMock, todayStr } = useUser();
    const convex = useConvex();
    const [dailyLog, setDailyLog] = useState([]);
    const [loading, setLoading] = useState(true);

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
            Alert.alert("Please sign in to save data");
            return;
        }

        const today = todayStr;
        const multiplier = quantity;
        const baseName = food.name || food.food_name || food.item_name;

        const newEntry = {
            user_id: user.id,
            date: today,
            food_name: quantity > 1 ? `${baseName} (x${quantity})` : baseName,
            calories: (food.calories || food.nf_calories) * multiplier,
            protein: (food.protein || food.nf_protein) * multiplier,
            carbs: (food.carbs || food.nf_total_carbohydrate) * multiplier,
            fat: (food.fat || food.nf_total_fat) * multiplier,
            meal_type: mealType,
        };

        if (isMock) {
            setDailyLog(prev => [{ ...newEntry, id: 'mock-' + Date.now() }, ...prev]);
            return;
        }

        // Optimistic UI update
        const optimisticEntry = { ...newEntry, id: 'temp-' + Date.now() };
        setDailyLog(prev => [optimisticEntry, ...prev]);

        try {
            const insertedId = await convex.mutation(api.food.addLog, newEntry);
            const realEntry = { ...newEntry, _id: insertedId, id: insertedId };
            setDailyLog(prev => prev.map(item => item.id === optimisticEntry.id ? realEntry : item));
        } catch (e) {
            console.error("Error adding food log", e);
            setDailyLog(prev => prev.filter(item => item.id !== optimisticEntry.id));
            Alert.alert("Failed to save entry");
        }
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
            Alert.alert("Failed to delete entry");
        }
    };

    const getDailySummary = (date) => {
        const logs = dailyLog.filter(item => item.date === date);
        return logs.reduce((acc, item) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein: acc.protein + (Number(item.protein) || 0),
            carbs: acc.carbs + (Number(item.carbs) || 0),
            fat: acc.fat + (Number(item.fat) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
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
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
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
        <FoodContext.Provider value={{ dailyLog, foodDatabase, addFoodToLog, removeFoodFromLog, getDailySummary, getMTDSummary, getLast7DaysCalories, loading }}>
            {children}
        </FoodContext.Provider>
    );
};
