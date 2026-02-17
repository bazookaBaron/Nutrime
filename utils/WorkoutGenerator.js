
/**
 * Workout Generator Utility
 * Generates a multi-day workout schedule based on user profile and exercise data.
 */

// Calorie Calculation Rule: calories = MET * weight_kg * duration_hours
const calculateCalories = (met, weightKg, durationMinutes) => {
    return Math.round(met * weightKg * (durationMinutes / 60));
};

const calculateDailyBurnTarget = (profile) => {
    // Basic logic to determine daily calorie burn target from exercise
    // This is a simplification. Real logic might be more complex.
    // We'll aim for ~300-600 kcal/day depending on goal.

    let baseBurn = 300;

    // Adjust based on goal
    switch (profile.goal) {
        case 'lose_weight':
        case 'lose_fat':
            baseBurn = 500; // Aggressive target for weight loss
            break;
        case 'gain_muscle':
        case 'build_muscle':
            baseBurn = 300; // Focus on resistance, not massive calorie burn
            break;
        case 'gain_weight':
            baseBurn = 250; // Lower Cardio, focus on resistance
            break;
        case 'maintain':
        case 'retain':
        default:
            baseBurn = 300;
    }

    // Adjust based on weight (heavier people burn more easily, so we can scale slightly)
    if (profile.weight > 90) baseBurn += 100;
    if (profile.weight < 60) baseBurn -= 50;

    return baseBurn;
};

// Normalize exercises to a common structure
const normalizeExercises = (gymExercises, homeExercises) => {
    const normalizedGym = gymExercises.map(ex => ({
        name: ex.Exercise,
        bodyArea: ex['Body Area'],
        equipment: ex.Equipment,
        level: ex.Level,
        met: ex.MET,
        purpose: ex.Purpose,
        type: 'Gym'
    }));

    const normalizedHome = homeExercises.map(ex => {
        // Map home exercise "Works" to "Body Area"
        let area = 'Full Body';
        const works = ex['Works (Upper/Lower/Cardio/Core/Full Body)'];
        if (works.includes('Upper')) area = 'Upper';
        else if (works.includes('Lower')) area = 'Lower';
        else if (works.includes('Core')) area = 'Core';
        else if (works.includes('Cardio')) area = 'Cardio';

        return {
            name: ex['Exercise Name'],
            bodyArea: area,
            equipment: ex['Equipment Needed'],
            level: ex['Level (Beginner/Intermediate)'],
            met: ex['MET (Metabolic Equivalent)'],
            purpose: ex['Primary Use (Weight Loss, Muscle Gain, Endurance, etc.)'],
            type: 'Home'
        };
    });

    return { gym: normalizedGym, home: normalizedHome };
};

const filterExercises = (exercises, bodyArea, userLevel) => {
    return exercises.filter(ex => {
        // Match Body Area
        // If day is 'Cardio', include Cardio exercises
        // If day is 'Upper', include Upper exercises
        // If day is 'Lower', include Lower exercises
        // If day is 'Core', include Core exercises
        // If day is 'Full Body', include all (or specific full body ones)

        let areaMatch = false;
        if (bodyArea === 'Full Body') areaMatch = true;
        else if (bodyArea === 'Rest/Light') areaMatch = ex.bodyArea === 'Cardio' || ex.level === 'Beginner'; // Light cardio
        else areaMatch = ex.bodyArea === bodyArea;

        // Level matching (simplified)
        // If user is Beginner, prioritize Beginner. But can include others if needed?
        // Let's just filter strictly for now or mix. 
        // For better variety, let's allow +/- 1 level if we had numeric levels, but we have strings.
        // We'll trust the pool for now.

        return areaMatch;
    });
};

const selectExercisesForSession = (availableExercises, targetBurn, userWeight) => {
    let currentBurn = 0;
    let selected = [];
    let attempts = 0;
    const maxAttempts = 1000;

    // Typical duration per exercise (minutes)
    const exerciseDuration = 10; // Simple fixed duration per set/exercise for now

    // Copy to avoid modifying original
    let pool = [...availableExercises];

    // Randomize pool
    pool.sort(() => Math.random() - 0.5);

    for (const ex of pool) {
        if (currentBurn >= targetBurn) break;
        if (selected.length >= 15) break; // Max limit

        const burn = calculateCalories(ex.met, userWeight, exerciseDuration);

        selected.push({
            ...ex,
            duration_minutes: exerciseDuration,
            predicted_calories_burn: burn,
            instance_id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        currentBurn += burn;
    }

    // If we have too few exercises (under 3) and haven't met target, duplicate or add more duration?
    // User requested 8-15 exercises.
    const minExercises = 8;

    // Fill to minimum count or target burn
    while ((selected.length < minExercises || currentBurn < targetBurn) && selected.length < 15) {
        // Pick from pool again (allowing duplicates)
        // If pool is empty (shouldn't be), break
        if (pool.length === 0) break;

        const randomIndex = Math.floor(Math.random() * pool.length);
        const ex = pool[randomIndex];

        // Add a suffix to name if it's a duplicate? Or just keep same name?
        // For uniqueness in keys, we might need an ID.
        const burn = calculateCalories(ex.met, userWeight, exerciseDuration);
        selected.push({
            ...ex,
            duration_minutes: exerciseDuration,
            predicted_calories_burn: burn,
            // Add a unique ID for rendering lists
            instance_id: `ex_fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        currentBurn += burn;
    }

    return { exercises: selected, totalBurn: currentBurn, totalDuration: selected.length * exerciseDuration };
};

const determineDifficulty = (profile) => {
    // If explicit string level is provided and matches standard types
    if (profile.level && ['Beginner', 'Intermediate', 'Pro'].includes(profile.level)) {
        return profile.level;
    }

    // If XP is available, map to difficulty
    const xp = profile.workout_xp || 0;
    if (xp >= 5000) return 'Pro'; // Level 5
    if (xp >= 3500) return 'Intermediate'; // Level 3-4
    // Level 1-2 (0-3499) -> Beginner
    return 'Beginner';
};

/**
 * Recalculate daily calorie target based on remaining weight to lose and time.
 * @param {number} currentWeightKg 
 * @param {number} targetWeightKg 
 * @param {number} daysRemaining 
 * @returns {number} Daily calorie deficit/burn target
 */
export const recalculateTargets = (currentWeightKg, targetWeightKg, daysRemaining) => {
    if (!daysRemaining || daysRemaining <= 0) return 300; // Fallback

    const weightDiff = currentWeightKg - targetWeightKg;
    const isWeightLoss = weightDiff > 0;

    // 1 kg of fat ~= 7700 kcal
    const totalCaloriesDiff = Math.abs(weightDiff) * 7700;

    // Daily amount needed
    let dailyTarget = Math.round(totalCaloriesDiff / daysRemaining);

    // Caps and Floors for safety
    if (isWeightLoss) {
        if (dailyTarget < 200) dailyTarget = 200; // Minimum effort
        if (dailyTarget > 1000) dailyTarget = 1000; // Maximum safe burn from exercise alone
    } else {
        // Gaining weight/muscle usually focuses less on massive burn, more on stimulus
        dailyTarget = 300;
    }

    return dailyTarget;
};

/**
 * Main Generator Function
 * Generates a specific block of days (e.g. 5 days).
 * @param {Object} userProfile - User profile object
 * @param {Array} gymExercises - Raw gym exercises array
 * @param {Array} homeExercises - Raw home exercises array
 * @param {Date} startDate - Start date of this block
 * @param {number} startDayNumber - The sequential day number (e.g. Day 6)
 * @param {number} numberOfDays - How many days to generate (default 5)
 */
export const generateWorkoutSchedule = (userProfile, gymExercises, homeExercises, startDate, startDayNumber, numberOfDays = 5) => {
    const { gym, home } = normalizeExercises(gymExercises, homeExercises);

    // Use recalculated target if available in profile (passed from context logic) or standard
    const targetDailyBurn = userProfile.recalculatedDailyBurn || calculateDailyBurnTarget(userProfile);
    const difficultyKey = determineDifficulty(userProfile);

    const schedule = [];
    const rotation = ['Upper', 'Lower', 'Core', 'Cardio', 'Rest/Light'];

    for (let i = 0; i < numberOfDays; i++) {
        const currentDayNum = startDayNumber + i;
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Determine rotation focus
        // (day-1) because day is 1-based
        const rotationIndex = (currentDayNum - 1) % rotation.length;
        const focus = rotation[rotationIndex];

        // Generate Gym Session
        const gymPool = filterExercises(gym, focus, difficultyKey);
        const gymSession = selectExercisesForSession(gymPool, targetDailyBurn, userProfile.weight);

        // Generate Home Session
        const homePool = filterExercises(home, focus, difficultyKey);
        // Fallback to Full Body if specific body part pool is empty for Home
        let effectiveHomePool = homePool;
        if (homePool.length === 0 && focus !== 'Rest/Light') {
            effectiveHomePool = filterExercises(home, 'Full Body', difficultyKey);
        }

        const homeSession = selectExercisesForSession(effectiveHomePool, targetDailyBurn, userProfile.weight);

        // Construct Day Object
        const dayPlan = {
            day_number: currentDayNum,
            focus: focus,
            target_calories: targetDailyBurn,
            gym: {
                exercises: gymSession.exercises,
                total_calories: gymSession.totalBurn,
                duration_minutes: gymSession.totalDuration
            },
            home: {
                exercises: homeSession.exercises,
                total_calories: homeSession.totalBurn,
                duration_minutes: homeSession.totalDuration
            },
            completed: false,
            date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
        };

        schedule.push(dayPlan);
    }

    return schedule;
};
