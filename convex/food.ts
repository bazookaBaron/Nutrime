import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLogs = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return [];
        return await ctx.db
            .query("food_logs")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.userId!))
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
        // Find existing entry for this user, date and meal_type
        const existing = await ctx.db
            .query("food_logs")
            .withIndex("by_user_id_and_date", (q) =>
                q.eq("user_id", args.user_id).eq("date", args.date)
            )
            .filter((q) => q.eq(q.field("meal_type"), args.meal_type))
            .first();

        if (existing) {
            // Unify existing food_name into an array
            let newNames: string[] = [];
            if (Array.isArray(existing.food_name)) {
                newNames = [...existing.food_name, args.food_name];
            } else if (typeof existing.food_name === "string") {
                newNames = [existing.food_name, args.food_name];
            } else {
                newNames = [args.food_name];
            }

            return await ctx.db.patch(existing._id, {
                food_name: newNames,
                calories: Math.round(existing.calories + args.calories),
                protein: Number((existing.protein + args.protein).toFixed(1)),
                carbs: Number((existing.carbs + args.carbs).toFixed(1)),
                fat: Number((existing.fat + args.fat).toFixed(1)),
            });
        }

        // Otherwise insert a new record for this mealtime with an array
        return await ctx.db.insert("food_logs", {
            ...args,
            food_name: [args.food_name],
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
