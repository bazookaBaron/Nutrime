const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
    console.log("Checking current workout plans...");

    // 1. Get a user
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').limit(1);
    if (!profiles || profiles.length === 0) {
        console.log("No profiles found.");
        return;
    }
    const user = profiles[0];
    console.log(`Using user: ${user.full_name} (${user.id})`);

    // 2. Fetch current plans
    const { data: plans } = await supabase
        .from('workout_daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('day_number', { ascending: true });

    console.log(`Current active plans: ${plans.length}`);
    plans.forEach(p => console.log(`- Day ${p.day_number}: ${p.date}`));

    if (plans.length === 0) {
        console.log("No plans to simulate with. Please complete onboarding in the app first.");
        return;
    }

    // 3. Simulate "Day 5" state
    // We want only 1 day to be "active" (>= today) and others to be "past"
    console.log("\nSimulating 'Day 5' state (rolling trigger condition)...");

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const dayBefore = new Date();
    dayBefore.setDate(today.getDate() - 2);

    // We'll update the first 4 plans to be in the past
    const updates = plans.slice(0, 4).map((p, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (4 - i)); // -4, -3, -2, -1
        return {
            id: p.id,
            date: d.toISOString().split('T')[0]
        };
    });

    // Update the 5th plan to be "today"
    if (plans[4]) {
        updates.push({
            id: plans[4].id,
            date: today.toISOString().split('T')[0]
        });
    }

    console.log("Shifting dates to past to trigger rolling logic:");
    for (const update of updates) {
        const { error } = await supabase
            .from('workout_daily_plans')
            .update({ date: update.date })
            .eq('id', update.id);

        if (error) console.error("Update error:", error);
        else console.log(`Updated plan ${update.id} to ${update.date}`);
    }

    console.log("\nState ready. In the app, UserContext will now see < 3 active days and trigger archive + block generation.");
}

simulate();
