import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getDailyPlans = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return [];
        return await ctx.db
            .query("workout_daily_plans")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId as string))
            .collect();
    },
});

export const upsertDailyPlans = mutation({
    args: {
        userId: v.string(),
        plans: v.array(
            v.object({
                date: v.string(),
                day_number: v.number(),
                plan_data: v.any(),
                is_completed: v.boolean(),
                calories_burned: v.optional(v.number()),
                user_id: v.optional(v.string()), // Allow if accidentally passed from client
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const plan of args.plans) {
            // Upsert by userId + date
            const existing = await ctx.db
                .query("workout_daily_plans")
                .withIndex("by_user_id_and_date", (q) =>
                    q.eq("user_id", args.userId).eq("date", plan.date)
                )
                .unique();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    plan_data: plan.plan_data,
                    is_completed: plan.is_completed,
                    calories_burned: plan.calories_burned,
                });
            } else {
                await ctx.db.insert("workout_daily_plans", {
                    user_id: args.userId,
                    date: plan.date,
                    day_number: plan.day_number,
                    plan_data: plan.plan_data,
                    is_completed: plan.is_completed,
                    calories_burned: plan.calories_burned,
                    created_at: new Date().toISOString(),
                });
            }
        }
    },
});

export const deleteDailyPlans = mutation({
    args: { ids: v.array(v.id("workout_daily_plans")) },
    handler: async (ctx, args) => {
        for (const id of args.ids) {
            await ctx.db.delete(id);
        }
    },
});

export const updatePlan = mutation({
    args: {
        id: v.id("workout_daily_plans"),
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
    },
});

export const insertHistory = mutation({
    args: {
        entries: v.array(
            v.object({
                user_id: v.string(),
                date: v.string(),
                summary_data: v.any(),
                original_plan_snapshot: v.any(),
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const entry of args.entries) {
            await ctx.db.insert("workout_history", {
                ...entry,
                created_at: new Date().toISOString(),
            });
        }
    },
});

export const insertJobQueue = mutation({
    args: {
        user_id: v.string(),
        status: v.string(),
        error_message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("workout_job_queue", {
            ...args,
            created_at: new Date().toISOString(),
        });
    },
});
