
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
        videoLink: ex.videoLink,
        exerciseType: ex.exerciseType || 'Set/Rep',
        recommendedSets: ex.recommendedSets || 3,
        recommendedReps: typeof ex.recommendedReps === 'string' ? ex.recommendedReps : (ex.recommendedReps ? String(ex.recommendedReps) : '10-12'),
        recommendedDuration: ex.recommendedDuration,
        type: 'Gym'
    }));

    const normalizedHome = homeExercises.map(ex => {
        let area = 'Full Body';
        const works = ex['Body Area'] || '';
        if (works.includes('Upper')) area = 'Upper';
        else if (works.includes('Lower')) area = 'Lower';
        else if (works.includes('Core')) area = 'Core';
        else if (works.includes('Cardio')) area = 'Cardio';

        return {
            name: ex.Exercise,
            bodyArea: area,
            equipment: ex.Equipment,
            level: ex.Level,
            met: ex.MET,
            purpose: ex.Purpose,
            videoLink: ex.videoLink,
            exerciseType: ex.exerciseType || 'Duration',
            recommendedSets: ex.recommendedSets,
            recommendedReps: typeof ex.recommendedReps === 'string' ? ex.recommendedReps : (ex.recommendedReps ? String(ex.recommendedReps) : null),
            recommendedDuration: ex.recommendedDuration || 30,
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
    const minExercises = 8;
    const maxExercises = 15;

    // Per-exercise target calculation
    // E.g., if target stringency is 400 kcal and we select 8-12 exercises, 
    // each might target ~30-50 kcals.
    const averageExercises = 10;
    let targetBurnPerExercise = targetBurn / averageExercises;

    // Copy to avoid modifying original
    let pool = [...availableExercises];

    // Randomize pool
    pool.sort(() => Math.random() - 0.5);

    const processExercise = (ex) => {
        // We need 'targetBurnPerExercise' kcal from this exercise
        let durationMinutesRequired = (targetBurnPerExercise * 60) / (ex.met * userWeight);

        // Add some safety bounds (min 2 mins, max 20 mins per single exercise variation)
        if (durationMinutesRequired < 2) durationMinutesRequired = 2;
        if (durationMinutesRequired > 20) durationMinutesRequired = 20;

        let duration_minutes = 0;
        let sets = 3;
        let repsString = "10";
        let restSecs = 60; // default 60 sec rest
        let repDurationSecs = 3; // default 3 sec per rep (TUT)

        if (ex.exerciseType === 'Set/Rep' || ex.recommendedSets) {
            // Extract baseline reps bounds
            const repMatch = (ex.recommendedReps || "10").match(/(\d+)(?:-(\d+))?/);
            let minR = 8, maxR = 12;
            if (repMatch) {
                minR = parseInt(repMatch[1]);
                maxR = repMatch[2] ? parseInt(repMatch[2]) : minR;
            }
            const avgReps = Math.round((minR + maxR) / 2);
            repsString = `${minR}-${maxR}`;

            // Required time in seconds
            const reqSec = durationMinutesRequired * 60;

            // reqSec = (Sets * Reps * 3) + ((Sets - 1) * 60)
            // reqSec + 60 = Sets * (Reps * 3 + 60)
            // Sets = (reqSec + 60) / (Reps * 3 + 60)

            const timePerSetBlock = (avgReps * repDurationSecs) + restSecs;
            let calculatedSets = Math.round((reqSec + restSecs) / timePerSetBlock);

            // Bounds for sets (keep them realistic, e.g. 2 to 5)
            if (calculatedSets < 2) calculatedSets = 2;
            if (calculatedSets > 5) calculatedSets = 5;

            sets = calculatedSets;

            // Recalculate true duration in mins for these bounded sets
            const totalSecs = (sets * avgReps * repDurationSecs) + ((sets - 1) * restSecs);
            duration_minutes = totalSecs / 60;
        } else {
            // Duration-based
            // Prioritize recommendedDuration (mapped from assets, usually in seconds)
            let baseDuration;
            if (ex.recommendedDuration) {
                baseDuration = ex.recommendedDuration / 60; // Seconds to Minutes
            } else {
                baseDuration = durationMinutesRequired;
            }

            // Safety cap for single exercise duration (e.g. no 7min planks)
            if (baseDuration > 5) baseDuration = 5;
            if (baseDuration < 0.5) baseDuration = 0.5;

            duration_minutes = Math.round(baseDuration * 10) / 10;
        }

        const predicted_calories_burn = calculateCalories(ex.met, userWeight, duration_minutes);

        return {
            name: ex.name,
            instance_id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            exerciseType: ex.exerciseType,
            bodyArea: ex.bodyArea,
            level: ex.level,
            equipment: ex.equipment,
            videoLink: ex.videoLink,
            met: ex.met,
            duration_minutes: duration_minutes,
            predicted_sets: sets,
            predicted_reps: repsString,
            predicted_calories_burn: predicted_calories_burn,
            actual_calories_burned: 0,
            is_completed: 'no',
            completed_sets: 0
        };
    };

    for (const ex of pool) {
        if (currentBurn >= targetBurn && selected.length >= minExercises) break;
        if (selected.length >= maxExercises) break;

        const processed = processExercise(ex);
        selected.push(processed);
        currentBurn += processed.predicted_calories_burn;
    }

    // Fill to minimum count or target burn
    let unusedPool = pool.filter(ex => !selected.some(s => s.name === ex.name));

    while ((selected.length < minExercises || currentBurn < targetBurn) && selected.length < maxExercises) {
        if (unusedPool.length === 0) break;

        const randomIndex = Math.floor(Math.random() * unusedPool.length);
        const ex = unusedPool[randomIndex];
        unusedPool.splice(randomIndex, 1); // remove the used exercise

        const processed = processExercise(ex);
        processed.instance_id = `ex_fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        selected.push(processed);
        currentBurn += processed.predicted_calories_burn;
    }

    const totalDuration = selected.reduce((sum, item) => sum + item.duration_minutes, 0);

    return { exercises: selected, totalBurn: Math.round(currentBurn), totalDuration: Math.round(totalDuration) };
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
        // If specific body part pool is small for Home, supplement with Full Body and Cardio
        let effectiveHomePool = [...homePool];
        if (effectiveHomePool.length < 8 && focus !== 'Rest/Light') {
            const secondaryPool = filterExercises(home, 'Full Body', difficultyKey);
            const cardioPool = filterExercises(home, 'Cardio', difficultyKey);

            // Add unique exercises from secondary pools
            [...secondaryPool, ...cardioPool].forEach(ex => {
                if (effectiveHomePool.length < 15 && !effectiveHomePool.some(e => e.name === ex.name)) {
                    effectiveHomePool.push(ex);
                }
            });
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
