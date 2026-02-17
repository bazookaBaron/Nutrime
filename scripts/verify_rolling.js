/**
 * Verification Script for Rolling Workout Generation - DB Constraints
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Starting DB Constraint verification...");

    // 1. Fetch a real user ID
    const { data: users, error: uErr } = await supabase.from('profiles').select('id').limit(1);

    if (uErr) {
        console.error("Error fetching users:", uErr);
        return;
    }

    if (users && users.length > 0) {
        const userId = users[0].id;
        console.log(`Using user ${userId} for testing...`);

        // Clean up any test junk
        await supabase.from('workout_job_queue').delete().eq('user_id', userId).eq('status', 'pending');

        console.log("Inserting Job 1 (Pending)...");
        const { error: e1 } = await supabase.from('workout_job_queue').insert({
            user_id: userId,
            status: 'pending'
        });

        if (e1) console.error("Job 1 failed:", e1);
        else console.log("✅ Job 1 inserted.");

        console.log("Inserting Job 2 (Duplicate Pending)...");
        const { error: e2 } = await supabase.from('workout_job_queue').insert({
            user_id: userId,
            status: 'pending'
        });

        if (e2) {
            console.log("✅ Job 2 correctly failed/ignored due to unique constraint:", e2.code);
        } else {
            console.error("❌ Job 2 succeeded but SHOULD have failed.");
        }

        // Clean up
        await supabase.from('workout_job_queue').delete().eq('user_id', userId).eq('status', 'pending');

    } else {
        console.warn("No users found. Cannot test constraints.");
    }

    console.log("Verification finished.");
}

verify();
