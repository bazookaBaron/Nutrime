
const { generateWorkoutSchedule } = require('../utils/WorkoutGenerator');
const fs = require('fs');
const path = require('path');

// Mocks
const mockProfile = {
    weight: 80, // kg
    goal: 'lose_weight',
    target_duration_weeks: 4,
    level: 'Beginner'
};

// Load Data
const gymData = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/gym_exercises.json'), 'utf8'));
const homeData = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/home_exercises.json'), 'utf8'));

// Run Generator
console.log("Generating schedule...");
const schedule = generateWorkoutSchedule(mockProfile, gymData, homeData);

// Basic Validation
console.log(`Generated ${schedule.length} days.`);
if (schedule.length !== 28) console.error("Error: Expected 28 days.");

const day1 = schedule[0];
console.log("Day 1 Focus:", day1.focus);
console.log("Day 1 Target Burn:", day1.target_calories);
console.log("Day 1 Gym Exercises:", day1.gym.exercises.length);
console.log("Day 1 Home Exercises:", day1.home.exercises.length);
console.log("Day 1 Gym Burn:", day1.gym.total_calories);

if (day1.gym.exercises.length < 5) console.warn("Warning: Day 1 Gym exercises count seems low.");
if (day1.home.exercises.length < 5) console.warn("Warning: Day 1 Home exercises count seems low.");

if (schedule[0].focus === schedule[1].focus) console.error("Error: Focus should rotate.");
if (schedule[0].focus === schedule[5].focus) console.log("Focus rotation seems to loop correctly (Index 0 same as Index 5? No, 5 items in rotation).");

// Test Regeneration
console.log("\nTesting Regeneration...");
const { regenerateSchedule } = require('../utils/WorkoutGenerator');

// Simulate a schedule where day 1 is done
schedule[0].completed = true;
// Simulate current date is "tomorrow" relative to start? 
// The utility uses "today" to filter. 
// If we run this, "today" is the date used in generateWorkoutSchedule default. 
// So date of day 1 is today.
// If day 1 date < today, it is kept. 
// If day 1 is completed, it is kept.

// Let's mark day 1 as completed.
const newProfile = { ...mockProfile, weight: 75, goal: 'gain_muscle' }; // Changed goal
const regenerated = regenerateSchedule(schedule, newProfile, gymData, homeData);

console.log(`Original Length: ${schedule.length}`);
console.log(`Regenerated Length: ${regenerated.length}`);

if (regenerated[0].completed !== true) console.error("Error: Past completed day lost.");
if (regenerated[1].target_calories === schedule[1].target_calories) {
    console.log("Day 2 calories unchanged? Goal changed to gain_muscle (lower burn usually). Check logic.");
} else {
    console.log(`Day 2 Calories updated: ${schedule[1].target_calories} -> ${regenerated[1].target_calories}`);
}

console.log("Test Complete.");
