import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { Alert } from 'react-native';

import foodDatabase from '../assets/food_data.json';

const FoodContext = createContext();

export const useFood = () => useContext(FoodContext);

export const FoodProvider = ({ children }) => {
    const { user } = useUser();
    const [dailyLog, setDailyLog] = useState([]);

    useEffect(() => {
        if (user) {
            fetchLogs();
        } else {
            setDailyLog([]);
        }
    }, [user]);

    const fetchLogs = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('food_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }); // Latest first

            if (error) throw error;
            if (data) setDailyLog(data);
        } catch (e) {
            console.error("Error fetching food logs", e);
        }
    };

    const addFoodToLog = async (food, mealType = 'snack', quantity = 1, servingUnit = 'serving') => {
        if (!user) {
            Alert.alert("Please sign in to save your data");
            return;
        }

        const multiplier = quantity;

        const newEntry = {
            user_id: user.id,
            date: new Date().toISOString().split('T')[0],
            food_name: quantity > 1 ? `${food.name || food.food_name || food.item_name} (x${quantity})` : (food.name || food.food_name || food.item_name),
            calories: (food.calories || food.nf_calories) * multiplier,
            protein: (food.protein || food.nf_protein) * multiplier,
            carbs: (food.carbs || food.nf_total_carbohydrate) * multiplier,
            fat: (food.fat || food.nf_total_fat) * multiplier,
            meal_type: mealType,
            // created_at is default in DB
        };

        // Optimistic UI update
        const optimisticEntry = { ...newEntry, id: 'temp-' + Date.now() };
        setDailyLog(prev => [optimisticEntry, ...prev]);

        try {
            const { data, error } = await supabase
                .from('food_logs')
                .insert([newEntry])
                .select()
                .single();

            if (error) throw error;

            // Replace optimistic entry with real one
            setDailyLog(prev => prev.map(item => item.id === optimisticEntry.id ? data : item));

        } catch (e) {
            console.error("Error adding food log", e);
            Alert.alert("Failed to save food entry");
            // Revert optimistic update
            setDailyLog(prev => prev.filter(item => item.id !== optimisticEntry.id));
        }
    };

    const removeFoodFromLog = async (id) => {
        // Optimistic UI update
        const prevLog = [...dailyLog];
        setDailyLog(prev => prev.filter(item => item.id !== id));

        try {
            const { error } = await supabase
                .from('food_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (e) {
            console.error("Error deleting food log", e);
            Alert.alert("Failed to delete entry");
            setDailyLog(prevLog); // Revert
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
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

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
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const summary = getDailySummary(dateStr);
            const dayLabel = d.toLocaleDateString('en-US', { day: '2-digit' }); // e.g. "12"

            result.push({
                value: summary.calories,
                label: dayLabel,
                frontColor: '#bef264', // Lime green
            });
        }
        return result;
    };

    return (
        <FoodContext.Provider value={{ dailyLog, foodDatabase, addFoodToLog, removeFoodFromLog, getDailySummary, getMTDSummary, getLast7DaysCalories }}>
            {children}
        </FoodContext.Provider>
    );
};
