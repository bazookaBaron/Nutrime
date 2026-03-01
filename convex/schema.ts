import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    profiles: defineTable({
        user_id: v.string(), // Clerk user ID
        full_name: v.optional(v.string()),
        username: v.optional(v.string()),
        goal: v.optional(v.string()),
        activity_level: v.optional(v.string()),
        gender: v.optional(v.string()),
        weight: v.optional(v.number()),
        height: v.optional(v.number()),
        age: v.optional(v.number()),
        target_weight: v.optional(v.number()),
        target_duration_weeks: v.optional(v.number()),
        daily_calories: v.optional(v.number()),
        meal_split: v.optional(
            v.object({
                breakfast: v.number(),
                lunch: v.number(),
                snack: v.number(),
                dinner: v.number(),
            })
        ),
        streak: v.optional(v.number()),
        last_active_date: v.optional(v.string()),
        workout_xp: v.optional(v.number()),
        workout_level: v.optional(v.number()),
        push_token: v.optional(v.string()),
        timezone: v.optional(v.string()),
        country: v.optional(v.string()),
        state: v.optional(v.string()),
        updated_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"]),

    daily_stats: defineTable({
        user_id: v.string(),
        date: v.string(), // YYYY-MM-DD
        water_glasses: v.optional(v.number()),
        calories_burned: v.optional(v.number()),
        daily_exercise_completions: v.optional(v.array(v.string())),
        created_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
    }).index("by_user_id_and_date", ["user_id", "date"]),

    workout_daily_plans: defineTable({
        user_id: v.string(),
        date: v.string(),
        day_number: v.number(),
        plan_data: v.any(), // Storing as any for now due to complex nested structure of exercises
        is_completed: v.boolean(),
        calories_burned: v.optional(v.number()),
        created_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"])
        .index("by_user_id_and_date", ["user_id", "date"]),

    workout_history: defineTable({
        user_id: v.string(),
        date: v.string(),
        summary_data: v.any(),
        original_plan_snapshot: v.any(),
        created_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"]),

    workout_job_queue: defineTable({
        user_id: v.string(),
        status: v.string(),
        error_message: v.optional(v.string()),
        created_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"]),

    food_logs: defineTable({
        user_id: v.string(),
        date: v.string(),
        food_name: v.union(v.string(), v.array(v.string())),
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        meal_type: v.string(),
        created_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"])
        .index("by_user_id_and_date", ["user_id", "date"]),

    challenges: defineTable({
        creator_id: v.optional(v.string()),
        title: v.string(),
        description: v.string(),
        type: v.string(),
        target_value: v.number(),
        xp_reward: v.number(),
        start_time: v.string(),
        end_time: v.string(),
        status: v.string(), // e.g. 'active'
        participants_count: v.optional(v.number()),
        created_at: v.optional(v.string()),
    }).index("by_status", ["status"]),

    user_challenges: defineTable({
        user_id: v.string(),
        challenge_id: v.string(), // Keeping as string to allow joining with Supabase IDs during migration
        status: v.string(), // 'joined', 'completed'
        progress: v.optional(v.number()),
        daily_logs: v.optional(v.array(v.string())),
        joined_at: v.optional(v.string()),
        completed_at: v.optional(v.string()),
    }).index("by_user_id", ["user_id"])
        .index("by_challenge_id", ["challenge_id"]),

    leaderboards: defineTable({
        user_id: v.string(),
        username: v.string(),
        total_xp: v.number(),
        state: v.string(),
        country: v.string(),
    })
        .index("by_user_id", ["user_id"])
        .index("by_total_xp", ["total_xp"]),
});

