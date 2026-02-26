import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLogs = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return [];
        return await ctx.db
            .query("food_logs")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
            .order("desc")
            .collect();
    },
});

export const addLog = mutation({
    args: {
        user_id: v.string(),
        date: v.string(),
        food_name: v.string(),
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        meal_type: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("food_logs", {
            ...args,
            created_at: new Date().toISOString(),
        });
    },
});

export const removeLog = mutation({
    args: { id: v.id("food_logs") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
