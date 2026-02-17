const fs = require('fs');
const path = require('path');

// Helper to calculate calorie burn target
const recalculateTargets = (currentWeightKg, targetWeightKg, daysRemaining) => {
    if (!daysRemaining || daysRemaining <= 0) return 300;
    const weightDiff = currentWeightKg - targetWeightKg;
    const totalCaloriesDiff = Math.abs(weightDiff) * 7700;
    let dailyTarget = Math.round(totalCaloriesDiff / daysRemaining);
    if (weightDiff > 0) {
        if (dailyTarget < 200) dailyTarget = 200;
        if (dailyTarget > 1000) dailyTarget = 1000;
    } else {
        dailyTarget = 300;
    }
    return dailyTarget;
};

// Simplified generation logic for demo
const generateDemoBlock = (profile, gymExercises, homeExercises, startDate, startDayNumber) => {
    // Rotation logic
    const rotation = ['Upper', 'Lower', 'Core', 'Cardio', 'Rest/Light'];
    const results = [];

    // Target burn based on progress
    const daysRemaining = (profile.target_duration_weeks * 7) - (startDayNumber - 1);
    const targetDailyBurn = recalculateTargets(profile.weight, profile.target_weight, daysRemaining);

    console.log(`\n--- Generation Parameters ---`);
    console.log(`Current Weight: ${profile.weight}kg, Target: ${profile.target_weight}kg`);
    console.log(`Days remaining in program: ${daysRemaining}`);
    console.log(`Calculated Daily Burn Target: ${targetDailyBurn} kcal`);
    console.log(`Starting from: ${startDate.toISOString().split('T')[0]} (Sequential Day ${startDayNumber})`);
    console.log(`-----------------------------\n`);

    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const daySeq = startDayNumber + i;
        const focus = rotation[(daySeq - 1) % rotation.length];

        results.push({
            date: currentDate.toISOString().split('T')[0],
            day_number: daySeq,
            focus: focus,
            target_calories: targetDailyBurn
        });
    }
    return results;
};

// Load real data
const gymExercises = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/gym_exercises.json'), 'utf8'));
const homeExercises = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/home_exercises.json'), 'utf8'));

// Mock Profile for Day 5 Transition
const mockProfile = {
    weight: 85, // Started at 90, now 85
    target_weight: 75,
    target_duration_weeks: 12,
    workout_xp: 400
};

// Suppose we are at Day 5
const lastDayNumber = 5;
const lastDayDate = new Date(); // Today is the last day of current block

// Rolling Logic Trigger: activeDays.length < 3
const activeDays = [
    { day_number: 5, date: new Date().toISOString().split('T')[0] }
];

console.log(`Current State: User is on Day 5. Only 1 active day left in plan.`);
console.log(`Triggering 'Rolling Generation' for next 5-day block...`);

if (activeDays.length < 3) {
    const nextBlockStartDate = new Date(lastDayDate);
    nextBlockStartDate.setDate(lastDayDate.getDate() + 1);

    const newBlock = generateDemoBlock(mockProfile, gymExercises, homeExercises, nextBlockStartDate, lastDayNumber + 1);

    console.log(`✅ Generated Next Block:`);
    newBlock.forEach(day => {
        console.log(`[ID: ${day.day_number}] Date: ${day.date} | Focus: ${day.focus} | Target: ${day.target_calories} kcal`);
    });

    console.log(`\nIn the real app, these ${newBlock.length} days are inserted into the 'workout_daily_plans' table.`);
    console.log(`The 'Day Selector' in the UI will now show a continuous 5-day window from today onwards.`);
}
