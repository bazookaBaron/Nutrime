import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export default function WeekCalendar({ selectedDate, onSelectDate }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

    useEffect(() => {
        // Initialize to the start of the week of the selected date
        const start = getStartOfWeek(new Date(selectedDate));
        setCurrentWeekStart(start);
    }, []); // Only on mount, or we could listen to selectedDate if we want it to jump

    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const changeWeek = (direction) => {
        const newStart = addDays(currentWeekStart, direction * 7);
        setCurrentWeekStart(newStart);
    };

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(currentWeekStart, i));
    }

    const monthName = currentWeekStart.toLocaleString('default', { month: 'long' });
    const year = currentWeekStart.getFullYear();

    const isSameDay = (d1, d2) => {
        return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.monthText}>{monthName} {year}</Text>
                <View style={styles.controls}>
                    <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.arrowInfo}>
                        <ChevronLeft size={20} color="#1f2937" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => changeWeek(1)} style={styles.arrowInfo}>
                        <ChevronRight size={20} color="#1f2937" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.daysContainer}>
                {weekDays.map((date, index) => {
                    const isSelected = isSameDay(date, new Date(selectedDate));
                    const isToday = isSameDay(date, new Date());
                    const dayLabel = date.toLocaleString('default', { weekday: 'narrow' }); // S, M, T...
                    const dayNumber = date.getDate();

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCard,
                                isSelected && styles.selectedCard,
                                isToday && !isSelected && styles.todayCard // Optional style for today if not selected
                            ]}
                            onPress={() => onSelectDate(date.toISOString().split('T')[0])}
                        >
                            <Text style={[styles.dayLabel, isSelected && styles.selectedText]}>{dayLabel}</Text>
                            <Text style={[styles.dayNumber, isSelected && styles.selectedText]}>
                                {dayNumber < 10 ? `0${dayNumber}` : dayNumber}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        paddingBottom: 25,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    controls: {
        flexDirection: 'row',
        gap: 10,
    },
    arrowInfo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayCard: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 60,
        borderRadius: 20,
    },
    selectedCard: {
        backgroundColor: '#bef264',
        shadowColor: '#bef264',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    todayCard: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dayLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 5,
        fontWeight: '500',
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    selectedText: {
        color: '#1f2937',
    }
});
